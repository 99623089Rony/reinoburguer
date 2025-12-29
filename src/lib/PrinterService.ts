import { Order } from '../types';

export class PrinterService {
    private static port: any | null = null;
    private static writer: any | null = null;
    private static btDevice: any | null = null;
    private static btCharacteristic: any | null = null;

    static async connect(type: 'usb' | 'bluetooth' = 'usb') {
        if (type === 'usb') return this.connectUSB();
        return this.connectBluetooth();
    }

    private static async connectUSB() {
        try {
            if (!('serial' in navigator)) {
                throw new Error('Web Serial API não suportada neste navegador.');
            }

            // @ts-ignore
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 9600 });
            this.writer = this.port.writable.getWriter();

            console.log('Impressora USB conectada!');
            return true;
        } catch (error) {
            console.error('Erro ao conectar USB:', error);
            return false;
        }
    }

    private static async connectBluetooth() {
        try {
            if (!('bluetooth' in navigator)) {
                throw new Error('Web Bluetooth API não suportada neste navegador.');
            }

            // @ts-ignore
            this.btDevice = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Generic printer service
                    { services: ['49535343-fe7d-4158-cd58-b10341462568'] }, // Alternate printer service
                    { namePrefix: 'Printer' },
                    { namePrefix: 'MP' }
                ],
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4158-cd58-b10341462568']
            });

            const server = await this.btDevice.gatt.connect();
            const services = await server.getPrimaryServices();

            // Look for a writable characteristic
            for (const service of services) {
                const characteristics = await service.getCharacteristics();
                for (const char of characteristics) {
                    if (char.properties.write || char.properties.writeWithoutResponse) {
                        this.btCharacteristic = char;
                        break;
                    }
                }
                if (this.btCharacteristic) break;
            }

            if (!this.btCharacteristic) throw new Error('Nenhuma característica de escrita encontrada.');

            console.log('Impressora Bluetooth conectada!');
            return true;
        } catch (error) {
            console.error('Erro ao conectar Bluetooth:', error);
            return false;
        }
    }

    static async disconnect() {
        if (this.writer) {
            await this.writer.releaseLock();
            this.writer = null;
        }
        if (this.port) {
            await this.port.close();
            this.port = null;
        }
        if (this.btDevice && this.btDevice.gatt.connected) {
            await this.btDevice.gatt.disconnect();
        }
        this.btDevice = null;
        this.btCharacteristic = null;
    }

    static isConnected() {
        return !!(this.port || (this.btDevice && this.btDevice.gatt.connected));
    }

    static async printOrder(order: Order, paperSize: '58mm' | '80mm' = '58mm') {
        if (!this.isConnected()) {
            // Attempt to connect if not already connected. Default to USB for now, or add a parameter to printOrder.
            // For this change, we'll assume connection should be established before calling printOrder,
            // or the user will handle the connection type.
            // If we want to auto-connect here, we'd need to know the type.
            // For now, just return false if not connected.
            console.error('Impressora não conectada.');
            return false;
        }

        const receipt = this.formatOrder(order, paperSize);
        const encoder = new TextEncoder();
        const data = encoder.encode(receipt + '\n\n\n\n\n'); // Feed lines at the end

        try {
            if (this.writer) { // USB connection is active
                await this.writer.write(data);
            } else if (this.btCharacteristic) { // Bluetooth connection is active
                // Bluetooth usually has MTU limits (chunking might be needed for large receipts)
                const CHUNK_SIZE = 512;
                for (let i = 0; i < data.length; i += CHUNK_SIZE) {
                    const chunk = data.slice(i, i + CHUNK_SIZE);
                    await this.btCharacteristic.writeValue(chunk);
                }
            } else {
                console.error('Nenhum método de escrita disponível (USB ou Bluetooth).');
                return false;
            }
            return true;
        } catch (error) {
            console.error('Erro ao imprimir:', error);
            return false;
        }
    }

    private static formatOrder(order: Order, paperSize: '58mm' | '80mm'): string {
        const width = paperSize === '80mm' ? 48 : 32;
        const separator = '-'.repeat(width);
        const doubleSeparator = '='.repeat(width);

        // ESC/POS Commands (Basic)
        // Note: These might not display correctly in simple text viewers but work on printers
        const ESC = '\x1b';
        const GS = '\x1d';
        const RESET = ESC + '@';
        const BOLD_ON = ESC + 'E' + '\x01';
        const BOLD_OFF = ESC + 'E' + '\x00';
        const CENTER = ESC + 'a' + '\x01';
        const LEFT = ESC + 'a' + '\x00';

        // Calculate financial details
        let subtotal = 0;
        order.items.forEach(item => {
            const basePrice = Number(item.price) || 0;
            const extrasTotal = item.extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0;
            subtotal += (basePrice + extrasTotal) * item.quantity;
        });

        const deliveryFee = order.total - subtotal;

        let text = '';

        // Header
        text += CENTER + BOLD_ON + 'REINO BURGUER' + BOLD_OFF + '\n';
        text += LEFT + '\n'; // Reset align

        text += `Pedido: #${order.dailyOrderNumber || order.id.slice(-5).toUpperCase()}\n`;
        text += `Data:   ${new Date(order.timestamp).toLocaleDateString('pt-BR')} ${new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0, 5)}\n`;
        text += separator + '\n';

        // Customer
        text += BOLD_ON + 'CLIENTE' + BOLD_OFF + '\n';
        text += `${order.customerName}\n`;
        if (order.phone) text += `${order.phone}\n`;
        text += `End: ${order.address}\n`;
        text += separator + '\n';

        // Items
        text += BOLD_ON + this.formatRow('QTD ITEM', 'TOTAL', width) + BOLD_OFF + '\n';
        text += separator + '\n';

        order.items.forEach(item => {
            const basePrice = Number(item.price) || 0;
            const extrasTotal = item.extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0;
            const itemTotal = (basePrice + extrasTotal) * item.quantity;

            text += `${item.quantity}x ${item.name}\n`;

            // Extras
            if (item.extras && item.extras.length > 0) {
                item.extras.forEach(e => {
                    text += `   + ${e.name}\n`;
                });
            }

            // Observation
            if (item.observation) {
                text += `   (Obs: ${item.observation})\n`;
            }

            // Price line (Right aligned)
            text += this.alignRight(`R$ ${itemTotal.toFixed(2)}`, width) + '\n';
            text += '- '.repeat(Math.floor(width / 2)) + '\n'; // Light separator
        });

        // Totals
        text += '\n';
        text += this.formatRow('Subtotal:', `R$ ${subtotal.toFixed(2)}`, width) + '\n';

        if (deliveryFee > 0.05) { // Tolerance for float errors
            text += this.formatRow('Taxa Entrega:', `R$ ${deliveryFee.toFixed(2)}`, width) + '\n';
        } else if (deliveryFee < -0.05) {
            // If total is LESS than subtotal, it implies a discount
            const discount = Math.abs(deliveryFee);
            text += this.formatRow('Desconto:', `- R$ ${discount.toFixed(2)}`, width) + '\n';
        }

        text += doubleSeparator + '\n';
        text += BOLD_ON + this.formatRow('TOTAL:', `R$ ${order.total.toFixed(2)}`, width) + BOLD_OFF + '\n';
        text += doubleSeparator + '\n';

        // Payment
        text += `Pagamento: ${order.paymentMethod}\n`;
        if (order.couponUsed) {
            text += `Cupom: ${order.couponUsed}\n`;
        }

        // Footer
        text += '\n';
        text += CENTER + 'Obrigado pela preferencia!\n';
        text += 'www.reinoburguer.com.br\n';
        text += '\n\n'; // Feed

        return text;
    }

    private static centerText(text: string, width: number): string {
        if (text.length >= width) return text.substring(0, width);
        const leftPadding = Math.floor((width - text.length) / 2);
        return ' '.repeat(leftPadding) + text;
    }

    private static alignRight(text: string, width: number): string {
        if (text.length >= width) return text;
        const padding = width - text.length;
        return ' '.repeat(padding) + text;
    }

    private static formatRow(left: string, right: string, width: number): string {
        const rightLen = right.length;
        const leftLen = width - rightLen - 1; // 1 space gap minimum

        if (leftLen < 1) return left + ' ' + right; // Overflow fallback

        return left.substring(0, leftLen).padEnd(leftLen) + ' ' + right;
    }
}
