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
            return new Response(JSON.stringify({ success: false, error: 'Configuração ausente: Token MP', message: 'Token do Mercado Pago não configurado no Supabase.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Parse body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: 'Body inválido', message: 'Corpo da requisição inválido.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { orderId, amount, description } = body;

        if (!orderId || !amount) {
            return new Response(JSON.stringify({ success: false, error: 'Missing orderId or amount', message: 'Dados do pedido ou valor ausentes.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
                external_reference: orderId,
                payer: {
                    email: 'pagamento@reinoburguer.com.br',
                    // Note: Removing detailed name/id to see if it bypasses validation issues
                },
                date_of_expiration: new Date(Date.now() + 30 * 60000).toISOString(),
                notification_url: notificationUrl
            }),
        });

        const data = await mpResponse.json();

        if (!mpResponse.ok) {
            console.error('Mercado Pago API Error Status:', mpResponse.status);
            console.error('Mercado Pago API Error Details:', JSON.stringify(data, null, 2));
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Erro na API do Mercado Pago',
                    message: data.message || (data.cause && data.cause[0]?.description) || 'Erro desconhecido',
                    details: data
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } // Return 200 to bypass Supabase error masking
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

        // Validate response structure
        if (!data.point_of_interaction?.transaction_data?.qr_code || !data.point_of_interaction?.transaction_data?.qr_code_base64) {
            console.error('Mercado Pago response missing QR code data:', JSON.stringify(data, null, 2));
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Resposta incompleta do Mercado Pago',
                    message: 'QR Code não foi gerado pelo Mercado Pago.',
                    details: data
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                paymentId: String(data.id),
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
