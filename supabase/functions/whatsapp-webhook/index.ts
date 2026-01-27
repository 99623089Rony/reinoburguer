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

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const body = await req.json();
        console.log("Webhook received:", JSON.stringify(body));

        // Handle WAHA message event
        // Standard WAHA format: { event: "message", payload: { from: "...", body: "...", pushName: "..." } }
        if (body.event === "message") {
            const payload = body.payload;
            const customerPhone = payload.from.split("@")[0];
            const messageText = payload.body;
            const customerName = payload.pushName;

            // 1. Get Store Config for WAHA credentials
            const { data: storeConfig } = await supabase
                .from("store_config")
                .select("waha_url, waha_session, waha_api_key, is_active")
                .single();

            if (!storeConfig?.is_active) {
                console.log("Store is inactive, ignoring message.");
                return new Response(JSON.stringify({ status: "ignored" }), { headers: corsHeaders });
            }

            // 2. Process message using Bot Logic (Simplified Version of ChatbotService)
            const responseText = await processBotLogic(supabase, customerPhone, messageText, customerName);

            if (responseText) {
                // 3. Send response via WAHA
                await sendWahaMessage(storeConfig, payload.from, responseText);
            }

            return new Response(JSON.stringify({ status: "success" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ status: "event_ignored" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error processing webhook:", error);
        return new Response(JSON.stringify({ error: error.message }), {
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
