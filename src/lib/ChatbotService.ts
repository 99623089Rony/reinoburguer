import { supabase } from './supabase';
import {
    ChatbotConfig,
    ChatbotConversation,
    ChatbotMessage,
    ChatbotTemplate,
    ConversationContext,
    Product,
    CartItem
} from '../types';

export class ChatbotService {
    private static config: ChatbotConfig | null = null;
    private static templates: Map<string, ChatbotTemplate> = new Map();

    /**
     * Initialize chatbot service by loading config and templates
     */
    static async initialize() {
        await this.loadConfig();
        await this.loadTemplates();
    }

    /**
     * Load chatbot configuration from database
     */
    private static async loadConfig() {
        const { data, error } = await supabase
            .from('chatbot_config')
            .select('*')
            .single();

        if (!error && data) {
            this.config = {
                id: data.id,
                welcomeMessage: data.welcome_message,
                menuOptions: data.menu_options,
                businessHoursMessage: data.business_hours_message,
                outOfHoursMessage: data.out_of_hours_message,
                isActive: data.is_active,
                handoffKeywords: data.handoff_keywords,
                autoResponseDelayMs: data.auto_response_delay_ms,
                maxRetriesBeforeHandoff: data.max_retries_before_handoff
            };
        }
    }

    /**
     * Load message templates from database
     */
    private static async loadTemplates() {
        const { data, error } = await supabase
            .from('chatbot_templates')
            .select('*')
            .eq('is_active', true);

        if (!error && data) {
            data.forEach((t: any) => {
                this.templates.set(t.name, {
                    id: t.id,
                    name: t.name,
                    category: t.category,
                    templateText: t.template_text,
                    variables: t.variables,
                    isActive: t.is_active,
                    usageCount: t.usage_count
                });
            });
        }
    }

    /**
     * Process incoming message from customer
     */
    static async processMessage(customerPhone: string, messageText: string, customerName?: string): Promise<string> {
        if (!this.config?.isActive) {
            return 'O atendimento automático está temporariamente indisponível. Por favor, tente novamente mais tarde.';
        }

        // Get or create conversation
        let conversation = await this.getOrCreateConversation(customerPhone, customerName);

        // Save customer message
        await this.saveMessage(conversation.id, 'customer', messageText);

        // Check if customer wants to talk to agent
        if (this.shouldHandoffToAgent(messageText, conversation)) {
            return await this.handleAgentHandoff(conversation);
        }

        // If conversation is with agent, don't auto-respond
        if (conversation.status === 'with_agent') {
            return ''; // Agent will respond manually
        }

        // Process based on current context
        const response = await this.generateResponse(conversation, messageText);

        // Save bot response
        await this.saveMessage(conversation.id, 'bot', response);

        return response;
    }

    /**
     * Get existing conversation or create new one
     */
    private static async getOrCreateConversation(phone: string, name?: string): Promise<ChatbotConversation> {
        // Try to find active conversation
        const { data: existing } = await supabase
            .from('chatbot_conversations')
            .select('*')
            .eq('customer_phone', phone)
            .in('status', ['active', 'waiting_agent', 'with_agent'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existing) {
            return this.mapConversation(existing);
        }

        // Create new conversation
        const { data: newConv, error } = await supabase
            .from('chatbot_conversations')
            .insert([{
                customer_phone: phone,
                customer_name: name,
                status: 'active',
                context: {}
            }])
            .select()
            .single();

        if (error || !newConv) {
            throw new Error('Failed to create conversation');
        }

        // Increment analytics
        await supabase.rpc('increment_chatbot_analytics', {
            p_date: new Date().toISOString().split('T')[0],
            p_field: 'total_conversations'
        });

        return this.mapConversation(newConv);
    }

    /**
     * Check if message should trigger agent handoff
     */
    private static shouldHandoffToAgent(message: string, conversation: ChatbotConversation): boolean {
        const lowerMessage = message.toLowerCase();

        // Check keywords
        const hasKeyword = this.config?.handoffKeywords.some(keyword =>
            lowerMessage.includes(keyword.toLowerCase())
        );

        // Check retry count
        const maxRetries = this.config?.maxRetriesBeforeHandoff || 3;
        const tooManyRetries = conversation.retryCount >= maxRetries;

        return hasKeyword || tooManyRetries;
    }

    /**
     * Handle agent handoff
     */
    private static async handleAgentHandoff(conversation: ChatbotConversation): Promise<string> {
        // Update conversation status
        await supabase
            .from('chatbot_conversations')
            .update({ status: 'waiting_agent' })
            .eq('id', conversation.id);

        // Increment analytics
        await supabase.rpc('increment_chatbot_analytics', {
            p_date: new Date().toISOString().split('T')[0],
            p_field: 'agent_handoffs'
        });

        return this.getTemplate('agent_handoff');
    }

    /**
     * Generate response based on conversation context and message
     */
    private static async generateResponse(conversation: ChatbotConversation, message: string): Promise<string> {
        const context = conversation.context;
        const trimmedMessage = message.trim();

        // If no current step, show welcome menu
        if (!context.currentStep) {
            await this.updateContext(conversation.id, { currentStep: 'main_menu' });
            return this.getTemplate('welcome');
        }

        // Handle based on current step
        switch (context.currentStep) {
            case 'main_menu':
                return await this.handleMainMenu(conversation, trimmedMessage);

            case 'browsing_menu':
                return await this.handleBrowsingMenu(conversation, trimmedMessage);

            case 'adding_to_cart':
                return await this.handleAddToCart(conversation, trimmedMessage);

            case 'checkout_address':
                return await this.handleCheckoutAddress(conversation, trimmedMessage);

            case 'checkout_payment':
                return await this.handleCheckoutPayment(conversation, trimmedMessage);

            case 'track_order':
                return await this.handleTrackOrder(conversation, trimmedMessage);

            default:
                // Reset to main menu if unknown step
                await this.updateContext(conversation.id, { currentStep: 'main_menu' });
                return this.getTemplate('welcome');
        }
    }

    /**
     * Handle main menu selection
     */
    private static async handleMainMenu(conversation: ChatbotConversation, message: string): Promise<string> {
        const option = parseInt(message);

        if (isNaN(option) || option < 1 || option > 8) {
            await this.incrementRetry(conversation.id);
            return this.getTemplate('invalid_option');
        }

        // Reset retry count on valid input
        await this.resetRetry(conversation.id);

        const menuOption = this.config?.menuOptions.find(m => m.number === option);
        if (!menuOption) {
            return this.getTemplate('invalid_option');
        }

        switch (menuOption.action) {
            case 'start_order':
                await this.updateContext(conversation.id, { currentStep: 'browsing_menu' });
                return await this.showCategories();

            case 'view_menu':
                return await this.showFullMenu();

            case 'track_order':
                await this.updateContext(conversation.id, { currentStep: 'track_order' });
                return '📦 Digite o número do seu pedido (ex: #123):';

            case 'business_hours':
                return await this.showBusinessHours();

            case 'delivery_areas':
                return await this.showDeliveryAreas();

            case 'payment_methods':
                return this.getTemplate('payment_methods');

            case 'promotions':
                return await this.showPromotions();

            case 'request_agent':
                return await this.handleAgentHandoff(conversation);

            default:
                return this.getTemplate('invalid_option');
        }
    }

    /**
     * Show product categories
     */
    private static async showCategories(): Promise<string> {
        const { data: categories } = await supabase
            .from('categories')
            .select('*')
            .order('sort_order');

        if (!categories || categories.length === 0) {
            return 'Desculpe, não há categorias disponíveis no momento.';
        }

        let response = '📋 *Categorias Disponíveis:*\n\n';
        categories.forEach((cat, index) => {
            response += `${index + 1}️⃣ ${cat.icon || '📦'} ${cat.name}\n`;
        });
        response += '\nDigite o número da categoria desejada:';

        return response;
    }

    /**
     * Show full menu
     */
    private static async showFullMenu(): Promise<string> {
        const { data: products } = await supabase
            .from('products')
            .select('*')
            .eq('in_stock', true)
            .order('category, name');

        if (!products || products.length === 0) {
            return 'Desculpe, não há produtos disponíveis no momento.';
        }

        let response = '📋 *Cardápio Completo:*\n\n';
        let currentCategory = '';

        products.forEach((product: any) => {
            if (product.category !== currentCategory) {
                currentCategory = product.category;
                response += `\n*${currentCategory}*\n`;
            }
            response += `• ${product.name} - R$ ${Number(product.price).toFixed(2).replace('.', ',')}\n`;
            if (product.description) {
                response += `  _${product.description}_\n`;
            }
        });

        response += '\n\nPara fazer um pedido, digite *1* no menu principal! 🛒';
        return response;
    }

    /**
     * Show business hours
     */
    private static async showBusinessHours(): Promise<string> {
        const { data: hours } = await supabase
            .from('opening_hours')
            .select('*')
            .order('day_of_week');

        if (!hours || hours.length === 0) {
            return this.config?.businessHoursMessage || 'Horário não disponível.';
        }

        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        let hoursText = '';

        hours.forEach((h: any) => {
            const dayName = days[h.day_of_week];
            if (h.is_closed) {
                hoursText += `${dayName}: Fechado\n`;
            } else {
                hoursText += `${dayName}: ${h.open_time} às ${h.close_time}\n`;
            }
        });

        return this.getTemplate('business_hours', { hours: hoursText });
    }

    /**
     * Show delivery areas
     */
    private static async showDeliveryAreas(): Promise<string> {
        const { data: areas } = await supabase
            .from('delivery_fees')
            .select('*')
            .eq('is_active', true)
            .order('neighborhood');

        if (!areas || areas.length === 0) {
            return 'Áreas de entrega não disponíveis no momento.';
        }

        let areasText = '';
        areas.forEach((area: any) => {
            areasText += `• ${area.neighborhood} - R$ ${Number(area.fee).toFixed(2).replace('.', ',')}\n`;
        });

        return this.getTemplate('delivery_areas', { areas: areasText });
    }

    /**
     * Show promotions
     */
    private static async showPromotions(): Promise<string> {
        const { data: rewards } = await supabase
            .from('rewards')
            .select('*')
            .eq('is_active', true)
            .order('points_cost');

        if (!rewards || rewards.length === 0) {
            return '🎁 Não há promoções ativas no momento.\n\nFique ligado nas nossas redes sociais! 📱';
        }

        let response = '🎁 *Promoções Ativas:*\n\n';
        rewards.forEach((reward: any) => {
            response += `• ${reward.title}\n`;
            response += `  ${reward.description}\n`;
            response += `  💎 ${reward.points_cost} pontos\n\n`;
        });

        return response;
    }

    /**
     * Handle browsing menu (category selection)
     */
    private static async handleBrowsingMenu(conversation: ChatbotConversation, message: string): Promise<string> {
        const option = parseInt(message.trim());

        if (isNaN(option)) {
            // Check if it's "voltar"
            if (message.toLowerCase().includes('voltar')) {
                await this.updateContext(conversation.id, { currentStep: 'main_menu' });
                return this.getTemplate('welcome');
            }
            return 'Por favor, digite o número da categoria desejada ou *voltar* para o menu principal.';
        }

        // Get categories to find the selected one
        const { data: categories } = await supabase
            .from('categories')
            .select('*')
            .order('sort_order');

        if (!categories || option < 1 || option > categories.length) {
            return 'Opção inválida. Por favor, escolha uma categoria da lista.';
        }

        const category = categories[option - 1];

        // Get products for this category
        const { data: products } = await supabase
            .from('products')
            .select('*')
            .eq('category', category.name)
            .eq('in_stock', true)
            .order('name');

        if (!products || products.length === 0) {
            return `Desculpe, não há produtos disponíveis na categoria *${category.name}* no momento.`;
        }

        await this.updateContext(conversation.id, {
            currentStep: 'adding_to_cart',
            tempData: { ...conversation.context.tempData, lastCategory: category.name, currentProducts: products }
        });

        let response = `🍔 *${category.name.toUpperCase()}*\n\n`;
        products.forEach((p, index) => {
            response += `${index + 1}️⃣ *${p.name}*\n`;
            response += `   ${p.description || ''}\n`;
            response += `   💰 R$ ${Number(p.price).toFixed(2).replace('.', ',')}\n\n`;
        });
        response += 'Digite o número do produto para adicionar ao carrinho ou *voltar*:';

        return response;
    }

    /**
     * Handle adding items to cart
     */
    private static async handleAddToCart(conversation: ChatbotConversation, message: string): Promise<string> {
        const text = message.trim().toLowerCase();

        if (text === 'voltar') {
            await this.updateContext(conversation.id, { currentStep: 'browsing_menu' });
            return await this.showCategories();
        }

        if (text === 'finalizar') {
            const cart = conversation.context.cart || [];
            if (cart.length === 0) return 'Seu carrinho está vazio! Escolha um produto primeiro.';

            await this.updateContext(conversation.id, { currentStep: 'checkout_address' });
            return 'Deseja que o pedido seja para *Entrega* ou *Retirada*?';
        }

        const option = parseInt(text);
        const products = conversation.context.tempData?.currentProducts as Product[];

        if (isNaN(option) || !products || option < 1 || option > products.length) {
            return 'Opção inválida. Digite o número do produto, *finalizar* para concluir ou *voltar*.';
        }

        const product = products[option - 1];
        const cart = conversation.context.cart || [];

        // Corrected CartItem addition
        const newItem: CartItem = {
            ...product,
            cartId: Math.random().toString(36).substr(2, 9),
            quantity: 1,
            extras: [],
            observation: ''
        };

        cart.push(newItem);
        await this.updateContext(conversation.id, { cart });

        let response = `✅ *${product.name}* adicionado ao carrinho!\n\n`;
        response += `🛒 *Seu Carrinho:*\n`;
        let total = 0;
        cart.forEach((item, i) => {
            response += `${i + 1}. ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
            total += item.price * item.quantity;
        });
        response += `\n*Total: R$ ${total.toFixed(2).replace('.', ',')}*\n\n`;
        response += 'Digite o número de outro produto, *finalizar* para concluir o pedido ou *voltar* para categorias.';

        return response;
    }

    /**
     * Handle checkout address input
     */
    private static async handleCheckoutAddress(conversation: ChatbotConversation, message: string): Promise<string> {
        const text = message.trim().toLowerCase();
        const context = conversation.context;

        if (!context.tempData?.deliveryMethod) {
            if (text.includes('entrega')) {
                await this.updateContext(conversation.id, {
                    tempData: { ...context.tempData, deliveryMethod: 'entrega' }
                });
                return 'Por favor, informe seu *Endereço Completo* (Rua, Número, Bairro e Ponto de Referência):';
            } else if (text.includes('retirada')) {
                await this.updateContext(conversation.id, {
                    tempData: { ...context.tempData, deliveryMethod: 'retirada', address: 'Retirada no Balcão' },
                    currentStep: 'checkout_payment'
                });
                return 'Qual será a forma de pagamento?\n\n1️⃣ PIX\n2️⃣ Dinheiro (especifique o troco)\n3️⃣ Cartão (Deb/Cred)';
            }
            return 'Por favor, responda *Entrega* ou *Retirada*.';
        }

        // If we are here, we are waiting for the address string
        await this.updateContext(conversation.id, {
            tempData: { ...context.tempData, address: message.trim() },
            currentStep: 'checkout_payment'
        });

        return 'Qual será a forma de pagamento?\n\n1️⃣ PIX\n2️⃣ Dinheiro (especifique o troco)\n3️⃣ Cartão (Deb/Cred)';
    }

    /**
     * Handle checkout payment selection
     */
    private static async handleCheckoutPayment(conversation: ChatbotConversation, message: string): Promise<string> {
        const text = message.trim().toLowerCase();
        const context = conversation.context;
        let paymentMethod = '';

        if (text === '1' || text.includes('pix')) {
            paymentMethod = 'PIX';
        } else if (text === '2' || text.includes('dinheiro')) {
            paymentMethod = 'Dinheiro';
        } else if (text === '3' || text.includes('cartao') || text.includes('cartão')) {
            paymentMethod = 'Cartão';
        } else {
            return 'Por favor, escolha uma opção:\n1 para PIX\n2 para Dinheiro\n3 para Cartão';
        }

        // Finalize order (Simplified implementation)
        const cart = context.cart || [];
        let subtotal = 0;
        cart.forEach(item => subtotal += item.price * item.quantity);

        // Create local order object for confirmation
        const orderData = {
            customerName: conversation.customerName || 'Cliente WhatsApp',
            phone: conversation.customerPhone,
            address: context.tempData?.address || 'N/A',
            items: cart,
            total: subtotal,
            paymentMethod: paymentMethod,
            status: 'Pendente',
            timestamp: new Date().toISOString()
        };

        // In a real scenario, we would insert into 'orders' table here
        // For now, let's just confirm and clear context
        const { data: newOrder, error } = await supabase
            .from('orders')
            .insert([{
                customer_name: orderData.customerName,
                phone: orderData.phone,
                address: orderData.address,
                items: orderData.items,
                total: orderData.total,
                payment_method: orderData.paymentMethod,
                status: 'Pendente',
                source: 'whatsapp'
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating order:', error);
            return 'Desculpe, deu um erro ao processar seu pedido. Um atendente irá te ajudar em instantes.';
        }

        // Reset conversation
        await this.updateContext(conversation.id, {
            currentStep: undefined,
            cart: [],
            tempData: {}
        });

        await supabase.rpc('increment_chatbot_analytics', {
            p_date: new Date().toISOString().split('T')[0],
            p_field: 'orders_placed'
        });

        return this.getTemplate('order_confirmation', {
            order_number: newOrder.daily_order_number.toString(),
            total: orderData.total.toFixed(2).replace('.', ','),
            address: orderData.address,
            payment_method: orderData.paymentMethod,
            estimated_time: '30-45 min'
        });
    }

    /**
     * Handle order tracking
     */
    private static async handleTrackOrder(conversation: ChatbotConversation, message: string): Promise<string> {
        const orderNumber = message.replace('#', '').trim();

        const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('daily_order_number', parseInt(orderNumber))
            .maybeSingle();

        if (!order) {
            return '❌ Pedido não encontrado.\n\nVerifique o número e tente novamente.';
        }

        const statusEmojis: Record<string, string> = {
            'Aguardando Pagamento': '⏳',
            'Pendente': '🔔',
            'Preparo': '🍳',
            'Entrega': '🚗',
            'Finalizado': '✅'
        };

        const itemsList = order.items.map((item: any) =>
            `• ${item.quantity}x ${item.name}`
        ).join('\n');

        return this.getTemplate('order_status', {
            order_number: orderNumber,
            status_emoji: statusEmojis[order.status] || '📦',
            status: order.status,
            estimated_time: '25-35 minutos',
            items: itemsList,
            total: Number(order.total).toFixed(2).replace('.', ',')
        });
    }

    /**
     * Get template with variable substitution
     */
    private static getTemplate(name: string, variables: Record<string, string> = {}): string {
        const template = this.templates.get(name);
        if (!template) {
            return 'Desculpe, ocorreu um erro. Por favor, tente novamente.';
        }

        let text = template.templateText;
        Object.entries(variables).forEach(([key, value]) => {
            text = text.replace(new RegExp(`{${key}}`, 'g'), value);
        });

        return text;
    }

    /**
     * Save message to database
     */
    private static async saveMessage(
        conversationId: string,
        senderType: 'customer' | 'bot' | 'agent',
        messageText: string
    ) {
        await supabase.from('chatbot_messages').insert([{
            conversation_id: conversationId,
            sender_type: senderType,
            message_text: messageText,
            message_type: 'text'
        }]);
    }

    /**
     * Update conversation context
     */
    private static async updateContext(conversationId: string, updates: Partial<ConversationContext>) {
        const { data: current } = await supabase
            .from('chatbot_conversations')
            .select('context')
            .eq('id', conversationId)
            .single();

        const newContext = { ...(current?.context || {}), ...updates };

        await supabase
            .from('chatbot_conversations')
            .update({ context: newContext })
            .eq('id', conversationId);
    }

    /**
     * Increment retry count
     */
    private static async incrementRetry(conversationId: string) {
        await supabase.rpc('increment_retry_count', { conv_id: conversationId });
    }

    /**
     * Reset retry count
     */
    private static async resetRetry(conversationId: string) {
        await supabase
            .from('chatbot_conversations')
            .update({ retry_count: 0 })
            .eq('id', conversationId);
    }

    /**
     * Map database conversation to TypeScript interface
     */
    private static mapConversation(data: any): ChatbotConversation {
        return {
            id: data.id,
            customerPhone: data.customer_phone,
            customerName: data.customer_name,
            status: data.status,
            context: data.context || {},
            assignedAgentId: data.assigned_agent_id,
            retryCount: data.retry_count || 0,
            lastMessageAt: new Date(data.last_message_at),
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            closedAt: data.closed_at ? new Date(data.closed_at) : undefined
        };
    }
}
