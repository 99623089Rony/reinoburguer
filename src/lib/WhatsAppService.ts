import { Order } from '../types';
import { supabase } from './supabase';

export class WhatsAppService {
    static formatOrder(order: Order, storeName: string = 'Reino Burguer'): string {
        const orderId = order.dailyOrderNumber || order.id.slice(-5).toUpperCase();

        // Calculate financial details (same logic as PrinterService)
        let subtotal = 0;
        order.items.forEach(item => {
            const basePrice = Number(item.price) || 0;
            const extrasTotal = item.extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0;
            subtotal += (basePrice + extrasTotal) * item.quantity;
        });

        const fees = order.total - subtotal;

        let message = `*================================*\n`;
        message += `      *NOVO PEDIDO*\n`;
        message += `      *PEDIDO #${orderId}*\n`;
        message += `*================================*\n`;
        message += `*Data:* ${new Date(order.timestamp).toLocaleDateString('pt-BR')}\n`;
        message += `*Hora:* ${new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0, 5)}\n`;
        message += `\n`;
        message += `*CLIENTE:* ${order.customerName}\n`;
        if (order.phone) message += `*TELEFONE:* ${order.phone}\n`;
        message += `*ENDEREÇO:* ${order.address}\n`;
        message += `\n`;
        message += `*--------------------------------*\n`;
        message += `*ITENS DO PEDIDO*\n`;
        message += `*--------------------------------*\n`;

        order.items.forEach(item => {
            const basePrice = Number(item.price) || 0;
            const extrasTotal = item.extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0;
            const itemTotal = (basePrice + extrasTotal) * item.quantity;

            message += `\n*${item.quantity}x ${item.name.toUpperCase()}*\n`;

            if (item.extras && item.extras.length > 0) {
                item.extras.forEach(e => {
                    message += `   + _${e.name}_\n`;
                });
            }

            if (item.observation) {
                message += `   (Obs: _${item.observation}_)\n`;
            }

            message += `   Valor: *R$ ${itemTotal.toFixed(2).replace('.', ',')}*\n`;
        });

        message += `\n*--------------------------------*\n`;
        message += `*RESUMO*\n`;
        message += `*--------------------------------*\n`;
        message += `Subtotal ......... R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;

        if (order.deliveryFee) {
            message += `Taxa Entrega ..... R$ ${order.deliveryFee.toFixed(2).replace('.', ',')}\n`;
        }
        if (order.cardFee) {
            let label = 'Taxa Maquininha';
            const method = order.paymentMethod.toLowerCase();
            if (method.includes('pix')) label = 'Taxa PIX';
            else if (method.includes('crédito')) label = 'Taxa Crédito';
            else if (method.includes('débito')) label = 'Taxa Débito';

            const padding = label.length <= 8 ? '..........' : '..';
            message += `${label} ${padding} R$ ${order.cardFee.toFixed(2).replace('.', ',')}\n`;
        }

        if (!order.deliveryFee && !order.cardFee && fees > 0.05) {
            const label = order.address.toUpperCase().includes('RETIRADA') ? 'Taxa Maquininha:' : 'Taxas/Entrega:';
            message += `${label} ..... R$ ${fees.toFixed(2).replace('.', ',')}\n`;
        } else if (!order.deliveryFee && !order.cardFee && fees < -0.05) {
            const discount = Math.abs(fees);
            message += `Desconto ......... - R$ ${discount.toFixed(2).replace('.', ',')}\n`;
        }

        message += `*--------------------------------*\n`;
        message += `*TOTAL ............ R$ ${order.total.toFixed(2).replace('.', ',')}*\n`;
        message += `*================================*\n`;
        message += `\n`;
        message += `*PAGAMENTO:* ${order.paymentMethod}\n`;
        if (order.couponUsed) {
            message += `*CUPOM:* ${order.couponUsed}\n`;
        }
        if (order.rewardTitle) {
            message += `*PRÊMIO:* ${order.rewardTitle.toUpperCase()}\n`;
        }

        message += `\n_Obrigado pela preferência!_\n`;
        message += `*${storeName}*`;

        return message;
    }

    static sendOrder(order: Order, storeName?: string) {
        const message = this.formatOrder(order, storeName);
        const encodedMessage = encodeURIComponent(message);

        // Clean phone number for URL
        const cleanPhone = order.phone.replace(/\D/g, '');
        const phoneWithCountry = cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone;

        const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    }

    static sendPaymentReminder(order: Order, storeName: string = 'Reino Burguer') {
        const orderId = order.dailyOrderNumber || order.id.slice(-5).toUpperCase();

        let message = `Olá *${order.customerName}*! 😊\n\n`;
        message += `Recebemos seu pedido *#${orderId}* no valor de *R$ ${order.total.toFixed(2).replace('.', ',')}*! 🍔\n\n`;
        message += `Para confirmarmos e enviarmos para a cozinha, precisamos que você finalize o pagamento via *PIX*. 💳\n\n`;
        message += `Assim que o pagamento for confirmado, seu pedido entrará em preparo imediatamente! ⚡\n\n`;
        message += `Qualquer dúvida, estamos à disposição!\n\n`;
        message += `Obrigado pela preferência! ❤️\n`;
        message += `*${storeName}*`;

        const encodedMessage = encodeURIComponent(message);
        const cleanPhone = order.phone.replace(/\D/g, '');
        const phoneWithCountry = cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone;

        const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    }

    static async sendAutomaticPaymentReminder(order: Order, storeName: string = 'Reino Burguer') {
        try {
            console.log('🤖 Sending automatic payment reminder via API...');
            const orderId = order.dailyOrderNumber || order.id.slice(-5).toUpperCase();

            let message = `Olá *${order.customerName}*! 😊\n\n`;
            message += `Recebemos seu pedido *#${orderId}* no valor de *R$ ${order.total.toFixed(2).replace('.', ',')}*! 🍔\n\n`;
            message += `Para confirmarmos e enviarmos para a cozinha, precisamos que você finalize o pagamento via *PIX*. 💳\n\n`;
            message += `Assim que o pagamento for confirmado, seu pedido entrará em preparo imediatamente! ⚡\n\n`;
            message += `Qualquer dúvida, estamos à disposição!\n\n`;
            message += `Obrigado pela preferência! ❤️\n`;
            message += `*${storeName}*`;

            const cleanPhone = order.phone.replace(/\D/g, '');
            const phoneWithCountry = cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone;

            // Call Supabase Edge Function to proxy the message
            const { data, error } = await supabase.functions.invoke('whatsapp-webhook', {
                body: {
                    event: 'proxy',
                    path: '/message/sendText/default',
                    method: 'POST',
                    payload: {
                        number: `${phoneWithCountry}@s.whatsapp.net`,
                        text: message,
                        delay: 1000
                    }
                }
            });

            if (error) {
                console.error('❌ Error sending automatic reminder:', error);
                // Fallback to manual link if API fails
                this.sendPaymentReminder(order, storeName);
            } else {
                console.log('✅ Automatic payment reminder sent successfully:', data);
            }
        } catch (e) {
            console.error('❌ Exception in sendAutomaticPaymentReminder:', e);
            // Fallback
            this.sendPaymentReminder(order, storeName);
        }
    }
}
