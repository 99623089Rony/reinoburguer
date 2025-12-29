// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Initialize Supabase Client (Admin)
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

Deno.serve(async (req) => {
    const url = new URL(req.url);

    // 1. Handle Webhook from Mercado Pago (POST)
    if (req.method === 'POST') {
        try {
            const body = await req.json();
            const { action, type, data } = body;

            // Mercado Pago sends "payment" events with action "payment.created" or "payment.updated"
            console.log(`Received Webhook: ${action} | Type: ${type} | ID: ${data?.id}`);

            if (type === 'payment' || (data && data.id)) {
                const paymentId = data.id;

                // 2. Fetch latest status from Mercado Pago
                const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                    headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
                });

                if (!mpResponse.ok) {
                    console.error('Failed to fetch payment from MP');
                    return new Response('Error fetching payment', { status: 500 });
                }

                const paymentData = await mpResponse.json();
                const status = paymentData.status; // approved, pending, rejected, etc.
                const orderId = paymentData.external_reference; // We might not have set this, so let's use mp_payment_id search

                console.log(`Payment ${paymentId} status: ${status}`);

                // 3. Update Order in Supabase
                // We search by mp_payment_id

                if (status === 'approved') {
                    // Fetch current order status first to prevent regression
                    const { data: currentOrder } = await supabase
                        .from('orders')
                        .select('status')
                        .eq('mp_payment_id', String(paymentId))
                        .single();

                    if (currentOrder && currentOrder.status === 'Aguardando Pagamento') {
                        // Update order to PAID and PENDENTE (so it rings alarm)
                        const { error } = await supabase
                            .from('orders')
                            .update({
                                payment_status: 'paid',
                                status: 'Pendente' // Changed to 'Pendente' so alarm rings
                            })
                            .eq('mp_payment_id', String(paymentId));

                        if (error) {
                            console.error('Error updating order:', error);
                            return new Response('Database error', { status: 500 });
                        }
                        console.log(`Order updated to PENDING for payment ${paymentId}`);
                    } else {
                        console.log(`Skipping status update for order (Current: ${currentOrder?.status})`);
                    }
                } else {
                    // Update payment status only
                    const { error } = await supabase
                        .from('orders')
                        .update({ payment_status: status })
                        .eq('mp_payment_id', String(paymentId));

                    if (error) console.error('Error updating status:', error);
                }
            }

            return new Response('OK', { status: 200 });
        } catch (error) {
            console.error('Webhook error:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    }

    return new Response('Method not allowed', { status: 405 });
});
