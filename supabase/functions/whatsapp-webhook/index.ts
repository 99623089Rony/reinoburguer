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

    console.log(`[EVO-BRIDGE] Request: ${req.method} ${req.url}`);

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        let body: any;
        const rawBody = await req.text();
        if (!rawBody) return new Response(JSON.stringify({ status: "ping" }), { headers: corsHeaders });

        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
        }

        // 1. Get Config
        const { data: storeConfig } = await supabase
            .from("store_config")
            .select("waha_url, waha_session, waha_api_key")
            .maybeSingle();

        if (!storeConfig) throw new Error("Config not found");

        const baseUrl = storeConfig.waha_url?.endsWith('/') ? storeConfig.waha_url.slice(0, -1) : storeConfig.waha_url;
        const apiKey = storeConfig.waha_api_key;
        const instance = storeConfig.waha_session || "default";

        // 2. Handle Admin Proxy
        if (body.event === "proxy") {
            const targetUrl = `${baseUrl}${body.path}`;
            console.log(`[EVO-BRIDGE] Proxying to: ${targetUrl}`);

            try {
                const res = await fetch(targetUrl, {
                    method: body.method || "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": apiKey
                    },
                    body: (body.method && body.method !== "GET") ? JSON.stringify(body.payload || {}) : undefined,
                    signal: AbortSignal.timeout(30000)
                });

                const data = await res.text();
                return new Response(data, {
                    status: res.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            } catch (err: any) {
                return new Response(JSON.stringify({ error: err.message }), { status: 504, headers: corsHeaders });
            }
        }

        // 3. Handle Webhook (Evolution Format)
        // Evolution sends event name in property 'event'
        const evoEvent = body.event;
        if (evoEvent === "messages.upsert") {
            const message = body.data?.message;
            if (!message) return new Response("no message", { headers: corsHeaders });

            const isMe = body.data?.key?.fromMe;
            if (isMe) return new Response("from me", { headers: corsHeaders });

            const remoteJid = body.data?.key?.remoteJid;
            const phone = remoteJid?.split("@")[0];
            const text = message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption || "";
            const name = body.data?.pushName || "Cliente";

            if (!phone || !text) return new Response("ignored", { headers: corsHeaders });

            const responseText = await processBotLogic(supabase, phone, text, name);
            if (responseText) {
                await sendEvoMessage(baseUrl, apiKey, instance, remoteJid, responseText);
            }
            return new Response("ok", { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ status: "ignored", event: body.event }), { headers: corsHeaders });

    } catch (error: any) {
        console.error("[EVO-BRIDGE] Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
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
        return "";
    }
}

async function saveBotMessage(supabase: any, convId: string, text: string) {
    try {
        await supabase.from("chatbot_messages").insert([{ conversation_id: convId, sender_type: "bot", message_text: text }]);
    } catch (e: any) { }
}

async function sendEvoMessage(baseUrl: string, apiKey: string, instance: string, to: string, text: string) {
    try {
        await fetch(`${baseUrl}/message/sendText/${instance}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": apiKey },
            body: JSON.stringify({ number: to, text: text, delay: 1200, linkPreview: false })
        });
    } catch (e: any) {
        console.error("[EVO-BRIDGE] Send Error:", e.message);
    }
}
