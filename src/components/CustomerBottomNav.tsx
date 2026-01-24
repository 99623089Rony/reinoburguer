
import React from 'react';
import { Home, Search, ClipboardList, ShoppingCart, User } from 'lucide-react';

interface CustomerBottomNavProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    cartCount: number;
    ordersBadgeCount: number;
}

export const CustomerBottomNav: React.FC<CustomerBottomNavProps> = ({ activeTab, onTabChange, cartCount, ordersBadgeCount }) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-2 flex justify-between items-center z-50 max-w-md mx-auto">
            <button onClick={() => onTabChange('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-orange-500' : 'text-gray-400'}`}>
                <Home size={20} />
                <span className="text-[10px] font-medium">Início</span>
            </button>
            <button onClick={() => onTabChange('search')} className={`flex flex-col items-center gap-1 ${activeTab === 'search' ? 'text-orange-500' : 'text-gray-400'}`}>
                <Search size={20} />
                <span className="text-[10px] font-medium">Busca</span>
            </button>
            <button onClick={() => onTabChange('orders')} className={`flex flex-col items-center gap-1 relative ${activeTab === 'orders' ? 'text-orange-500' : 'text-gray-400'}`}>
                <ClipboardList size={20} />
                {ordersBadgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                        {ordersBadgeCount}
                    </span>
                )}
                <span className="text-[10px] font-medium">Pedidos</span>
            </button>
            <button onClick={() => onTabChange('cart')} className={`flex flex-col items-center gap-1 relative ${activeTab === 'cart' ? 'text-orange-500' : 'text-gray-400'}`}>
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                        {cartCount}
                    </span>
                )}
                <span className="text-[10px] font-medium">Carrinho</span>
            </button>
            <button onClick={() => onTabChange('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-orange-500' : 'text-gray-400'}`}>
                <User size={20} />
                <span className="text-[10px] font-medium">Perfil</span>
            </button>
        </nav>
    );
};
