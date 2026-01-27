import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import {
    Bot,
    MessageSquare,
    Settings,
    BarChart3,
    Users,
    Send,
    X,
    CheckCircle,
    Clock,
    TrendingUp,
    MessageCircle,
    UserCheck,
    ShoppingCart,
    Power,
    Edit,
    Save,
    Plus,
    Globe,
    Link,
    Terminal
} from 'lucide-react';
import {
    ChatbotConfig,
    ChatbotConversation,
    ChatbotMessage,
    ChatbotTemplate,
    ChatbotAnalytics
} from '../types';

export default function AdminChatbot() {
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'config' | 'conversations' | 'templates' | 'analytics' | 'integration'>('config');
    const [config, setConfig] = useState<ChatbotConfig | null>(null);
    const [wahaConfig, setWahaConfig] = useState({ url: '', session: 'default', apiKey: '' });
    const [conversations, setConversations] = useState<ChatbotConversation[]>([]);
    const [templates, setTemplates] = useState<ChatbotTemplate[]>([]);
    const [analytics, setAnalytics] = useState<ChatbotAnalytics[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<ChatbotConversation | null>(null);
    const [conversationMessages, setConversationMessages] = useState<ChatbotMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingConfig, setEditingConfig] = useState(false);
    const [agentMessage, setAgentMessage] = useState('');

    // Load initial data
    useEffect(() => {
        // Get current user
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
        });

        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        await Promise.all([
            loadConfig(),
            loadWahaConfig(),
            loadConversations(),
            loadTemplates(),
            loadAnalytics()
        ]);
        setLoading(false);
    };

    const loadConfig = async () => {
        const { data } = await supabase
            .from('chatbot_config')
            .select('*')
            .single();

        if (data) {
            setConfig({
                id: data.id,
                welcomeMessage: data.welcome_message,
                menuOptions: data.menu_options,
                businessHoursMessage: data.business_hours_message,
                outOfHoursMessage: data.out_of_hours_message,
                isActive: data.is_active,
                handoffKeywords: data.handoff_keywords,
                autoResponseDelayMs: data.auto_response_delay_ms,
                maxRetriesBeforeHandoff: data.max_retries_before_handoff
            });
        }
    };

    const loadWahaConfig = async () => {
        const { data } = await supabase
            .from('store_config')
            .select('waha_url, waha_session, waha_api_key')
            .single();

        if (data) {
            setWahaConfig({
                url: data.waha_url || '',
                session: data.waha_session || 'default',
                apiKey: data.waha_api_key || ''
            });
        }
    };

    const loadConversations = async () => {
        const { data } = await supabase
            .from('chatbot_conversations')
            .select('*')
            .order('last_message_at', { ascending: false })
            .limit(50);

        if (data) {
            setConversations(data.map(mapConversation));
        }
    };

    const loadTemplates = async () => {
        const { data } = await supabase
            .from('chatbot_templates')
            .select('*')
            .order('category, name');

        if (data) {
            setTemplates(data.map((t: any) => ({
                id: t.id,
                name: t.name,
                category: t.category,
                templateText: t.template_text,
                variables: t.variables,
                isActive: t.is_active,
                usageCount: t.usage_count
            })));
        }
    };

    const loadAnalytics = async () => {
        const { data } = await supabase
            .from('chatbot_analytics')
            .select('*')
            .order('date', { ascending: false })
            .limit(30);

        if (data) {
            setAnalytics(data.map((a: any) => ({
                id: a.id,
                date: new Date(a.date),
                totalConversations: a.total_conversations,
                botResolved: a.bot_resolved,
                agentHandoffs: a.agent_handoffs,
                ordersPlaced: a.orders_placed,
                avgResponseTimeMs: a.avg_response_time_ms,
                popularIntents: a.popular_intents
            })));
        }
    };

    const loadConversationMessages = async (conversationId: string) => {
        const { data } = await supabase
            .from('chatbot_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (data) {
            setConversationMessages(data.map((m: any) => ({
                id: m.id,
                conversationId: m.conversation_id,
                senderType: m.sender_type,
                senderId: m.sender_id,
                messageText: m.message_text,
                messageType: m.message_type,
                metadata: m.metadata,
                isRead: m.is_read,
                createdAt: new Date(m.created_at)
            })));
        }
    };

    const toggleChatbot = async () => {
        if (!config) return;

        const newStatus = !config.isActive;
        await supabase
            .from('chatbot_config')
            .update({ is_active: newStatus })
            .eq('id', config.id);

        setConfig({ ...config, isActive: newStatus });
    };

    const saveConfig = async () => {
        if (!config) return;

        await supabase
            .from('chatbot_config')
            .update({
                welcome_message: config.welcomeMessage,
                business_hours_message: config.businessHoursMessage,
                out_of_hours_message: config.outOfHoursMessage
            })
            .eq('id', config.id);

        setEditingConfig(false);
    };

    const saveWahaConfig = async () => {
        const { error } = await supabase
            .from('store_config')
            .update({
                waha_url: wahaConfig.url,
                waha_session: wahaConfig.session,
                waha_api_key: wahaConfig.apiKey
            })
            .order('id', { ascending: true }) // Usually only one config
            .limit(1);

        if (!error) {
            alert('Configuração de integração salva!');
        }
    };

    const assignToMe = async (conversation: ChatbotConversation) => {
        await supabase
            .from('chatbot_conversations')
            .update({
                status: 'with_agent',
                assigned_agent_id: user?.id
            })
            .eq('id', conversation.id);

        await loadConversations();
        setSelectedConversation({ ...conversation, status: 'with_agent', assignedAgentId: user?.id });
    };

    const sendAgentMessage = async () => {
        if (!selectedConversation || !agentMessage.trim()) return;

        await supabase.from('chatbot_messages').insert([{
            conversation_id: selectedConversation.id,
            sender_type: 'agent',
            sender_id: user?.id,
            message_text: agentMessage,
            message_type: 'text'
        }]);

        setAgentMessage('');
        await loadConversationMessages(selectedConversation.id);
    };

    const closeConversation = async (conversationId: string) => {
        await supabase
            .from('chatbot_conversations')
            .update({
                status: 'closed',
                closed_at: new Date().toISOString()
            })
            .eq('id', conversationId);

        setSelectedConversation(null);
        await loadConversations();
    };

    const mapConversation = (data: any): ChatbotConversation => ({
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
    });

    // Analytics calculations
    const analyticsStats = useMemo(() => {
        if (analytics.length === 0) return null;

        const last7Days = analytics.slice(0, 7);
        const totalConversations = last7Days.reduce((sum, a) => sum + a.totalConversations, 0);
        const totalHandoffs = last7Days.reduce((sum, a) => sum + a.agentHandoffs, 0);
        const totalOrders = last7Days.reduce((sum, a) => sum + a.ordersPlaced, 0);
        const avgResponseTime = Math.round(
            last7Days.reduce((sum, a) => sum + a.avgResponseTimeMs, 0) / last7Days.length
        );

        return {
            totalConversations,
            totalHandoffs,
            totalOrders,
            avgResponseTime,
            handoffRate: totalConversations > 0 ? (totalHandoffs / totalConversations * 100).toFixed(1) : '0',
            conversionRate: totalConversations > 0 ? (totalOrders / totalConversations * 100).toFixed(1) : '0'
        };
    }, [analytics]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Bot className="w-16 h-16 text-emerald-500 animate-pulse mx-auto mb-4" />
                    <p className="text-slate-400">Carregando chatbot...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
                            <Bot className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white">Atendente Virtual</h1>
                            <p className="text-slate-400 text-sm">Sistema de chatbot WhatsApp</p>
                        </div>
                    </div>

                    {/* Chatbot Toggle */}
                    <button
                        onClick={toggleChatbot}
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold transition-all ${config?.isActive
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        <Power size={20} />
                        {config?.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800">
                    {[
                        { id: 'config', label: 'Configuração', icon: Settings },
                        { id: 'conversations', label: 'Conversas', icon: MessageSquare },
                        { id: 'templates', label: 'Templates', icon: MessageCircle },
                        { id: 'integration', label: 'Integração', icon: Globe },
                        { id: 'analytics', label: 'Análises', icon: BarChart3 }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id
                                ? 'bg-emerald-500 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {activeTab === 'config' && (
                    <div className="space-y-6">
                        {/* Status Card */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-black text-white">Status do Chatbot</h2>
                                <div className={`px-4 py-2 rounded-full text-sm font-bold ${config?.isActive
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-slate-700 text-slate-400'
                                    }`}>
                                    {config?.isActive ? '● Online' : '○ Offline'}
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm">
                                {config?.isActive
                                    ? 'O chatbot está respondendo automaticamente às mensagens dos clientes.'
                                    : 'O chatbot está desativado. Ative-o para começar a responder automaticamente.'}
                            </p>
                        </div>

                        {/* Welcome Message */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-black text-white">Mensagem de Boas-Vindas</h2>
                                {!editingConfig ? (
                                    <button
                                        onClick={() => setEditingConfig(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition-all"
                                    >
                                        <Edit size={16} />
                                        Editar
                                    </button>
                                ) : (
                                    <button
                                        onClick={saveConfig}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white font-bold transition-all"
                                    >
                                        <Save size={16} />
                                        Salvar
                                    </button>
                                )}
                            </div>

                            {editingConfig ? (
                                <textarea
                                    value={config?.welcomeMessage || ''}
                                    onChange={(e) => setConfig(config ? { ...config, welcomeMessage: e.target.value } : null)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white font-mono text-sm resize-none"
                                    rows={8}
                                />
                            ) : (
                                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                                    <pre className="text-slate-300 font-mono text-sm whitespace-pre-wrap">
                                        {config?.welcomeMessage}
                                    </pre>
                                </div>
                            )}
                        </div>

                        {/* Menu Options */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <h2 className="text-xl font-black text-white mb-4">Opções do Menu</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {config?.menuOptions.map((option) => (
                                    <div
                                        key={option.number}
                                        className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3"
                                    >
                                        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 font-black">
                                            {option.number}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-sm">{option.label}</p>
                                            <p className="text-slate-500 text-xs">{option.action}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'conversations' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Conversations List */}
                        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 max-h-[700px] overflow-y-auto">
                            <h2 className="text-xl font-black text-white mb-4">Conversas Ativas</h2>
                            <div className="space-y-2">
                                {conversations.filter(c => c.status !== 'closed').map((conv) => (
                                    <button
                                        key={conv.id}
                                        onClick={() => {
                                            setSelectedConversation(conv);
                                            loadConversationMessages(conv.id);
                                        }}
                                        className={`w-full text-left p-4 rounded-xl transition-all ${selectedConversation?.id === conv.id
                                            ? 'bg-emerald-500/20 border-2 border-emerald-500'
                                            : 'bg-slate-800 border border-slate-700 hover:bg-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-bold text-white text-sm">
                                                {conv.customerName || conv.customerPhone}
                                            </p>
                                            <span className={`text-xs px-2 py-1 rounded-full ${conv.status === 'waiting_agent'
                                                ? 'bg-amber-500/20 text-amber-400'
                                                : conv.status === 'with_agent'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-emerald-500/20 text-emerald-400'
                                                }`}>
                                                {conv.status === 'waiting_agent' ? 'Aguardando' :
                                                    conv.status === 'with_agent' ? 'Em atendimento' : 'Ativo'}
                                            </span>
                                        </div>
                                        <p className="text-slate-500 text-xs">
                                            {new Date(conv.lastMessageAt).toLocaleString()}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Conversation Detail */}
                        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            {selectedConversation ? (
                                <div className="flex flex-col h-[700px]">
                                    {/* Header */}
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                                        <div>
                                            <h3 className="text-xl font-black text-white">
                                                {selectedConversation.customerName || selectedConversation.customerPhone}
                                            </h3>
                                            <p className="text-slate-400 text-sm">{selectedConversation.customerPhone}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {selectedConversation.status === 'waiting_agent' && (
                                                <button
                                                    onClick={() => assignToMe(selectedConversation)}
                                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white font-bold text-sm"
                                                >
                                                    Atender
                                                </button>
                                            )}
                                            {selectedConversation.status === 'with_agent' && (
                                                <button
                                                    onClick={() => closeConversation(selectedConversation.id)}
                                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-bold text-sm"
                                                >
                                                    Encerrar
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto py-4 space-y-3">
                                        {conversationMessages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={`flex ${msg.senderType === 'customer' ? 'justify-start' : 'justify-end'}`}
                                            >
                                                <div className={`max-w-[70%] rounded-2xl p-3 ${msg.senderType === 'customer'
                                                    ? 'bg-slate-800 text-white'
                                                    : msg.senderType === 'bot'
                                                        ? 'bg-emerald-500/20 text-emerald-300'
                                                        : 'bg-blue-500 text-white'
                                                    }`}>
                                                    <p className="text-sm whitespace-pre-wrap">{msg.messageText}</p>
                                                    <p className="text-xs opacity-60 mt-1">
                                                        {new Date(msg.createdAt).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Agent Input */}
                                    {selectedConversation.status === 'with_agent' && (
                                        <div className="pt-4 border-t border-slate-800">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={agentMessage}
                                                    onChange={(e) => setAgentMessage(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && sendAgentMessage()}
                                                    placeholder="Digite sua mensagem..."
                                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                                                />
                                                <button
                                                    onClick={sendAgentMessage}
                                                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white font-bold"
                                                >
                                                    <Send size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-[700px] flex items-center justify-center text-slate-500">
                                    <div className="text-center">
                                        <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>Selecione uma conversa para visualizar</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'templates' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-white">Templates de Mensagens</h2>
                            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white font-bold">
                                <Plus size={16} />
                                Novo Template
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {templates.map((template) => (
                                <div key={template.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-white">{template.name}</h3>
                                        <span className="text-xs px-2 py-1 bg-slate-700 rounded-full text-slate-400">
                                            {template.category}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-2 line-clamp-3">
                                        {template.templateText}
                                    </p>
                                    {template.variables.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {template.variables.map((v) => (
                                                <span key={v} className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">
                                                    {`{${v}}`}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'integration' && (
                    <div className="space-y-6 max-w-2xl">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                                    <Globe size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white">Configuração WAHA</h2>
                                    <p className="text-slate-400 text-sm">Integração com WhatsApp HTTP API</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">WAHA API URL</label>
                                    <input
                                        type="text"
                                        value={wahaConfig.url}
                                        onChange={(e) => setWahaConfig({ ...wahaConfig, url: e.target.value })}
                                        placeholder="http://seu-servidor:3000"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600"
                                    />
                                    <p className="text-[10px] text-slate-500 italic ml-1">A URL onde seu serviço WAHA está rodando.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Sessão</label>
                                        <input
                                            type="text"
                                            value={wahaConfig.session}
                                            onChange={(e) => setWahaConfig({ ...wahaConfig, session: e.target.value })}
                                            placeholder="default"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">API Key (Opcional)</label>
                                        <input
                                            type="password"
                                            value={wahaConfig.apiKey}
                                            onChange={(e) => setWahaConfig({ ...wahaConfig, apiKey: e.target.value })}
                                            placeholder="Sua senha WAHA"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={saveWahaConfig}
                                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save size={20} />
                                        Salvar Configuração
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <Link size={18} className="text-emerald-500" />
                                Configuração do Webhook
                            </h3>
                            <p className="text-slate-400 text-sm mb-4">
                                No seu painel WAHA, configure o Webhook para enviar eventos do tipo <code className="bg-slate-800 px-1 rounded text-emerald-400 font-mono">message</code> para a seguinte URL:
                            </p>
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between group">
                                <code className="text-emerald-500 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                                    {`https://saikxbildeupefudrrhl.supabase.co/functions/v1/whatsapp-webhook`}
                                </code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`https://saikxbildeupefudrrhl.supabase.co/functions/v1/whatsapp-webhook`);
                                        alert('Copiado!');
                                    }}
                                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                                >
                                    <Terminal size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && analyticsStats && (
                    <div className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <MessageCircle className="text-blue-400" size={24} />
                                    <p className="text-slate-400 text-sm font-bold">Conversas (7d)</p>
                                </div>
                                <h3 className="text-3xl font-black text-white">{analyticsStats.totalConversations}</h3>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <UserCheck className="text-amber-400" size={24} />
                                    <p className="text-slate-400 text-sm font-bold">Transferências</p>
                                </div>
                                <h3 className="text-3xl font-black text-white">{analyticsStats.totalHandoffs}</h3>
                                <p className="text-slate-500 text-xs mt-1">{analyticsStats.handoffRate}% das conversas</p>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <ShoppingCart className="text-emerald-400" size={24} />
                                    <p className="text-slate-400 text-sm font-bold">Pedidos</p>
                                </div>
                                <h3 className="text-3xl font-black text-white">{analyticsStats.totalOrders}</h3>
                                <p className="text-slate-500 text-xs mt-1">{analyticsStats.conversionRate}% conversão</p>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Clock className="text-purple-400" size={24} />
                                    <p className="text-slate-400 text-sm font-bold">Tempo Médio</p>
                                </div>
                                <h3 className="text-3xl font-black text-white">{analyticsStats.avgResponseTime}ms</h3>
                            </div>
                        </div>

                        {/* Daily Analytics */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <h2 className="text-xl font-black text-white mb-4">Análise Diária</h2>
                            <div className="space-y-2">
                                {analytics.slice(0, 7).map((day) => (
                                    <div key={day.id} className="flex items-center gap-4 p-3 bg-slate-800 rounded-xl">
                                        <p className="text-slate-400 text-sm w-24">
                                            {new Date(day.date).toLocaleDateString()}
                                        </p>
                                        <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-slate-500 text-xs">Conversas</p>
                                                <p className="text-white font-bold">{day.totalConversations}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-xs">Bot</p>
                                                <p className="text-emerald-400 font-bold">{day.botResolved}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-xs">Agente</p>
                                                <p className="text-amber-400 font-bold">{day.agentHandoffs}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-xs">Pedidos</p>
                                                <p className="text-blue-400 font-bold">{day.ordersPlaced}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
