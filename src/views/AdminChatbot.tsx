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
    Plus,
    Globe,
    Link,
    Terminal,
    Zap,
    AlertTriangle,
    Shield,
    Smartphone,
    History,
    FileText,
    Brain,
    ShoppingCart,
    Power,
    Edit,
    Save,
    TrendingUp,
    MessageCircle,
    UserCheck,
    RefreshCw
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
    const [activeTab, setActiveTab] = useState<'dashboard' | 'conversations' | 'rules' | 'integration' | 'analytics'>('dashboard');
    const [config, setConfig] = useState<ChatbotConfig | null>(null);
    const [wahaConfig, setWahaConfig] = useState({ url: '', session: 'default', apiKey: '', status: 'DISCONNECTED' });
    const [storeId, setStoreId] = useState<string | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [isRefreshingQr, setIsRefreshingQr] = useState(false);
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
            .select('id, waha_url, waha_session, waha_api_key')
            .single();

        if (data) {
            setStoreId(data.id);
            setWahaConfig({
                url: data.waha_url || '',
                session: data.waha_session || 'default',
                apiKey: data.waha_api_key || '',
                status: 'DISCONNECTED'
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
        if (!storeId) {
            alert('Erro: ID da loja não encontrado.');
            return;
        }

        const { error } = await supabase
            .from('store_config')
            .update({
                waha_url: wahaConfig.url,
                waha_session: wahaConfig.session,
                waha_api_key: wahaConfig.apiKey
            })
            .eq('id', storeId);

        if (!error) {
            alert('Configuração salva com sucesso!');
            checkStatus();
        } else {
            console.error('Error saving WAHA config:', error);
            alert('Erro ao salvar configuração: ' + error.message);
        }
    };

    const getWahaBaseUrl = () => {
        if (!wahaConfig.url) return '';
        let url = wahaConfig.url.trim();
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        if (url.endsWith('/')) {
            url = url.slice(0, -1);
        }
        return url;
    };

    const checkStatus = async () => {
        const baseUrl = getWahaBaseUrl();
        if (!baseUrl) return;

        try {
            const response = await fetch(`${baseUrl}/api/sessions/${wahaConfig.session}`, {
                headers: wahaConfig.apiKey ? { 'X-Api-Key': wahaConfig.apiKey } : {}
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setWahaConfig(prev => ({ ...prev, status: 'UNAUTHORIZED' }));
                } else if (response.status === 404) {
                    setWahaConfig(prev => ({ ...prev, status: 'DISCONNECTED' }));
                } else {
                    setWahaConfig(prev => ({ ...prev, status: 'OFFLINE' }));
                }
                return;
            }

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                if (data && data.status) {
                    setWahaConfig(prev => ({ ...prev, status: data.status }));
                    if (data.status === 'SCAN_QR_CODE') {
                        fetchQrCode();
                    } else {
                        setQrCode(null);
                    }
                }
            }
        } catch (err) {
            console.error('Error checking WAHA status:', err);
            setWahaConfig(prev => ({ ...prev, status: 'OFFLINE' }));
        }
    };

    const fetchQrCode = async () => {
        const baseUrl = getWahaBaseUrl();
        if (!baseUrl) return;
        setIsRefreshingQr(true);
        try {
            const response = await fetch(`${baseUrl}/api/${wahaConfig.session}/auth/screenshot`, {
                headers: wahaConfig.apiKey ? { 'X-Api-Key': wahaConfig.apiKey } : {}
            });
            if (!response.ok) throw new Error('Failed to fetch screenshot');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setQrCode(url);
        } catch (err) {
            console.error('Error fetching QR Code:', err);
        } finally {
            setIsRefreshingQr(false);
        }
    };

    const startSession = async () => {
        const baseUrl = getWahaBaseUrl();
        if (!baseUrl) return;
        try {
            const response = await fetch(`${baseUrl}/api/sessions/${wahaConfig.session}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(wahaConfig.apiKey ? { 'X-Api-Key': wahaConfig.apiKey } : {})
                }
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Start session error:', errorText);
            }
            setTimeout(checkStatus, 2000);
        } catch (err) {
            alert('Erro ao iniciar sessão. Verifique se a URL está correta.');
        }
    };

    const logoutSession = async () => {
        if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
        const baseUrl = getWahaBaseUrl();
        if (!baseUrl) return;

        try {
            await fetch(`${baseUrl}/api/sessions/${wahaConfig.session}/logout`, {
                method: 'POST',
                headers: wahaConfig.apiKey ? { 'X-Api-Key': wahaConfig.apiKey } : {}
            });
            setWahaConfig(prev => ({ ...prev, status: 'DISCONNECTED' }));
            setQrCode(null);
        } catch (err) {
            alert('Erro ao desconectar.');
        }
    };

    useEffect(() => {
        if (activeTab === 'integration') {
            checkStatus();
            const interval = setInterval(checkStatus, 15000); // Check every 15s
            return () => clearInterval(interval);
        }
    }, [activeTab, wahaConfig.url, wahaConfig.session]);

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
                        { id: 'dashboard', label: 'Painel', icon: BarChart3 },
                        { id: 'conversations', label: 'Conversas', icon: MessageSquare },
                        { id: 'rules', label: 'Regras', icon: Brain },
                        { id: 'integration', label: 'Conectar', icon: Zap },
                        { id: 'analytics', label: 'Análises', icon: TrendingUp }
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
                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        {/* Status Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Zap size={80} className="text-emerald-500" />
                                </div>
                                <h3 className="text-slate-400 text-sm font-bold uppercase mb-4">Status da Brenda</h3>
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full animate-pulse ${wahaConfig.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    <span className="text-2xl font-black text-white">
                                        {wahaConfig.status === 'CONNECTED' ? 'Conectada' : 'Desconectada'}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-xs mt-2">Sessão: {wahaConfig.session}</p>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <MessageSquare size={80} className="text-blue-500" />
                                </div>
                                <h3 className="text-slate-400 text-sm font-bold uppercase mb-4">Conversas Hoje</h3>
                                <span className="text-4xl font-black text-white">{analyticsStats?.totalConversations || 0}</span>
                                <p className="text-slate-500 text-xs mt-2">7 dias: {analyticsStats?.totalConversations || 0} contatos</p>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <ShoppingCart size={80} className="text-purple-500" />
                                </div>
                                <h3 className="text-slate-400 text-sm font-bold uppercase mb-4">Pedidos via Bot</h3>
                                <span className="text-4xl font-black text-white">{analyticsStats?.totalOrders || 0}</span>
                                <p className="text-slate-500 text-xs mt-2">Taxa de conversão: {analyticsStats?.conversionRate || 0}%</p>
                            </div>
                        </div>

                        {/* Recent Activity Mini List */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                                <History size={20} className="text-emerald-500" />
                                Atividade Recente
                            </h2>
                            <div className="space-y-4">
                                {conversations.slice(0, 5).map(conv => (
                                    <div key={conv.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">
                                                {conv.customerName?.[0] || 'C'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-sm">{conv.customerName || conv.customerPhone}</p>
                                                <p className="text-slate-500 text-xs">{conv.status === 'with_agent' ? 'Em atendimento humano' : 'Sendo atendido pela Brenda'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-400 text-xs font-mono">{new Date(conv.lastMessageAt).toLocaleTimeString()}</p>
                                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${conv.status === 'waiting_agent' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
                                                }`}>
                                                {conv.status === 'waiting_agent' ? 'Precisa de Ajuda' : 'Automatizado'}
                                            </span>
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

                {/* Rules Tab */}
                {activeTab === 'rules' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-black text-white">Regras de Respostas</h2>
                                    <p className="text-slate-400 text-sm">Defina como a Brenda deve responder a certas palavras ou frases.</p>
                                </div>
                                <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white font-bold transition-all">
                                    <Plus size={16} />
                                    Nova Regra
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Rule 1: Welcome (Implicit Template) */}
                                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-emerald-500/50 transition-all group">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                                                <Zap size={16} />
                                            </div>
                                            <h3 className="font-bold text-white">Saudação Inicial</h3>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 bg-slate-700 rounded-full text-slate-400 font-black uppercase">Automático</span>
                                    </div>
                                    <p className="text-slate-400 text-sm line-clamp-2 mb-4 italic">"{config?.welcomeMessage}"</p>
                                    <button className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all">
                                        Editar Mensagem
                                    </button>
                                </div>

                                {/* Rule 2: Order flow */}
                                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-blue-500/50 transition-all group">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                                <ShoppingCart size={16} />
                                            </div>
                                            <h3 className="font-bold text-white">Fluxo de Pedido</h3>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 bg-slate-700 rounded-full text-slate-400 font-black uppercase">Sistema</span>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-4">Ativa ao escolher "Fazer Pedido". Navega por categorias e produtos.</p>
                                    <button className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all">
                                        Configurar Etapas
                                    </button>
                                </div>

                                {/* Rule 3: Agent Handoff */}
                                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-amber-500/50 transition-all group">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                                                <Users size={16} />
                                            </div>
                                            <h3 className="font-bold text-white">Falar com Humano</h3>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {config?.handoffKeywords.map(k => (
                                            <span key={k} className="text-[10px] px-2 py-0.5 bg-slate-900 text-slate-400 rounded-lg">{k}</span>
                                        ))}
                                    </div>
                                    <button className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all">
                                        Editar Gatilhos
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Templates section (original) */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                                <FileText size={20} className="text-emerald-500" />
                                Mensagens Prontas
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {templates.map((template) => (
                                    <div key={template.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-white text-sm">{template.name}</h3>
                                            <span className="text-[10px] px-2 py-1 bg-slate-700 rounded-full text-slate-400 uppercase font-black">
                                                {template.category}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-xs mb-2 line-clamp-2">
                                            {template.templateText}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'integration' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                        <Smartphone size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white">Conexão WhatsApp</h2>
                                        <p className="text-slate-400 text-sm">Escaneie o QR Code para ativar a Brenda</p>
                                    </div>
                                </div>

                                {/* Connection Box */}
                                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px] relative">
                                    {wahaConfig.status === 'CONNECTED' ? (
                                        <div className="text-center space-y-4">
                                            <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500 animate-pulse">
                                                <CheckCircle size={48} className="text-emerald-500" />
                                            </div>
                                            <h3 className="text-2xl font-black text-white">Brenda Conectada!</h3>
                                            <p className="text-slate-400 text-sm max-w-xs">Ela está pronta e online para atender seus clientes.</p>
                                            <button
                                                onClick={logoutSession}
                                                className="px-6 py-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-xl text-slate-400 font-bold transition-all text-xs"
                                            >
                                                Desconectar Sessão
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-6">
                                            <div
                                                onClick={checkStatus}
                                                className="w-64 h-64 bg-white rounded-2xl p-4 mx-auto shadow-[0_0_50px_rgba(255,255,255,0.1)] group cursor-pointer relative overflow-hidden"
                                            >
                                                {qrCode ? (
                                                    <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center relative overflow-hidden rounded-lg">
                                                        <div className="absolute inset-0 bg-slate-200 animate-pulse" />
                                                        <p className="relative z-10 text-slate-400 font-black text-[10px] uppercase tracking-widest text-center px-4">
                                                            Aguardando QR Code...
                                                        </p>
                                                    </div>
                                                )}

                                                {isRefreshingQr && (
                                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                        <RefreshCw size={24} className="text-emerald-500 animate-spin" />
                                                    </div>
                                                )}

                                                <div className="absolute inset-x-0 -bottom-3 flex justify-center">
                                                    <span className="bg-emerald-500 text-white text-[10px] font-black px-4 py-1 rounded-full shadow-lg uppercase tracking-wider">
                                                        {isRefreshingQr ? 'Atualizando...' : 'Clique para atualizar'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-white">
                                                    Status: {
                                                        wahaConfig.status === 'OFFLINE' ? 'Servidor Offline' :
                                                            wahaConfig.status === 'UNAUTHORIZED' ? 'Chave API Incorreta' :
                                                                'Aguardando QR Code'
                                                    }
                                                </h3>
                                                <p className="text-slate-500 text-sm mt-1 italic">
                                                    {wahaConfig.status === 'UNAUTHORIZED'
                                                        ? 'Defina a mesma Chave API no Koyeb e aqui.'
                                                        : 'No WhatsApp: Aparelhos Conectados > Conectar um Aparelho'}
                                                </p>
                                            </div>
                                            <div className="flex gap-3 justify-center">
                                                <button
                                                    onClick={startSession}
                                                    className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-2xl text-white font-black transition-all"
                                                >
                                                    <Zap size={20} />
                                                    Iniciar Sessão
                                                </button>
                                                <button
                                                    onClick={fetchQrCode}
                                                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700 transition-all text-slate-400"
                                                >
                                                    <RefreshCw size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Server Settings (Advanced) */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white">Segurança & Servidor</h2>
                                        <p className="text-slate-400 text-sm">Configurações técnicas avançadas</p>
                                    </div>
                                </div>

                                <div className="space-y-4 flex-1">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">URL da Engine</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={wahaConfig.url}
                                                onChange={(e) => setWahaConfig({ ...wahaConfig, url: e.target.value })}
                                                placeholder="http://seu-servidor:3000"
                                                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 font-mono text-sm"
                                            />
                                            <button className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all">
                                                <Link size={18} className="text-slate-400" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Sessão</label>
                                            <input
                                                type="text"
                                                value={wahaConfig.session}
                                                onChange={(e) => setWahaConfig({ ...wahaConfig, session: e.target.value })}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Chave API</label>
                                            <input
                                                type="password"
                                                value={wahaConfig.apiKey}
                                                onChange={(e) => setWahaConfig({ ...wahaConfig, apiKey: e.target.value })}
                                                placeholder="••••••••"
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 mt-4">
                                        <div className="flex items-center gap-2 text-amber-500">
                                            <AlertTriangle size={14} />
                                            <span className="text-[10px] font-black uppercase">Atenção</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-relaxed">
                                            Mantenha sua Chave API em segredo. Ao trocar a URL da Engine, o bot será reiniciado e precisará de um novo QR Code.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={saveWahaConfig}
                                    className="w-full py-4 mt-6 bg-slate-100 hover:bg-white text-slate-950 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <Save size={20} />
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>

                        {/* Webhook Info Card */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <Terminal size={18} className="text-emerald-500" />
                                Endereço de Escuta (Webhook)
                            </h3>
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between group">
                                <code className="text-emerald-500 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                                    {`https://saikxbildeupefudrrhl.supabase.co/functions/v1/whatsapp-webhook`}
                                </code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`https://saikxbildeupefudrrhl.supabase.co/functions/v1/whatsapp-webhook`);
                                        alert('Copiado!');
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all text-[10px] font-black uppercase"
                                >
                                    Copiar
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
