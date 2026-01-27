// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    console.log(`[WAHA-BRIDGE] Request: ${req.method} ${req.url}`);

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Safely parse body
        let body: any;
        const rawBody = await req.text();
        if (!rawBody) {
            console.log("[WAHA-BRIDGE] No body received");
            return new Response(JSON.stringify({ status: "ping_received" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            console.error("[WAHA-BRIDGE] Invalid JSON:", rawBody.substring(0, 100));
            return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders });
        }

        console.log(`[WAHA-BRIDGE] Event Type: ${body.event}`);

        // 0. Handle Ping (Testing)
        if (body.event === "ping") {
            // Get Store Config for health check
            const { data: storeConfig } = await supabase
                .from("store_config")
                .select("waha_url, waha_api_key")
                .maybeSingle();

            let wahaHealth = "unknown";
            if (storeConfig?.waha_url) {
                try {
                    const target = `${storeConfig.waha_url}/api/version`;
                    console.log(`[WAHA-BRIDGE] Diagnostic Ping to: ${target}`);
                    const healthRes = await fetch(target, {
                        method: "GET",
                        headers: {
                            ...(storeConfig.waha_api_key ? { "X-Api-Key": storeConfig.waha_api_key } : {})
                        },
                        signal: AbortSignal.timeout(25000)
                    });
                    wahaHealth = healthRes.ok ? "online" : `error_${healthRes.status}`;
                    console.log(`[WAHA-BRIDGE] Diagnostic Result: ${wahaHealth}`);
                } catch (e: any) {
                    console.error(`[WAHA-BRIDGE] Diagnostic Timeout/Error: ${e.message}`);
                    wahaHealth = `offline_${e.message}`;
                }
            }

            return new Response(JSON.stringify({
                pong: true,
                timestamp: new Date().toISOString(),
                waha_reachable: wahaHealth
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // 1. Get Store Config
        const { data: storeConfig, error: storeError } = await supabase
            .from("store_config")
            .select("waha_url, waha_session, waha_api_key")
            .maybeSingle();

        if (storeError) {
            console.error("[WAHA-BRIDGE] DB Error (store_config):", storeError);
            throw new Error(`Database error: ${storeError.message}`);
        }

        if (!storeConfig) {
            console.error("[WAHA-BRIDGE] Config not found in database.");
            throw new Error("Store configuration missing in database.");
        }

        // 2. Handle Proxy (Frontend Requests)
        if (body.event === "proxy") {
            if (!storeConfig.waha_url) throw new Error("WAHA_URL not configured in DB.");

            const wahaUrl = storeConfig.waha_url.endsWith('/') ? storeConfig.waha_url.slice(0, -1) : storeConfig.waha_url;
            const targetUrl = `${wahaUrl}${body.path}`;
            console.log(`[WAHA-BRIDGE] Proxying to: ${targetUrl}`);

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

                const wahaRes = await fetch(targetUrl, {
                    method: body.method || "GET",
                    headers: {
                        "Content-Type": "application/json",
                        ...(storeConfig.waha_api_key ? { "X-Api-Key": storeConfig.waha_api_key } : {})
                    },
                    body: (body.method && body.method !== "GET") ? JSON.stringify(body.payload || {}) : undefined,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const contentType = wahaRes.headers.get("content-type") || "";
                if (contentType.includes("image/")) {
                    const blob = await wahaRes.blob();
                    return new Response(blob, { headers: { ...corsHeaders, "Content-Type": contentType } });
                }

                const responseData = await wahaRes.text();
                return new Response(responseData, {
                    status: wahaRes.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            } catch (err: any) {
                console.error(`[WAHA-BRIDGE] Fetch Error: ${err.message}`);
                return new Response(JSON.stringify({ error: "WAHA connection failed", details: err.message }), {
                    status: 504,
                    headers: corsHeaders
                });
            }
        }

        // 3. Handle Webhook (WAHA events)
        if (body.event === "message") {
            const payload = body.payload;
            if (!payload || !payload.from || !payload.body) {
                console.log("[WAHA-BRIDGE] Invalid message payload.");
                return new Response("invalid payload", { headers: corsHeaders });
            }

            const phone = payload.from.split("@")[0];
            const text = payload.body;
            const name = payload.pushName;

            const responseText = await processBotLogic(supabase, phone, text, name);
            if (responseText) {
                await sendWahaMessage(storeConfig, payload.from, responseText);
            }

            return new Response("ok", { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ status: "ignored", event: body.event }), { headers: corsHeaders });

    } catch (error: any) {
        console.error("[WAHA-BRIDGE] CRITICAL ERROR:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});

async function processBotLogic(supabase: any, phone: string, text: string, name?: string): Promise<string> {
    try {
        const { data: botConfig } = await supabase.from("chatbot_config").select("*").maybeSingle();
        if (!botConfig?.is_active) return "";

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
                .insert([{ customer_phone: phone, customer_name: name || "Cliente", status: "active", context: {} }])
                .select()
                .single();
            conversation = newConv;
        }

        await supabase.from("chatbot_messages").insert([{
            conversation_id: conversation.id,
            sender_type: "customer",
            message_text: text
        }]);

        if (conversation.status === "with_agent") return "";

        const lowerText = text.toLowerCase();
        const handoffKeywords = botConfig.handoff_keywords || ["falar com humano", "atendente"];
        if (handoffKeywords.some((k: string) => lowerText.includes(k.toLowerCase()))) {
            await supabase.from("chatbot_conversations").update({ status: "waiting_agent" }).eq("id", conversation.id);
            const msg = "Vou te passar para um atendente humano. Só um instante! ⏳";
            await saveBotMessage(supabase, conversation.id, msg);
            return msg;
        }

        const context = conversation.context || {};
        let response = "";

        if (!context.currentStep || lowerText === "oi" || lowerText === "ola" || lowerText === "menu") {
            const welcome = botConfig.welcome_message || "Olá! Como posso ajudar?";
            const options = botConfig.menu_options || [];
            const menuText = options.map((o: any) => `${o.number}️⃣ ${o.label}`).join('\n');

            response = `${welcome}\n\n${menuText}`;
            context.currentStep = "main_menu";
        } else if (context.currentStep === "main_menu") {
            const opt = text.trim();
            const option = (botConfig.menu_options || []).find((o: any) => o.number.toString() === opt);

            if (option) {
                if (option.action === "request_agent") {
                    await supabase.from("chatbot_conversations").update({ status: "waiting_agent" }).eq("id", conversation.id);
                    response = "Chamando um atendente... 😊";
                } else if (option.action === "start_order") {
                    response = "Ótimo! Para fazer seu pedido, você pode acessar nosso cardápio online aqui: [LINK]";
                } else {
                    response = `Você escolheu: ${option.label}. Em breve terei mais informações sobre isso!`;
                }
            } else {
                response = "Desculpe, não entendi. Escolha uma das opções do menu acima!";
            }
        }

        await supabase.from("chatbot_conversations").update({ context }).eq("id", conversation.id);
        await saveBotMessage(supabase, conversation.id, response);
        return response;

    } catch (e: any) {
        console.error("[WAHA-BRIDGE] Logic Error:", e.message);
        return "";
    }
}

async function saveBotMessage(supabase: any, convId: string, text: string) {
    try {
        await supabase.from("chatbot_messages").insert([{ conversation_id: convId, sender_type: "bot", message_text: text }]);
    } catch (e: any) { console.error(e); }
}

async function sendWahaMessage(config: any, to: string, text: string) {
    try {
        const url = `${config.waha_url}/api/sendText`;
        const res = await fetch(url.replace('//api', '/api'), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(config.waha_api_key ? { "X-Api-Key": config.waha_api_key } : {})
            },
            body: JSON.stringify({ chatId: to, text: text, session: config.waha_session || "default" })
        });
        if (!res.ok) console.error("[WAHA-BRIDGE] Send Error:", await res.text());
    } catch (e: any) {
        console.error("[WAHA-BRIDGE] Connection Error:", e.message);
    }
}
