
import React from 'react';
import { ADMIN_MENU_ITEMS } from './AdminSidebar';

interface AdminHeaderProps {
    activeTab: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ activeTab }) => {
    return (
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
            <h2 className="text-lg font-semibold text-slate-100 capitalize">
                {ADMIN_MENU_ITEMS.find(i => i.id === activeTab)?.label || 'Dashboard'}
            </h2>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    LIVE
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700"></div>
            </div>
        </header>
    );
};
