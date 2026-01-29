import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Product, Order, CartItem, OrderStatus, Customer, Category, StoreConfig, ExtraGroup, ExtraOption, OpeningHour, DeliveryFee, PrinterConfig, Reward, CustomerCoupon, Transaction } from '../types';
import { supabase } from '../lib/supabase';
import { PrinterService } from '../lib/PrinterService';
import { WhatsAppService } from '../lib/WhatsAppService';

interface AppContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, extras?: { name: string; price: number }[], observation?: string) => void;
  removeFromCart: (cartId: string) => void;
  updateCartQuantity: (cartId: string, delta: number) => void;
  updateCartItem: (cartId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  view: 'customer' | 'admin';
  setView: (v: 'customer' | 'admin') => void;
  customers: Customer[];
  fetchCustomers: () => Promise<void>;
  updateCustomerPoints: (id: string, points: number) => Promise<void>;
  customerProfile: Partial<Customer> | null;
  updateCustomerProfile: (profile: Partial<Customer>) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>;
  playNotificationSound: () => void;
  playPaymentReminderSound: () => void;
  stopNotificationSound: () => void;
  deleteOrder: (orderId: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  categories: Category[];
  addCategory: (name: string, icon?: string) => Promise<void>;
  updateCategory: (id: string, name: string, icon: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  storeConfig: StoreConfig | null;
  updateStoreConfig: (config: Partial<StoreConfig>) => Promise<void>;
  extrasGroups: ExtraGroup[];
  addExtrasGroup: (name: string, min: number, max: number) => Promise<void>;
  updateExtrasGroup: (id: string, name: string, min: number, max: number) => Promise<void>;
  deleteExtrasGroup: (id: string) => Promise<void>;
  addExtraOption: (groupId: string, name: string, price: number, maxQuantity?: number) => Promise<void>;
  updateExtraOption: (id: string, name: string, price: number, maxQuantity?: number) => Promise<void>;
  deleteExtraOption: (id: string) => Promise<void>;
  productExtras: { product_id: string, group_id: string }[];
  toggleProductExtra: (productId: string, groupId: string, isSelected: boolean) => Promise<void>;
  openingHours: OpeningHour[];
  setOpeningHours: React.Dispatch<React.SetStateAction<OpeningHour[]>>;
  updateOpeningHour: (hour: OpeningHour) => Promise<void>;
  deliveryFees: DeliveryFee[];
  addDeliveryFee: (neighborhood: string, fee: number) => Promise<void>;
  updateDeliveryFee: (fee: DeliveryFee) => Promise<void>;
  deleteDeliveryFee: (id: string) => Promise<void>;
  isStoreOpen: boolean;
  fetchStoreConfig: () => Promise<void>;
  rewards: Reward[];
  addReward: (reward: Omit<Reward, 'id'>) => Promise<void>;
  updateReward: (reward: Reward) => Promise<void>;
  deleteReward: (id: string) => Promise<void>;
  redeemReward: (rewardId: string) => Promise<{ success: boolean; code?: string; error?: string }>;
  myCoupons: CustomerCoupon[];
  fetchMyCoupons: () => Promise<void>;
  resetRanking: () => Promise<void>;
  customerTab: string;
  setCustomerTab: (tab: string) => void;
  showCheckout: boolean;
  setShowCheckout: (show: boolean) => void;
  prefillCoupon: string | null;
  setPrefillCoupon: (code: string | null) => void;
  transactions: Transaction[];
  fetchTransactions: () => Promise<void>;
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  paymentData: { orderId: string; amount: number; createdAt: Date } | null;
  openPayment: (orderId: string, amount: number, createdAt: Date) => void;
  closePayment: () => void;
  loginCustomer: (phone: string) => Promise<boolean>;
  audioUnlocked: boolean; // Exposed to show UI warning
  ordersBadgeCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerTab, setCustomerTab] = useState('home');
  const [showCheckout, setShowCheckout] = useState(false);
  const [prefillCoupon, setPrefillCoupon] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<'customer' | 'admin'>('customer');
  const [loading, setLoading] = useState(true);

  const [customerProfile, setCustomerProfile] = useState<Partial<Customer> | null>(() => {
    const saved = localStorage.getItem('reino_burguer_profile');
    try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
  });

  const fetchCustomers = useCallback(async () => {
    const { data, error } = await supabase.from('customers').select('*').order('total_spent', { ascending: false });
    if (error) console.error('Error fetching customers:', error);
    else {
      setCustomers(data.map((c: any) => ({
        id: c.id, name: c.name, phone: c.phone,
        totalSpent: Number(c.total_spent) || 0,
        points: Number(c.points) || 0,
        pointsMonthly: Number(c.points_monthly) || 0,
        address: c.address
      })));
    }
  }, []);

  const updateCustomerProfile = useCallback(async (profile: Partial<Customer>) => {
    // 1. Merge with current state to ensure we don't lose data (like points) in local state
    const mergedProfile = { ...customerProfile, ...profile };

    setCustomerProfile(mergedProfile);
    localStorage.setItem('reino_burguer_profile', JSON.stringify(mergedProfile));

    // 2. Sync with database
    if (mergedProfile.phone) {
      console.log('🚀 Syncing profile for:', mergedProfile.phone);
      try {
        const payload: any = {
          name: mergedProfile.name,
          phone: mergedProfile.phone,
        };

        // Only save address if it's NOT a pickup
        if (mergedProfile.address && !mergedProfile.address.toUpperCase().startsWith('RETIRADA')) {
          payload.address = mergedProfile.address;
        }

        const { error } = await supabase.from('customers').upsert(payload, { onConflict: 'phone' });

        if (error) throw error;
        console.log('✅ Sync successful');
        fetchCustomers();
      } catch (err: any) {
        console.error('❌ Sync Error:', err);
        alert('Erro ao sincronizar: ' + (err.message || 'Erro desconhecido'));
      }
    }
  }, [customerProfile, fetchCustomers]);



  const [categories, setCategories] = useState<Category[]>([]);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [extrasGroups, setExtrasGroups] = useState<ExtraGroup[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [deliveryFees, setDeliveryFees] = useState<DeliveryFee[]>([]);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [productExtras, setProductExtras] = useState<{ product_id: string, group_id: string }[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [myCoupons, setMyCoupons] = useState<CustomerCoupon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentData, setPaymentData] = useState<{ orderId: string; amount: number; createdAt: Date } | null>(null);
  const [ordersBadgeCount, setOrdersBadgeCount] = useState(0);

  const openPayment = useCallback((orderId: string, amount: number, createdAt: Date) => {
    setPaymentData({ orderId, amount, createdAt });
  }, []);

  const closePayment = useCallback(() => {
    setPaymentData(null);
  }, []);

  const fetchTransactions = useCallback(async () => {
    // Fetch transactions for the last 24 hours
    const { data } = await supabase.from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      const mapped: Transaction[] = data.map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        category: t.category,
        paymentMethod: t.payment_method,
        orderId: t.order_id,
        createdAt: new Date(t.created_at)
      }));
      setTransactions(mapped);
    }
  }, []);

  const addTransaction = useCallback(async (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    const { error } = await supabase.from('transactions').insert([{
      type: t.type,
      amount: t.amount,
      description: t.description,
      category: t.category,
      payment_method: t.paymentMethod,
      order_id: t.orderId
    }]);
    if (error) {
      console.error('❌ Error adding transaction:', error);
      alert('Erro ao adicionar transação: ' + error.message);
    } else {
      fetchTransactions();
    }
  }, [fetchTransactions]);

  const fetchRewards = useCallback(async () => {
    const { data, error } = await supabase.from('rewards').select('*').order('points_cost');
    if (error) {
      console.error('❌ Error fetching rewards:', error);
      return;
    }
    console.log('✅ Rewards fetched:', data.length);
    setRewards(data.map((r: any) => ({
      id: r.id, title: r.title, description: r.description,
      pointsCost: r.points_cost, type: r.type,
      discountValue: r.discount_value, imageUrl: r.image_url,
      productId: r.product_id, isActive: r.is_active
    })));
  }, []);

  const fetchMyCoupons = useCallback(async () => {
    if (!customerProfile?.phone) return;
    const { data, error } = await supabase.from('coupons').select('*, rewards(*)').eq('customer_phone', customerProfile.phone).order('created_at', { ascending: false });
    if (!error) setMyCoupons(data.map((c: any) => ({
      id: c.id, customerPhone: c.customer_phone, rewardId: c.reward_id,
      code: c.code, isUsed: c.is_used, createdAt: new Date(c.created_at),
      reward: c.rewards ? {
        id: c.rewards.id, title: c.rewards.title, description: c.rewards.description,
        pointsCost: c.rewards.points_cost, type: c.rewards.type,
        discountValue: c.rewards.discount_value, imageUrl: c.rewards.image_url, isActive: c.rewards.is_active
      } : undefined
    })));
  }, [customerProfile?.phone]);

  const loginCustomer = useCallback(async (phone: string) => {
    const { data, error } = await supabase.from('customers').select('*').eq('phone', phone).maybeSingle();

    if (data) {
      console.log('✅ Customer found:', data);
      const profile = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        address: data.address,
        points: data.points,
        pointsMonthly: data.points_monthly
      };
      setCustomerProfile(profile);
      localStorage.setItem('reino_burguer_profile', JSON.stringify(profile));
      // We need to wait for state update to trigger fetchOrders via useEffect or call it manually with new profile
      // Since fetchOrders depends on customerProfile state, calling it here might use OLD state.
      // However, we just called setCustomerProfile. React batching...
      // Better to rely on useEffect [customerProfile] to trigger fetchOrders? 
      // Current existing useEffect (line 466) triggers on view change/mounting.
      // Let's manually trigger fetchOrders BUT we need to pass the phone since state isn't updated yet?
      // Actually fetchOrders uses customerProfile from closure? No, it uses dependency.

      // Simpler: Just reload the page? No.
      // We can pass the phone directly to a specialized fetch or just wait.
      // For now, let's just let the user see the success message.
      // Actually, lines 270 (fetchOrders) depends on [customerProfile?.phone]. 
      // So `setCustomerProfile` will trigger a re-render, which *should* re-create `fetchOrders`, 
      // BUT `useEffect` calling `fetchOrders` only runs on `view` change or other big deps.
      // Wait, line 466: `[view, fetchProducts, fetchOrders...]`. 
      // If `fetchOrders` changes (because `customerProfile` changed), `useEffect` runs!
      // So it should be automatic.
      return true;
    }
    return false;
  }, []); // Remove dependencies to avoid circular logic if possible, or leave empty if relying on auto-trigger


  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (!error) setProducts(data.map((p: any) => ({
      ...p,
      inStock: !!p.in_stock,
      highlighted: !!p.highlighted,
      trackStock: !!p.track_stock, // Mapped
      stockQuantity: p.stock_quantity ?? 0, // Mapped
      costPrice: p.cost_price // Mapped
    })));
  }, []);

  const fetchOrders = useCallback(async () => {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

    // SECURITY: Only fetch user's orders if in customer view
    if (view === 'customer') {
      if (!customerProfile?.phone) {
        setOrders([]); // No phone = no orders
        return;
      }
      // Normalize phone for query
      // Assuming DB stores raw or formatted, let's try to match exact first
      // Ideally we should store normalized, but we rely on exact match for now
      query = query.eq('phone', customerProfile.phone);
    }

    // Admin View gets everything
    const { data, error } = await query;

    console.log(`📦 fetchOrders [${view}] result:`, { count: data?.length || 0, error });

    if (error) {
      console.error('❌ fetchOrders error:', error);
      return;
    }
    if (data) {
      setOrders(data.map((o: any) => ({
        id: o.id, customerName: o.customer_name || 'Cliente sem nome', phone: o.phone || 'N/A', address: o.address || 'N/A',
        total: Number(o.total) || 0, paymentMethod: o.payment_method || 'Pix',
        status: (Object.values(OrderStatus).includes(o.status as OrderStatus) ? o.status : OrderStatus.PENDING) as OrderStatus,
        items: Array.isArray(o.items) ? o.items : [], timestamp: new Date(o.created_at),
        couponUsed: o.coupon_used,
        rewardTitle: o.reward_title,
        dailyOrderNumber: o.daily_order_number,
        deliveryFee: Number(o.delivery_fee) || 0,
        cardFee: Number(o.card_fee) || 0
      })));
    }
  }, [view, customerProfile?.phone]);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order');
    if (!error) setCategories(data.map((c: any) => ({ id: c.id, name: c.name, icon: c.icon || 'Sandwich', sortOrder: c.sort_order })));
  }, []);

  const fetchStoreConfig = useCallback(async () => {
    const { data, error } = await supabase.from('store_config').select('*').single();
    if (!error && data) setStoreConfig({
      id: data.id,
      name: data.name,
      coverUrl: data.cover_url,
      logoUrl: data.logo_url,
      primaryColor: data.primary_color,
      whatsapp: data.whatsapp,
      pixKey: data.pix_key,
      address: data.address, // Mapped
      cardFeePercent: data.card_fee_percent, // Deprecated
      cardDebitFeePercent: data.card_debit_fee_percent, // Mapped
      cardCreditFeePercent: data.card_credit_fee_percent, // Mapped
      pixFeePercent: data.pix_fee_percent, // Mapped
      printerSettings: data.printer_settings,
      rankingPeriod: data.ranking_period || 'monthly',
      rankingPrizeId: data.ranking_prize_id,
      loyaltyEnabled: data.loyalty_enabled ?? true,
      rankingEnabled: data.ranking_enabled ?? true,
      rewardsEnabled: data.rewards_enabled ?? true
    });
  }, []);

  const fetchExtrasGroups = useCallback(async () => {
    const { data, error } = await supabase.from('extras_groups').select('*, extras_options(*)').order('name');
    if (!error) setExtrasGroups(data.map((g: any) => ({ id: g.id, name: g.name, minSelection: g.min_selection, maxSelection: g.max_selection, options: g.extras_options.map((o: any) => ({ id: o.id, name: o.name, price: o.price, description: o.description, maxQuantity: o.max_quantity })) })));
  }, []);

  const fetchOpeningHours = useCallback(async () => {
    const { data, error } = await supabase.from('opening_hours').select('*').order('day_of_week');
    if (!error) setOpeningHours(data || []);
  }, []);

  const fetchDeliveryFees = useCallback(async () => {
    const { data, error } = await supabase.from('delivery_fees').select('*').order('neighborhood');
    if (!error) setDeliveryFees(data || []);
  }, []);

  const fetchProductExtras = useCallback(async () => {
    const { data } = await supabase.from('product_extras').select('*');
    setProductExtras(data || []);
  }, []);

  const [audio] = useState(() => {
    const a = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    a.loop = true;
    return a;
  });

  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Unlock audio on first user interaction (required by browsers)
  // Unlock audio on first user interaction (required by browsers)
  useEffect(() => {
    if (view !== 'admin') return;

    const unlockAudio = () => {
      if (!audioUnlocked) {
        // Play silent/muted to unlock
        audio.volume = 0;
        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 1;
          setAudioUnlocked(true);
          console.log('🔊 Audio unlocked for notifications');
        }).catch(() => { });
      }
    };

    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, [audio, audioUnlocked, view]);

  const playNotificationSound = useCallback(() => {
    try {
      console.log('🔔 Playing notification sound...');
      audio.loop = true;
      audio.currentTime = 0;
      audio.play().catch((e) => console.warn('Audio play failed:', e));

      // Also show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🍔 Novo Pedido Chegou!', {
          body: 'Clique para abrir o painel.',
          icon: '/burger-icon.png',
          requireInteraction: true
        }).onclick = () => {
          window.focus();
          setView('admin');
        };
      }
    } catch (e) {
      console.error('Notification error:', e);
    }
  }, [audio, setView]);

  const playPaymentReminderSound = useCallback(() => {
    console.log('💰 playPaymentReminderSound CALLED!');
    console.log('   - view:', view);
    console.log('   - audioUnlocked:', audioUnlocked);

    try {
      // Only play if in admin view and audio is unlocked
      if (view !== 'admin' || !audioUnlocked) {
        console.warn('⚠️ Skipping payment reminder sound (view not admin or audio locked)');
        return;
      }

      console.log('💰 Playing payment reminder sound (Double Beep)...');

      // Play 2 short beeps instead of continuous loop
      audio.currentTime = 0;
      audio.play().catch(e => console.warn('Audio play failed:', e));

      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 500); // Stop after 0.5 seconds

      // Second beep
      setTimeout(() => {
        audio.currentTime = 0;
        audio.play().catch(e => console.warn('Audio play failed:', e));
        setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
        }, 500);
      }, 1000); // Second beep after 1 second

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        console.log('💰 Showing browser notification');
        new Notification('💰 Aguardando Pagamento PIX', {
          body: 'Pedido criado, aguardando confirmação de pagamento.',
          icon: '/burger-icon.png',
          requireInteraction: false // Auto-dismiss
        }).onclick = () => {
          window.focus();
          setView('admin');
        };
      } else {
        console.warn('⚠️ Notification not available or permission not granted');
      }
    } catch (e) {
      console.error('Payment reminder notification error:', e);
    }
  }, [audio, setView, view, audioUnlocked]);

  const stopNotificationSound = useCallback(() => { try { audio.pause(); audio.currentTime = 0; } catch (e) { } }, [audio]);

  // Play sound continuously while there are PENDING orders
  useEffect(() => {
    // Only ring for PENDING orders (Paid Pix or Pay on Delivery)
    // AWAITING_PAYMENT (Unpaid Pix) should be silent
    const hasPendingOrders = orders.some(o => o.status === OrderStatus.PENDING);

    if (hasPendingOrders && audioUnlocked && view === 'admin') {
      // Start playing if not already playing
      if (audio.paused) {
        console.log('🔔 Tocando som - existem pedidos pendentes');
        audio.loop = true;
        audio.currentTime = 0;
        audio.play().catch(e => console.warn('Audio play failed:', e));
      }
    } else {
      // Stop playing if no pending orders
      if (!audio.paused) {
        console.log('🔕 Parando som - não há pedidos pendentes');
        audio.pause();
        audio.currentTime = 0;
      }
    }
  }, [orders, audio, audioUnlocked, view]);

  // Reset badge when entering orders tab
  useEffect(() => {
    if (customerTab === 'orders') {
      setOrdersBadgeCount(0);
    }
  }, [customerTab]);

  // Update badge when orders change
  useEffect(() => {
    if (customerTab !== 'orders' && view === 'customer') {
      const activeOrders = orders.filter(o => o.status !== OrderStatus.FINISHED);

      if (activeOrders.length > 0) {
        setOrdersBadgeCount(activeOrders.length);
      }
    }
  }, [orders, customerTab, view]);

  const syncCustomer = useCallback(async (order: Order) => {
    const { data: existing } = await supabase.from('customers').select('*').eq('phone', order.phone).maybeSingle();
    if (existing) {
      const updateData: any = { total_spent: Number(existing.total_spent) + order.total, name: order.customerName };
      // Only update address if it looks like a delivery address (not Pickup)
      if (order.address && !order.address.toUpperCase().startsWith('RETIRADA')) {
        updateData.address = order.address;
      }
      await supabase.from('customers').update(updateData).eq('id', existing.id);
    } else {
      await supabase.from('customers').insert([{ name: order.customerName, phone: order.phone, address: order.address, total_spent: order.total, points: 0 }]);
    }
    fetchCustomers();
  }, [fetchCustomers]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    stopNotificationSound();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // ✅ NEW: Auto-print when accepting order (status changes to PREPARING)
    if (status === OrderStatus.PREPARING && storeConfig?.printerSettings?.autoPrint) {
      console.log('🖨️ Order accepted! Adding to print queue:', order.id);
      PrinterService.addToQueue(order, storeConfig.printerSettings.paperSize);
    }

    // Award points on completion
    if (status === OrderStatus.FINISHED && order.status !== OrderStatus.FINISHED) {
      const { data: customer } = await supabase.from('customers').select('id, points, points_monthly').eq('phone', order.phone).maybeSingle();
      if (customer) {
        await supabase.from('customers').update({
          points: (customer.points || 0) + Math.floor(order.total),
          points_monthly: (customer.points_monthly || 0) + Math.floor(order.total)
        }).eq('id', customer.id);
        fetchCustomers();
      }
    }

    // Optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));

    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) {
      console.error('Error updating status:', error);
      fetchOrders();
    }
  }, [orders, fetchCustomers, stopNotificationSound, fetchOrders, storeConfig]);

  const updateOrder = useCallback(async (orderId: string, updates: Partial<Order>) => {
    // Map to DB fields
    const mapped: any = {};
    if (updates.customerName !== undefined) mapped.customer_name = updates.customerName;
    if (updates.phone !== undefined) mapped.phone = updates.phone;
    if (updates.address !== undefined) mapped.address = updates.address;
    if (updates.total !== undefined) mapped.total = updates.total;
    if (updates.paymentMethod !== undefined) mapped.payment_method = updates.paymentMethod;
    if (updates.status !== undefined) mapped.status = updates.status;
    if (updates.items !== undefined) mapped.items = updates.items;
    if (updates.deliveryFee !== undefined) mapped.delivery_fee = updates.deliveryFee;
    if (updates.cardFee !== undefined) mapped.card_fee = updates.cardFee;

    const { error } = await supabase.from('orders').update(mapped).eq('id', orderId);
    if (error) {
      console.error('❌ Error updating order:', error);
      alert('Erro ao atualizar pedido: ' + error.message);
    } else {
      console.log('✅ Order updated successfully');
      fetchOrders();
    }
  }, [fetchOrders]);

  const checkStoreStatus = useCallback(() => {
    if (openingHours.length === 0) return setIsStoreOpen(false);
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const todayConfig = openingHours.find(h => h.day_of_week === dayOfWeek);
    if (!todayConfig || todayConfig.is_closed || !todayConfig.open_time || !todayConfig.close_time) return setIsStoreOpen(false);
    const [openH, openM] = todayConfig.open_time.split(':').map(Number);
    const [closeH, closeM] = todayConfig.close_time.split(':').map(Number);
    const openMin = openH * 60 + openM;
    const closeMin = closeH * 60 + closeM;
    if (closeMin < openMin) setIsStoreOpen(currentTime >= openMin || currentTime < closeMin);
    else setIsStoreOpen(currentTime >= openMin && currentTime < closeMin);
  }, [openingHours]);

  useEffect(() => {
    checkStoreStatus();
    const timer = setInterval(checkStoreStatus, 30000);
    return () => clearInterval(timer);
  }, [checkStoreStatus]);

  useEffect(() => {
    setLoading(true);
    // Add view to dependencies to refetch when switching modes
    Promise.all([fetchProducts(), fetchOrders(), fetchCategories(), fetchStoreConfig(), fetchExtrasGroups(), fetchOpeningHours(), fetchDeliveryFees(), fetchCustomers(), fetchProductExtras(), fetchRewards(), fetchMyCoupons(), fetchTransactions()]).then(() => setLoading(false));
  }, [view, fetchProducts, fetchOrders, fetchCategories, fetchStoreConfig, fetchExtrasGroups, fetchOpeningHours, fetchDeliveryFees, fetchCustomers, fetchProductExtras, fetchRewards, fetchMyCoupons, fetchTransactions]);

  useEffect(() => {
    console.log('📡 Setting up Realtime subscription...');
    const channel = supabase.channel('reino_burguer_all_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (p) => {
        console.log('📥 Realtime ORDER event received:', p.eventType, p);
        fetchOrders();

        if (p.eventType === 'INSERT') {
          const o = p.new as any;
          console.log('🆕 INSERT event - Order status:', o.status);
          console.log('🆕 INSERT event - OrderStatus.AWAITING_PAYMENT:', OrderStatus.AWAITING_PAYMENT);
          console.log('🆕 INSERT event - Comparison result:', o.status === OrderStatus.AWAITING_PAYMENT);

          const mapped: Order = { id: o.id, customerName: o.customer_name, phone: o.phone, address: o.address, total: Number(o.total), paymentMethod: o.payment_method, status: o.status, items: o.items || [], timestamp: new Date(o.created_at), couponUsed: o.coupon_used, rewardTitle: o.reward_title, dailyOrderNumber: o.daily_order_number };
          syncCustomer(mapped);

          // Different handling based on order status
          if (o.status === OrderStatus.AWAITING_PAYMENT) {
            // PIX order, not paid yet - different sound and WhatsApp reminder
            console.log('💰 AWAITING_PAYMENT order detected, sending payment reminder...');
            playPaymentReminderSound();

            // Send WhatsApp payment reminder via API (Backend)
            WhatsAppService.sendAutomaticPaymentReminder(mapped, storeConfig?.name);
          } else {
            // Regular order (paid PIX or pay on delivery) - normal notification
            console.log('🔔 Regular order detected, playing normal notification');
            playNotificationSound();
          }

          // ❌ REMOVED: Auto-print on arrival
          // Printing will happen when admin accepts the order (status change to PREPARING)
        } else if (p.eventType === 'UPDATE') {
          const o = p.new as any;

          // If order becomes PENDING (e.g., PIX paid), treat as new order
          if (o.status === OrderStatus.PENDING) {
            playNotificationSound();
            const mapped: Order = { id: o.id, customerName: o.customer_name, phone: o.phone, address: o.address, total: Number(o.total), paymentMethod: o.payment_method, status: o.status, items: o.items || [], timestamp: new Date(o.created_at), couponUsed: o.coupon_used, rewardTitle: o.reward_title, dailyOrderNumber: o.daily_order_number };

            // ❌ REMOVED: Auto-print on PIX payment
            // Printing will happen when admin accepts the order
          }

          if (o.status === OrderStatus.FINISHED) {
            console.log('💰 Order Finished! DB Trigger should handle transaction creation.');
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (p) => { console.log('📥 Realtime CUSTOMERS event:', p.eventType); fetchCustomers(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (p) => { console.log('📥 Realtime PRODUCTS event:', p.eventType); fetchProducts(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCategories)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_config' }, (p) => { console.log('📥 Realtime STORE_CONFIG event:', p.eventType); fetchStoreConfig(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards' }, fetchRewards)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, fetchMyCoupons)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (p) => { console.log('📥 Realtime TRANSACTIONS event:', p.eventType); fetchTransactions(); })
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
      });

    // Fallback: Poll orders every 10 seconds to ensure sync
    const interval = setInterval(() => {
      console.log('🔄 Polling orders (fallback)...');
      fetchOrders();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchProducts, fetchOrders, fetchCategories, fetchStoreConfig, fetchCustomers, playNotificationSound, playPaymentReminderSound, syncCustomer, storeConfig]);

  const resetRanking = useCallback(async () => {
    // 1. Get the #1 customer
    const sorted = [...customers].sort((a, b) => (b.pointsMonthly || 0) - (a.pointsMonthly || 0));
    const winner = sorted[0];

    if (winner && (winner.pointsMonthly || 0) > 0 && storeConfig?.rankingPrizeId) {
      // 2. Generate a coupon for the winner
      const prize = rewards.find(r => r.id === storeConfig.rankingPrizeId);
      if (prize) {
        const code = `REI-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        console.log(`🏆 Awarding prize to ${winner.name}: ${prize.title} (${code})`);

        await supabase.from('coupons').insert([{
          customer_phone: winner.phone,
          reward_id: prize.id,
          code: code,
          is_used: false
        }]);
      }
    }

    // 3. Reset points_monthly for all
    const { error } = await supabase.from('customers').update({ points_monthly: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.error('Error resetting ranking:', error);

    fetchCustomers();
    fetchMyCoupons();
  }, [customers, storeConfig, rewards, fetchCustomers, fetchMyCoupons]);

  // CRUD & Cart Logic (Restored full set)
  const addToCart = useCallback((product: Product, quantity: number = 1, extras: any[] = [], observation: string = '') => {
    setCart(prev => {
      // If it has extras or observation, treat as a unique/new customized item
      if (extras.length > 0 || observation) {
        if (quantity <= 0) return prev;
        return [...prev, { ...product, quantity, extras, observation, cartId: Math.random().toString(36).substr(2, 9) }];
      }

      // Simple item: try to find an existing simple item of the same product to merge
      const idx = prev.findIndex(item => item.id === product.id && (!item.extras || item.extras.length === 0) && !item.observation);

      if (idx !== -1) {
        const newCart = [...prev];
        const newQty = newCart[idx].quantity + quantity;
        if (newQty <= 0) return newCart.filter((_, i) => i !== idx);
        newCart[idx] = { ...newCart[idx], quantity: newQty };
        return newCart;
      }

      if (quantity <= 0) return prev;
      return [...prev, { ...product, quantity, extras, observation, cartId: Math.random().toString(36).substr(2, 9) }];
    });
  }, []);
  const removeFromCart = useCallback((cartId: string) => setCart(p => p.filter(i => i.cartId !== cartId)), []);
  const clearCart = useCallback(() => setCart([]), []);

  return (
    <AppContext.Provider value={{
      products, setProducts, orders, setOrders, cart, addToCart, removeFromCart,
      updateCartQuantity: (id, d) => setCart(p => {
        const item = p.find(i => i.cartId === id);
        if (!item) return p;
        const newQty = item.quantity + d;
        if (newQty <= 0) return p.filter(i => i.cartId !== id);
        return p.map(i => i.cartId === id ? { ...i, quantity: newQty } : i);
      }),
      updateCartItem: (id, u) => setCart(p => p.map(i => i.cartId === id ? { ...i, ...u } : i)),
      clearCart,
      view, setView, customers, fetchCustomers, audioUnlocked,
      updateCustomerPoints: async (id, points) => { await supabase.from('customers').update({ points }).eq('id', id); fetchCustomers(); },
      customerProfile: (customers.find(c => c.phone === customerProfile?.phone))
        ? { ...customerProfile, ...(customers.find(c => c.phone === customerProfile?.phone)) }
        : customerProfile,
      updateCustomerProfile,
      updateOrderStatus, updateOrder, playNotificationSound, playPaymentReminderSound, stopNotificationSound,
      deleteOrder: async (id) => { await supabase.from('orders').delete().eq('id', id); setOrders(p => p.filter(o => o.id !== id)); },
      addProduct: async (p) => {
        const mapped = {
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          image: p.image,
          in_stock: p.inStock,
          highlighted: p.highlighted,
          track_stock: p.trackStock, // Mapped
          stock_quantity: p.stockQuantity, // Mapped
          cost_price: p.costPrice // Mapped
        };
        await supabase.from('products').insert([mapped]);
        fetchProducts();
      },
      updateProduct: async (p) => {
        const mapped: any = {
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          image: p.image,
          in_stock: p.inStock,
          highlighted: p.highlighted,
          track_stock: p.trackStock, // Mapped
          stock_quantity: p.stockQuantity, // Mapped
          cost_price: p.costPrice // Mapped
        };
        await supabase.from('products').update(mapped).eq('id', p.id);
        fetchProducts();
      },
      deleteProduct: async (id) => { await supabase.from('products').delete().eq('id', id); fetchProducts(); },
      categories, addCategory: async (n, i) => { await supabase.from('categories').insert([{ name: n, icon: i || 'Sandwich' }]); fetchCategories(); },
      updateCategory: async (id, n, i) => { await supabase.from('categories').update({ name: n, icon: i }).eq('id', id); fetchCategories(); },
      deleteCategory: async (id) => { await supabase.from('categories').delete().eq('id', id); fetchCategories(); },
      storeConfig, updateStoreConfig: async (c) => {
        console.log('🔧 Updating storeConfig:', c);
        const mapped: any = {};
        if (c.name !== undefined) mapped.name = c.name;
        if (c.coverUrl !== undefined) mapped.cover_url = c.coverUrl;
        if (c.logoUrl !== undefined) mapped.logo_url = c.logoUrl;
        if (c.primaryColor !== undefined) mapped.primary_color = c.primaryColor;
        if (c.whatsapp !== undefined) mapped.whatsapp = c.whatsapp;
        if (c.pixKey !== undefined) mapped.pix_key = c.pixKey;
        if (c.address !== undefined) mapped.address = c.address;
        if (c.cardFeePercent !== undefined) mapped.card_fee_percent = c.cardFeePercent; // Deprecated
        if (c.cardDebitFeePercent !== undefined) mapped.card_debit_fee_percent = c.cardDebitFeePercent; // Mapped
        if (c.cardCreditFeePercent !== undefined) mapped.card_credit_fee_percent = c.cardCreditFeePercent; // Mapped
        if (c.pixFeePercent !== undefined) mapped.pix_fee_percent = c.pixFeePercent; // Mapped
        if (c.printerSettings !== undefined) mapped.printer_settings = c.printerSettings;
        if (c.rankingPeriod !== undefined) mapped.ranking_period = c.rankingPeriod;
        if (c.rankingPrizeId !== undefined) mapped.ranking_prize_id = c.rankingPrizeId;
        if (c.loyaltyEnabled !== undefined) mapped.loyalty_enabled = c.loyaltyEnabled;
        if (c.rankingEnabled !== undefined) mapped.ranking_enabled = c.rankingEnabled;
        if (c.rewardsEnabled !== undefined) mapped.rewards_enabled = c.rewardsEnabled;

        const { error } = await supabase.from('store_config').update(mapped).eq('id', storeConfig?.id);
        if (error) {
          console.error('❌ Error updating storeConfig:', error);
          alert('Erro ao salvar as configurações. Por favor, tente novamente.');
          throw error;
        } else {
          console.log('✅ storeConfig updated successfully');
          setStoreConfig(p => p ? { ...p, ...c } : null);
        }
      },
      extrasGroups, addExtrasGroup: async (n, min, max) => { await supabase.from('extras_groups').insert([{ name: n, min_selection: min, max_selection: max }]); fetchExtrasGroups(); },
      updateExtrasGroup: async (id, n, min, max) => { await supabase.from('extras_groups').update({ name: n, min_selection: min, max_selection: max }).eq('id', id); fetchExtrasGroups(); },
      deleteExtrasGroup: async (id) => { await supabase.from('extras_groups').delete().eq('id', id); fetchExtrasGroups(); },
      addExtraOption: async (gi, n, p, mq = 1) => { await supabase.from('extras_options').insert([{ group_id: gi, name: n, price: p, max_quantity: mq }]); fetchExtrasGroups(); },
      updateExtraOption: async (id, n, p, mq = 1) => { await supabase.from('extras_options').update({ name: n, price: p, max_quantity: mq }).eq('id', id); fetchExtrasGroups(); },
      deleteExtraOption: async (id) => { await supabase.from('extras_options').delete().eq('id', id); fetchExtrasGroups(); },
      productExtras, toggleProductExtra: async (pi, gi, s) => { if (s) await supabase.from('product_extras').insert([{ product_id: pi, group_id: gi }]); else await supabase.from('product_extras').delete().match({ product_id: pi, group_id: gi }); fetchProductExtras(); },
      setOpeningHours, openingHours, updateOpeningHour: async (h) => {
        const { error } = await supabase.from('opening_hours').update({ open_time: h.open_time, close_time: h.close_time, is_closed: h.is_closed }).eq('id', h.id);
        if (error) {
          console.error('❌ Error updating opening hour:', error);
          alert(`Erro ao atualizar horário: ${error.message}`);
          throw error;
        }
        fetchOpeningHours();
      },
      deliveryFees, addDeliveryFee: async (n, f) => { await supabase.from('delivery_fees').insert([{ neighborhood: n, fee: f }]); fetchDeliveryFees(); },
      updateDeliveryFee: async (f) => { await supabase.from('delivery_fees').update({ neighborhood: f.neighborhood, fee: f.fee, is_active: f.is_active }).eq('id', f.id); fetchDeliveryFees(); },
      deleteDeliveryFee: async (id) => { await supabase.from('delivery_fees').delete().eq('id', id); fetchDeliveryFees(); },
      isStoreOpen, fetchStoreConfig,
      rewards,
      addReward: async (r) => {
        console.log('🚀 Adding reward:', r);
        const { error } = await supabase.from('rewards').insert([{ title: r.title, description: r.description, points_cost: r.pointsCost, type: r.type, discount_value: r.discountValue || 0, image_url: r.imageUrl || '', product_id: r.productId, is_active: r.isActive ?? true }]);
        if (error) console.error('❌ Error adding reward:', error);
        fetchRewards();
      },
      updateReward: async (r) => {
        console.log('🚀 Updating reward:', r.id);
        const { error } = await supabase.from('rewards').update({ title: r.title, description: r.description, points_cost: r.pointsCost, type: r.type, discount_value: r.discountValue, image_url: r.imageUrl, product_id: r.productId, is_active: r.isActive }).eq('id', r.id);
        if (error) console.error('❌ Error updating reward:', error);
        fetchRewards();
      },
      deleteReward: async (id) => {
        try {
          console.log('🗑️ Deleting reward:', id);

          // 1. Check/Clear if used in store_config (Ranking Prize)
          if (storeConfig?.rankingPrizeId === id) {
            console.log('⚠️ Reward is Ranking Prize. Clearing from store_config...');
            const { error: configError } = await supabase.from('store_config').update({ ranking_prize_id: null }).eq('id', storeConfig.id);
            if (configError) {
              console.error('❌ Error clearing ranking prize:', configError);
              alert('Erro ao desvincular prêmio do ranking: ' + configError.message);
              return;
            }
            // Update local state immediately
            setStoreConfig(prev => prev ? { ...prev, rankingPrizeId: undefined } : null);
          }

          // 2. Delete linked coupons
          const { error: couponsError } = await supabase.from('coupons').delete().eq('reward_id', id);
          if (couponsError) {
            console.error('❌ Error deleting coupons:', couponsError);
            alert('Erro ao excluir cupons vinculados: ' + couponsError.message);
            return;
          }

          // 3. Delete reward
          const { error } = await supabase.from('rewards').delete().eq('id', id);
          if (error) {
            console.error('❌ Error deleting reward:', error);
            alert('Erro ao excluir recompensa: ' + error.message);
          } else {
            alert('Recompensa excluída com sucesso!');
            fetchRewards();
            fetchStoreConfig();
          }
        } catch (e) {
          console.error('❌ Unexpected error deleting reward:', e);
          alert('Erro inesperado ao excluir.');
        }
      },
      myCoupons, fetchMyCoupons,
      resetRanking,
      transactions, fetchTransactions, addTransaction,
      redeemReward: async (rewardId) => {
        const reward = rewards.find(r => r.id === rewardId);
        if (!reward || !customerProfile?.phone) return { success: false, error: 'Recompensa ou Perfil não encontrado' };

        // Fetch latest points check
        const { data: customer } = await supabase.from('customers').select('points').eq('phone', customerProfile.phone).single();
        if (!customer || customer.points < reward.pointsCost) return { success: false, error: 'Pontos insuficientes' };

        const code = `REINO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const { error: redemptionError } = await supabase.from('coupons').insert([{
          customer_phone: customerProfile.phone,
          reward_id: rewardId,
          code: code,
          is_used: false
        }]);

        if (redemptionError) return { success: false, error: 'Erro ao gerar cupom' };

        // Deduct points
        await supabase.from('customers').update({ points: customer.points - reward.pointsCost }).eq('phone', customerProfile.phone);

        fetchCustomers();
        fetchMyCoupons();
        return { success: true, code };
      },
      customerTab, setCustomerTab,
      showCheckout, setShowCheckout,
      prefillCoupon, setPrefillCoupon,
      paymentData, openPayment, closePayment,
      loginCustomer,
      ordersBadgeCount
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
