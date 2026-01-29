import { Order } from '../types';

interface QueueItem {
    order: Order;
    paperSize: '58mm' | '80mm';
    attempts: number;
    addedAt: string;
}

interface QueueStatus {
    pending: number;
    processing: boolean;
    lastError: string | null;
}

export class PrinterService {
    private static port: any | null = null;
    private static writer: any | null = null;
    private static btDevice: any | null = null;
    private static btCharacteristic: any | null = null;

    // Queue management
    private static printQueue: QueueItem[] = [];
    private static isProcessing: boolean = false;
    private static queueListeners: ((status: QueueStatus) => void)[] = [];
    private static lastConnectionType: 'usb' | 'bluetooth' | null = null;
    private static readonly STORAGE_KEY = 'reino_burguer_print_queue';
    private static readonly MAX_RETRY_ATTEMPTS = 3;
    private static readonly RETRY_DELAY_MS = 5000;

    static async connect(type: 'usb' | 'bluetooth' = 'usb') {
        const success = type === 'usb' ? await this.connectUSB() : await this.connectBluetooth();
        if (success) {
            this.lastConnectionType = type;
            // Start processing queue if there are pending items
            if (this.printQueue.length > 0) {
                console.log('🔄 Connection established, processing pending queue...');
                this.processQueue();
            }
        }
        return success;
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

        const fees = order.total - subtotal;

        if (fees > 0.05) {
            const label = order.address.toUpperCase().includes('RETIRADA') ? 'Taxa Maquininha:' : 'Taxas/Entrega:';
            text += this.formatRow(label, `R$ ${fees.toFixed(2)}`, width) + '\n';
        } else if (fees < -0.05) {
            const discount = Math.abs(fees);
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

    // ============ QUEUE MANAGEMENT SYSTEM ============

    /**
     * Add order to print queue
     */
    static addToQueue(order: Order, paperSize: '58mm' | '80mm' = '58mm') {
        console.log('📄 Adding order to print queue:', order.id);

        // Check for duplicates - prevent adding same order twice
        const isDuplicate = this.printQueue.some(item => item.order.id === order.id);
        if (isDuplicate) {
            console.warn('⚠️ Order already in queue, skipping duplicate:', order.id);
            return;
        }

        const queueItem: QueueItem = {
            order,
            paperSize,
            attempts: 0,
            addedAt: new Date().toISOString()
        };

        this.printQueue.push(queueItem);
        this.saveQueueToStorage();
        this.notifyListeners();

        // Start processing if not already running
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    /**
     * Process print queue sequentially
     */
    private static async processQueue() {
        if (this.isProcessing || this.printQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        this.notifyListeners();

        while (this.printQueue.length > 0) {
            const item = this.printQueue[0];
            console.log(`🖨️ Processing queue item (${item.attempts + 1}/${this.MAX_RETRY_ATTEMPTS}):`, item.order.id);

            // Check if connected
            if (!this.isConnected()) {
                const orderNum = item.order.dailyOrderNumber || item.order.id.slice(-5).toUpperCase();
                console.warn(`⚠️ Printer not connected for order #${orderNum}. Attempting auto-reconnect...`);

                // Try to reconnect using last known type
                if (this.lastConnectionType) {
                    const reconnected = await this.connect(this.lastConnectionType);
                    if (!reconnected) {
                        console.error(`❌ Auto-reconnect failed for order #${orderNum}. Queue paused.`);
                        this.notifyListeners(`Impressora desconectada. Conecte para imprimir pedido #${orderNum}`);
                        break; // Stop processing, wait for manual connection
                    }
                } else {
                    console.error(`❌ No previous connection type for order #${orderNum}. Queue paused.`);
                    this.notifyListeners(`Conecte a impressora para imprimir pedido #${orderNum}`);
                    break;
                }
            }

            // Try to print
            const success = await this.printOrder(item.order, item.paperSize);

            if (success) {
                console.log('✅ Print successful, removing from queue:', item.order.id);
                this.printQueue.shift(); // Remove from queue
                this.saveQueueToStorage();
                this.notifyListeners();
            } else {
                item.attempts++;
                console.warn(`⚠️ Print failed (attempt ${item.attempts}/${this.MAX_RETRY_ATTEMPTS})`);

                if (item.attempts >= this.MAX_RETRY_ATTEMPTS) {
                    console.error('❌ Max retry attempts reached. Removing from queue:', item.order.id);
                    this.printQueue.shift(); // Remove failed item
                    this.saveQueueToStorage();
                    this.notifyListeners(`Falha ao imprimir pedido #${item.order.dailyOrderNumber || item.order.id.slice(-5)}`);
                } else {
                    // Wait before retry
                    console.log(`⏳ Waiting ${this.RETRY_DELAY_MS}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
                    this.notifyListeners();
                }
            }
        }

        this.isProcessing = false;
        this.notifyListeners();
        console.log('✅ Queue processing complete');
    }

    /**
     * Load queue from localStorage
     */
    static loadQueueFromStorage() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.printQueue = parsed.queue || [];
                console.log(`📦 Loaded ${this.printQueue.length} items from storage`);

                // Auto-start processing if there are items and we're connected
                if (this.printQueue.length > 0 && this.isConnected()) {
                    console.log('🔄 Auto-starting queue processing...');
                    this.processQueue();
                }
            }
        } catch (error) {
            console.error('❌ Error loading queue from storage:', error);
            this.printQueue = [];
        }
    }

    /**
     * Save queue to localStorage
     */
    private static saveQueueToStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                queue: this.printQueue,
                lastUpdated: new Date().toISOString()
            }));
        } catch (error) {
            console.error('❌ Error saving queue to storage:', error);
        }
    }

    /**
     * Clear entire queue
     */
    static clearQueue() {
        console.log('🗑️ Clearing print queue');
        this.printQueue = [];
        this.saveQueueToStorage();
        this.notifyListeners();
    }

    /**
     * Get current queue status
     */
    static getQueueStatus(): QueueStatus {
        return {
            pending: this.printQueue.length,
            processing: this.isProcessing,
            lastError: null
        };
    }

    /**
     * Get queue items for display
     */
    static getQueueItems(): QueueItem[] {
        return [...this.printQueue]; // Return copy to prevent external modification
    }

    /**
     * Register listener for queue changes
     */
    static onQueueChange(callback: (status: QueueStatus) => void) {
        this.queueListeners.push(callback);
        // Immediately notify with current status
        callback(this.getQueueStatus());
    }

    /**
     * Remove listener
     */
    static offQueueChange(callback: (status: QueueStatus) => void) {
        this.queueListeners = this.queueListeners.filter(cb => cb !== callback);
    }

    /**
     * Notify all listeners of queue changes
     */
    private static notifyListeners(errorMessage: string | null = null) {
        const status: QueueStatus = {
            pending: this.printQueue.length,
            processing: this.isProcessing,
            lastError: errorMessage
        };
        this.queueListeners.forEach(callback => callback(status));
    }
}
