
import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { CustomerLayout, AdminLayout } from './components/Layout';
import { CustomerHome } from './views/CustomerHome';
import { CustomerOrders } from './views/CustomerOrders';
import { CustomerCart } from './views/CustomerCart';
import { AdminOrders } from './views/AdminOrders';
import { AdminReports } from './views/AdminReports';
import { CustomerCheckout } from './views/CustomerCheckout';
import { SuccessPage } from './views/SuccessPage';
import { AdminLoyalty } from './views/AdminLoyalty';
import { Login } from './views/Login';
import { Register } from './views/Register';
import { AdminMenu } from './views/AdminMenu';
import { AdminSettings } from './views/AdminSettings';
import { AdminPrinter } from './views/AdminPrinter';
import { CustomerSearch } from './views/CustomerSearch';
import { PaymentPix } from './views/PaymentPix';
import { CustomerProfile } from './views/CustomerProfile';
import { AdminRewards } from './views/AdminRewards';
import { AdminFinance } from './views/AdminFinance';
import { AdminTeam } from './views/AdminTeam';
import { AdminManualOrder } from './components/AdminManualOrder';
import { Search, User, Utensils, Ticket, Settings, ClipboardList, Printer, MapPin, Plus } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

const ViewManager: React.FC = () => {
  const { view, setView, customerTab, setCustomerTab, showCheckout, setShowCheckout, paymentData, closePayment, openPayment } = useApp();
  const [adminTab, setAdminTab] = useState('orders');
  const [showSuccess, setShowSuccess] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // Check URL for admin parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setView('admin');
    }

    // Real Supabase Auth Logic
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setView]);

  const toggleView = () => {
    setView(view === 'customer' ? 'admin' : 'customer');
  };

  if (view === 'customer') {
    if (paymentData) {
      return (
        <PaymentPix
          orderId={paymentData.orderId}
          amount={paymentData.amount}
          createdAt={paymentData.createdAt}
          onBack={() => {
            closePayment();
            setShowCheckout(false);
          }}
          onSuccess={() => {
            closePayment();
            setShowSuccess(true);
          }}
        />
      );
    }
    if (showSuccess) {
      return (
        <SuccessPage
          onReset={() => { setShowSuccess(false); setShowCheckout(false); setCustomerTab('home'); }}
          onTrack={() => { setShowSuccess(false); setShowCheckout(false); setCustomerTab('orders'); }}
        />
      );
    }
    if (showCheckout) {
      return (
        <CustomerCheckout
          onBack={() => setShowCheckout(false)}
          onSuccess={() => setShowSuccess(true)}
          onPixPayment={(orderId, amount, createdAt) => {
            openPayment(orderId, amount, createdAt);
          }}
        />
      );
    }

    return (
      <CustomerLayout activeTab={customerTab} onTabChange={setCustomerTab}>
        {/* Toggle Button Removed as per request */}
        {/* <div className="fixed bottom-24 right-4 z-50">
          <button onClick={toggleView} className="bg-orange-600/10 text-orange-600 px-3 py-1.5 rounded-full text-[10px] font-bold border border-orange-200 backdrop-blur-sm shadow-sm">
            Admin View
          </button>
        </div> */}

        {customerTab === 'home' && <CustomerHome />}
        {customerTab === 'cart' && <CustomerCart onCheckout={() => setShowCheckout(true)} />}
        {customerTab === 'search' && <CustomerSearch />}
        {customerTab === 'orders' && <CustomerOrders />}
        {customerTab === 'profile' && <CustomerProfile />}
      </CustomerLayout>
    );
  }

  // Admin View check
  if (!session) {
    if (isRegistering) {
      return <Register onBackToLogin={() => setIsRegistering(false)} />;
    }
    return <Login onLoginSuccess={() => { }} onRegisterClick={() => setIsRegistering(true)} />;
  }

  return (
    <AdminLayout activeTab={adminTab} onTabChange={setAdminTab}>

      {adminTab === 'orders' && <AdminOrders />}
      {adminTab === 'manual_order' && <AdminManualOrder onBack={() => setAdminTab('orders')} onSuccess={() => setAdminTab('orders')} />}
      {adminTab === 'reports' && <AdminReports />}
      {adminTab === 'stock' && <AdminMenu />}
      {adminTab === 'loyalty' && <AdminLoyalty />}
      {adminTab === 'coupons' && <AdminRewards />}
      {adminTab === 'printer' && <AdminPrinter />}
      {adminTab === 'finance' && <AdminFinance />}
      {adminTab === 'team' && <AdminTeam />}
      {adminTab === 'settings' && <AdminSettings />}
    </AdminLayout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <ViewManager />
    </AppProvider>
  );
};

export default App;
