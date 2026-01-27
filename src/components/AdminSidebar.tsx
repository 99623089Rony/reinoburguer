
import React from 'react';
import { ClipboardList, Utensils, Star, Ticket, BarChart3, Settings, LogIn, Printer, DollarSign, Users, Store, Plus, Bot } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

export interface AdminMenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
}

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
    { id: 'orders', label: 'Pedidos', icon: <ClipboardList size={20} /> },
    { id: 'manual_order', label: 'Novo Pedido', icon: <Plus size={20} /> },
    { id: 'customer_view', label: 'Ver Loja', icon: <Store size={24} /> },
    { id: 'stock', label: 'Cardápio', icon: <Utensils size={20} /> },
    { id: 'printer', label: 'Impressora', icon: <Printer size={20} /> },
    { id: 'finance', label: 'Caixa', icon: <DollarSign size={20} /> },
    { id: 'loyalty', label: 'Fidelidade', icon: <Star size={20} /> },
    { id: 'coupons', label: 'Cupons', icon: <Ticket size={20} /> },
    { id: 'team', label: 'Equipe', icon: <Users size={20} /> },
    { id: 'chatbot', label: 'Atendente', icon: <Bot size={20} /> },
    { id: 'reports', label: 'Relatórios', icon: <BarChart3 size={20} /> },
    { id: 'settings', label: 'Configurações', icon: <Settings size={20} /> },
];

interface AdminSidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, onTabChange }) => {
    const { playNotificationSound, audioUnlocked } = useApp();
    const { storeConfig } = useApp();
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <aside className="w-64 h-screen border-r border-slate-800 flex flex-col hidden lg:flex sticky top-0">
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                    <span className="font-bold text-white">{(storeConfig?.name || 'R')[0]}</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight">{storeConfig?.name || 'Reino Burguer'}</h1>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {ADMIN_MENU_ITEMS.map((item) => {
                    if (item.id === 'customer_view') {
                        return (
                            <a
                                key={item.id}
                                href="/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-400 hover:bg-slate-800/50 hover:text-blue-400 group"
                            >
                                <span className="text-slate-500 group-hover:text-blue-400 transition-colors">
                                    {item.icon}
                                </span>
                                <span className="font-medium group-hover:underline decoration-blue-400/30 underline-offset-4">{item.label}</span>
                            </a>
                        );
                    }
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                                }`}
                        >
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800 space-y-2 flex-shrink-0">
                {!audioUnlocked && (
                    <button
                        onClick={() => playNotificationSound()}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors animate-pulse mb-2"
                    >
                        <span className="text-xl">🔇</span>
                        <span className="font-bold text-sm">Ativar Som do Pedido</span>
                    </button>
                )}
                <button
                    onClick={async () => {
                        if ('Notification' in window) {
                            if (Notification.permission === 'default') {
                                const perm = await Notification.requestPermission();
                                if (perm === 'granted') {
                                    new Notification('🔔 Notificações Ativadas!', { body: 'Você receberá alertas de novos pedidos.' });
                                } else {
                                    alert('Permissão negada. Você não receberá notificações do navegador.');
                                }
                            } else if (Notification.permission === 'granted') {
                                playNotificationSound();
                            } else {
                                alert('Notificações bloqueadas. Vá nas configurações do navegador para permitir.');
                            }
                        } else {
                            alert('Seu navegador não suporta notificações.');
                        }
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-orange-400 transition-colors"
                >
                    <span className="text-xl">🔔</span>
                    <span className="font-medium">
                        {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' ? 'Testar Som' : 'Ativar Notificações'}
                    </span>
                </button>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                    <LogIn size={20} className="rotate-180" />
                    <span className="font-medium">Sair</span>
                </button>
            </div>
        </aside>
    );
};
