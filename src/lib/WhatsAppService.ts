import { Order } from '../types';

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
            message += `Taxa Maquininha .. R$ ${order.cardFee.toFixed(2).replace('.', ',')}\n`;
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
}
