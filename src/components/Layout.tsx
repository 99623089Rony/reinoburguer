
import React from 'react';
import { useApp } from '../context/AppContext';
import { AdminSidebar } from './AdminSidebar';
import { CustomerBottomNav } from './CustomerBottomNav';
import { AdminMobileNav } from './AdminMobileNav';
import { AdminHeader } from './AdminHeader';

export const CustomerLayout: React.FC<{ children: React.ReactNode, activeTab: string, onTabChange: (t: string) => void }> = ({ children, activeTab, onTabChange }) => {
  const { cart, ordersBadgeCount } = useApp();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      <main className="flex-1 w-full max-w-md mx-auto relative overflow-x-hidden">
        {children}
      </main>

      <CustomerBottomNav activeTab={activeTab} onTabChange={onTabChange} cartCount={cartCount} ordersBadgeCount={ordersBadgeCount} />
    </div>
  );
};

export const AdminLayout: React.FC<{ children: React.ReactNode, activeTab: string, onTabChange: (t: string) => void }> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="flex h-screen admin-theme selection:bg-blue-500/30 overflow-hidden">
      <AdminSidebar activeTab={activeTab} onTabChange={onTabChange} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-950/50">
        <AdminHeader activeTab={activeTab} />
        <div className="p-8">
          {children}
        </div>
      </main>

      <AdminMobileNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
};
