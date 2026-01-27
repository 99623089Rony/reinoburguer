import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    console.log(`[Webhook] Request received: ${req.method} ${req.url}`);

    try {
        const url = new URL(req.url);
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Safely parse body
        let body: any;
        try {
            const text = await req.text();
            if (!text) {
                console.log("[Webhook] Empty body received");
                return new Response(JSON.stringify({ error: "Empty body" }), { status: 400, headers: corsHeaders });
            }
            body = JSON.parse(text);
            console.log("[Webhook] Parsed Body Event:", body.event);
        } catch (e) {
            console.error("[Webhook] JSON parse error:", e.message);
            return new Response(JSON.stringify({ error: "Invalid JSON", details: e.message }), { status: 400, headers: corsHeaders });
        }

        // 1. Get Store Config
        console.log("[Webhook] Fetching store_config...");
        const { data: storeConfig, error: storeError } = await supabase
            .from("store_config")
            .select("waha_url, waha_session, waha_api_key, is_active")
            .single();

        if (storeError) {
            console.error("[Webhook] DB Error fetching store_config:", storeError);
            return new Response(JSON.stringify({ error: "Database error", details: storeError }), { status: 500, headers: corsHeaders });
        }

        if (!storeConfig) {
            console.error("[Webhook] store_config row not found");
            return new Response(JSON.stringify({ error: "Store not configured" }), { status: 500, headers: corsHeaders });
        }

        // Handle Proxy request from Admin Panel
        if (body.event === "proxy") {
            console.log("[Webhook] Handling Proxy event...");
            if (!storeConfig.waha_url) {
                console.error("[Webhook] waha_url is missing in store_config");
                return new Response(JSON.stringify({ error: "WAHA URL not in database" }), { status: 400, headers: corsHeaders });
            }

            const wahaUrl = storeConfig.waha_url.endsWith('/') ? storeConfig.waha_url.slice(0, -1) : storeConfig.waha_url;
            const targetUrl = `${wahaUrl}${body.path}`;
            console.log(`[Webhook] Proxying ${body.method || "GET"} to ${targetUrl}`);

            try {
                // Set a timeout for the fetch
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

                const wahaResponse = await fetch(targetUrl, {
                    method: body.method || "GET",
                    headers: {
                        "Content-Type": "application/json",
                        ...(storeConfig.waha_api_key ? { "X-Api-Key": storeConfig.waha_api_key } : {})
                    },
                    body: (body.method && body.method !== "GET") ? JSON.stringify(body.payload) : undefined,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                console.log(`[Webhook] WAHA Response status: ${wahaResponse.status}`);
                const contentType = wahaResponse.headers.get("content-type") || "";

                if (contentType.includes("image/")) {
                    console.log("[Webhook] Proxying image binary data");
                    const blob = await wahaResponse.blob();
                    return new Response(blob, {
                        headers: {
                            ...corsHeaders,
                            "Content-Type": contentType
                        }
                    });
                }

                const responseData = await wahaResponse.text();
                return new Response(responseData, {
                    status: wahaResponse.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            } catch (e) {
                console.error(`[Webhook] Proxy EXCEPTION for ${targetUrl}:`, e.message);
                const isTimeout = e.name === 'AbortError';
                return new Response(JSON.stringify({
                    error: isTimeout ? "WAHA Timeout" : "Proxy failed",
                    details: e.message,
                    target: targetUrl
                }), { status: 504, headers: corsHeaders });
            }
        }

        // Handle WAHA message event
        if (body.event === "message") {
            const payload = body.payload;
            const customerPhone = payload.from.split("@")[0];
            const messageText = payload.body;
            const customerName = payload.pushName;

            if (!storeConfig?.is_active) {
                console.log("Store is inactive, ignoring message.");
                return new Response(JSON.stringify({ status: "ignored" }), { headers: corsHeaders });
            }

            // 2. Process message using Bot Logic
            const responseText = await processBotLogic(supabase, customerPhone, messageText, customerName);

            if (responseText) {
                // 3. Send response via WAHA
                await sendWahaMessage(storeConfig, payload.from, responseText);
            }

            return new Response(JSON.stringify({ status: "success" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ status: "event_ignored", received: body.event }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Critical Error processing webhook:", error);
        return new Response(JSON.stringify({
            error: "Internal Server Error",
            message: error.message,
            stack: error.stack
        }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

async function processBotLogic(supabase: any, phone: string, text: string, name?: string): Promise<string> {
    // 1. Check if chatbot is active
    const { data: botConfig } = await supabase
        .from("chatbot_config")
        .select("*")
        .single();

    if (!botConfig?.is_active) return "";

    // 2. Get or Create Conversation
    let { data: conversation } = await supabase
        .from("chatbot_conversations")
        .select("*")
        .eq("customer_phone", phone)
        .in("status", ["active", "waiting_agent", "with_agent"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!conversation) {
        const { data: newConv } = await supabase
            .from("chatbot_conversations")
            .insert([{ customer_phone: phone, customer_name: name, status: "active", context: {} }])
            .select()
            .single();
        conversation = newConv;
    }

    // 3. Save customer message
    await supabase.from("chatbot_messages").insert([{
        conversation_id: conversation.id,
        sender_type: "customer",
        message_text: text
    }]);

    // 4. Check for agent handoff
    if (conversation.status === "with_agent") return ""; // Agent is handling it

    const lowerText = text.toLowerCase();
    const handoffKeywords = botConfig.handoff_keywords || [];
    if (handoffKeywords.some((k: string) => lowerText.includes(k.toLowerCase()))) {
        await supabase.from("chatbot_conversations").update({ status: "waiting_agent" }).eq("id", conversation.id);
        const handoffMsg = "Entendido. Vou te transferir para um atendente humano. Aguarde um momento! ⏳";
        await saveBotMessage(supabase, conversation.id, handoffMsg);
        return handoffMsg;
    }

    // 5. State Machine Logic (Simplified version of what's in frontend)
    const context = conversation.context || {};
    let response = "";

    if (!context.currentStep) {
        response = botConfig.welcome_message + "\n\n" + formatMenu(botConfig.menu_options);
        context.currentStep = "main_menu";
    } else {
        // Handle menu options
        if (context.currentStep === "main_menu") {
            const option = parseInt(text.trim());
            if (option === 1) { // Fazer Pedido
                response = "📋 *Categorias Disponíveis:*\n\n1️⃣ Hamburguers\n2️⃣ Bebidas\n3️⃣ Acompanhamentos\n\nDigite o número da categoria!";
                context.currentStep = "browsing_menu";
            } else if (option === 8) { // Falar com atendente
                await supabase.from("chatbot_conversations").update({ status: "waiting_agent" }).eq("id", conversation.id);
                response = "Chamando um atendente agora! Em breve você será atendido. 😊";
            } else {
                response = "Desculpe, ainda estou aprendendo essa opção. Digite *1* para fazer um pedido ou *8* para falar com um humano! 🍔";
            }
        } else {
            response = "Ops! Me perdi um pouco. Digite *menu* para recomeçar!";
            if (lowerText.includes("menu")) {
                context.currentStep = "main_menu";
                response = "Aqui está o menu novamente:\n\n" + formatMenu(botConfig.menu_options);
            }
        }
    }

    // Save state and bot message
    await supabase.from("chatbot_conversations").update({ context }).eq("id", conversation.id);
    await saveBotMessage(supabase, conversation.id, response);

    return response;
}

function formatMenu(options: any[]) {
    return options.map(o => `${o.number}️⃣ ${o.label}`).join("\n");
}

async function saveBotMessage(supabase: any, convId: string, text: string) {
    await supabase.from("chatbot_messages").insert([{
        conversation_id: convId,
        sender_type: "bot",
        message_text: text
    }]);
}

async function sendWahaMessage(config: any, to: string, text: string) {
    if (!config.waha_url) {
        console.error("WAHA_URL not configured!");
        return;
    }

    const url = `${config.waha_url}/api/sendText`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(config.waha_api_key ? { "X-Api-Key": config.waha_api_key } : {})
            },
            body: JSON.stringify({
                chatId: to,
                text: text,
                session: config.waha_session || "default"
            })
        });

        if (!response.ok) {
            console.error("WAHA API error:", await response.text());
        }
    } catch (e) {
        console.error("Failed to send WAHA message:", e);
    }
}
