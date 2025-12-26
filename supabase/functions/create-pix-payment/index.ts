// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // CORS Pre-flight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Log environment check
        const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use service role for admin updates

        if (!accessToken) {
            console.error('CRITICAL: MERCADO_PAGO_ACCESS_TOKEN not set.');
            return new Response(JSON.stringify({ error: 'Configuração ausente: Token MP' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Parse body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Body inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { orderId, amount, description } = body;

        if (!orderId || !amount) {
            return new Response(JSON.stringify({ error: 'Missing orderId or amount' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log(`Processing PIX for Order: ${orderId}, Amount: ${amount}`);

        // Construct Webhook URL
        // In local dev, this might need ngrok. In prod, it's standard functions URL.
        // We'll try to infer or use a fixed structure if SUPABASE_URL is available.
        // Standard: https://<project_ref>.supabase.co/functions/v1/mercadopago-webhook
        let notificationUrl = undefined;
        if (supabaseUrl) {
            const projectRef = supabaseUrl.split('://')[1].split('.')[0];
            notificationUrl = `https://${projectRef}.supabase.co/functions/v1/mercadopago-webhook`;
            console.log('Setting notification_url to:', notificationUrl);
        }

        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': orderId,
            },
            body: JSON.stringify({
                transaction_amount: Number(amount),
                description: description || `Pedido Reino Burguer #${orderId.slice(-8).toUpperCase()}`,
                payment_method_id: 'pix',
                payer: {
                    email: 'pagamento@reinoburguer.com.br',
                    first_name: 'Cliente',
                    last_name: 'Reino Burguer',
                    identification: { type: 'CPF', number: '19119119100' }
                },
                date_of_expiration: new Date(Date.now() + 30 * 60000).toISOString(),
                notification_url: notificationUrl
            }),
        });

        const data = await mpResponse.json();

        if (!mpResponse.ok) {
            console.error('Mercado Pago API Error:', JSON.stringify(data, null, 2));
            return new Response(
                JSON.stringify({ error: 'Erro na API do Mercado Pago', details: data }),
                { status: mpResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Save Payment ID to Order
        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    mp_payment_id: String(data.id),
                    payment_status: 'pending'
                })
                .eq('id', orderId);

            if (updateError) {
                console.error('Failed to update order with payment ID:', updateError);
            } else {
                console.log('Order updated with payment ID:', data.id);
            }
        }

        return new Response(
            JSON.stringify({
                paymentId: data.id,
                qrCode: data.point_of_interaction.transaction_data.qr_code,
                qrCodeBase64: data.point_of_interaction.transaction_data.qr_code_base64,
                status: data.status,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Internal Server Error:', error.message);
        return new Response(
            JSON.stringify({ error: 'Erro interno', message: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
