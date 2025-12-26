
import React from 'react';
import { ADMIN_MENU_ITEMS } from './AdminSidebar';

interface AdminMobileNavProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export const AdminMobileNav: React.FC<AdminMobileNavProps> = ({ activeTab, onTabChange }) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex lg:hidden justify-around items-center py-2 px-4 z-50">
            {ADMIN_MENU_ITEMS.map((item) => (
                <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex flex-col items-center gap-1 ${activeTab === item.id ? 'text-blue-500' : 'text-slate-500'}`}
                >
                    {item.icon}
                    <span className="text-[10px]">{item.label}</span>
                </button>
            ))}
        </nav>
    );
};
