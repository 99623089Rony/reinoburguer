import React, { useState } from 'react';
import { MoreVertical, Phone, MapPin, CreditCard, Clock, CheckCircle, Package, Truck, Filter, Search, RotateCcw, Bike, Sandwich, Trash2, ShoppingBag, Printer, Trophy, Plus, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { OrderStatus, Order, Product, CartItem } from '../types';
import { PrinterService } from '../lib/PrinterService';
import { WhatsAppService } from '../lib/WhatsAppService';
import { MessageCircle } from 'lucide-react';

type DateFilterType = 'today' | 'week' | 'month' | 'all' | 'custom';

const OrderEditModal: React.FC<{
  order: Order;
  onClose: () => void;
  onSave: (orderId: string, updates: Partial<Order>, sendToWhatsapp?: boolean) => Promise<void>;
}> = ({ order, onClose, onSave }) => {
  const { products, storeConfig } = useApp();
  const [name, setName] = useState(order.customerName);
  const [phone, setPhone] = useState(order.phone);
  const [address, setAddress] = useState(order.address);
  const [paymentMethod, setPaymentMethod] = useState(order.paymentMethod);
  const [deliveryFee, setDeliveryFee] = useState(order.deliveryFee || 0);
  const [cardFee, setCardFee] = useState(order.cardFee || 0);
  const [items, setItems] = useState(order.items);
  const [loading, setLoading] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualCardFee, setManualCardFee] = useState(false); // Flag to check if user manually edited the fee

  const subtotal = items.reduce((acc, item) => {
    const price = Number(item.price) || 0;
    const extras = item.extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0;
    return acc + (price + extras) * item.quantity;
  }, 0);

  // Auto-calculate card fee
  React.useEffect(() => {
    if (!storeConfig || manualCardFee) return;

    const baseForFee = subtotal + deliveryFee;
    const method = paymentMethod.toLowerCase();
    let newCardFee = 0;

    if (method.includes('crédito')) {
      newCardFee = baseForFee * ((storeConfig.cardCreditFeePercent || 0) / 100);
    } else if (method.includes('débito')) {
      newCardFee = baseForFee * ((storeConfig.cardDebitFeePercent || 0) / 100);
    } else if (method.includes('pix')) {
      newCardFee = baseForFee * ((storeConfig.pixFeePercent || 0) / 100);
    }

    setCardFee(Math.round(newCardFee * 100) / 100);
  }, [subtotal, deliveryFee, paymentMethod, storeConfig, manualCardFee]);

  const total = Math.round((subtotal + deliveryFee + cardFee) * 100) / 100;

  const handleUpdateQuantity = (cartId: string, delta: number) => {
    setItems(prev => prev.map(item =>
      item.cartId === cartId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const handleRemoveItem = (cartId: string) => {
    if (items.length === 1) {
      alert('O pedido deve ter pelo menos um item.');
      return;
    }
    setItems(prev => prev.filter(item => item.cartId !== cartId));
  };

  const handleAddProduct = (product: Product) => {
    const newItem: CartItem = {
      ...product,
      cartId: Math.random().toString(36).substr(2, 9),
      quantity: 1,
      extras: [],
      observation: ''
    };
    setItems(prev => [...prev, newItem]);
    setShowProductSearch(false);
    setSearchTerm('');
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (sendToWhatsapp: boolean = false) => {
    setLoading(true);
    try {
      await onSave(order.id, {
        customerName: name,
        phone,
        address,
        paymentMethod,
        deliveryFee,
        cardFee,
        items,
        total
      }, sendToWhatsapp);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4 md:p-8 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
        {/* Left Side: Form */}
        <div className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white">Editar Pedido</h2>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-all group"
            >
              <RotateCcw size={18} className="rotate-45 group-hover:rotate-0 transition-transform duration-300" />
              <span>Voltar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Cliente</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nome do cliente"
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-bold"
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Telefone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-bold"
              />
            </div>
            <div className="md:col-span-2 space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Endereço / Observações de Entrega</label>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Endereço completo"
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-bold resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Itens do Pedido</label>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.cartId || idx} className="bg-slate-950/50 border border-slate-800/50 p-4 rounded-2xl flex items-center justify-between gap-4 group">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate uppercase tracking-tight">{item.name}</p>
                    {item.extras && item.extras.length > 0 && (
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {item.extras.map(e => e.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-800 rounded-xl p-1 shadow-inner">
                      <button onClick={() => handleUpdateQuantity(item.cartId!, -1)} className="w-8 h-8 rounded-lg hover:bg-slate-700 text-slate-400 transition-all flex items-center justify-center font-bold">-</button>
                      <span className="w-8 text-center text-sm font-black text-white">{item.quantity}</span>
                      <button onClick={() => handleUpdateQuantity(item.cartId!, 1)} className="w-8 h-8 rounded-lg hover:bg-slate-700 text-slate-400 transition-all flex items-center justify-center font-bold">+</button>
                    </div>
                    <button onClick={() => handleRemoveItem(item.cartId!)} className="p-2 text-slate-500 hover:text-red-500 transition-all hover:scale-110">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Product Section */}
              {!showProductSearch ? (
                <button
                  onClick={() => setShowProductSearch(true)}
                  className="w-full py-4 border-2 border-dashed border-slate-800 hover:border-orange-500/50 hover:bg-orange-500/5 rounded-2xl transition-all flex items-center justify-center gap-3 group text-slate-500 hover:text-orange-500"
                >
                  <Plus className="group-hover:rotate-90 transition-transform" size={20} />
                  <span className="text-xs font-black uppercase tracking-widest">Adicionar Item</span>
                </button>
              ) : (
                <div className="bg-slate-950 border border-orange-500/30 rounded-2xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Buscar produto..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 pl-10 pr-4 py-3 rounded-xl text-sm text-white outline-none focus:border-orange-500 transition-all"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleAddProduct(product)}
                        className="w-full text-left p-3 hover:bg-slate-800 rounded-xl transition-all flex justify-between items-center group"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-200 group-hover:text-orange-400">{product.name}</p>
                          <p className="text-[10px] text-slate-500">{product.category}</p>
                        </div>
                        <span className="text-xs font-black text-slate-400">R$ {product.price.toFixed(2)}</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <p className="text-center py-4 text-xs text-slate-600">Nenhum produto encontrado.</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowProductSearch(false)}
                    className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-300"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Totals & Summary */}
        <div className="w-full md:w-80 bg-slate-950/50 border-t md:border-t-0 md:border-l border-slate-800 p-6 md:p-10 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-4">Resumo e Taxas</h3>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Pagamento</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Taxa Ent.</label>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={e => setDeliveryFee(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs font-bold text-white outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Taxa Cart.</label>
                <input
                  type="number"
                  value={cardFee}
                  onChange={e => {
                    setCardFee(Number(e.target.value));
                    setManualCardFee(true);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs font-bold text-white outline-none"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-500 font-bold">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-xs text-orange-500/80 font-bold">
                <span>Taxas</span>
                <span>+ R$ {(deliveryFee + cardFee).toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-1">Total Final</span>
                <span className="text-3xl font-black text-orange-500">R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Apenas Salvar'}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <MessageCircle size={16} /> Salvar e Enviar ZAP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

type OrderEditModalType = typeof OrderEditModal; // For internal reference if needed


export const AdminOrders: React.FC<{ onAddOrder?: () => void }> = ({ onAddOrder }) => {
  const { orders, updateOrderStatus, updateOrder, deleteOrder, storeConfig } = useApp();
  const [filter, setFilter] = useState<OrderStatus | 'Todos'>('Todos');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [search, setSearch] = useState('');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const orderSubtotal = React.useMemo(() => {
    if (!selectedOrder) return 0;
    return selectedOrder.items.reduce((acc, item) => {
      const itemPrice = Number(item.price) || 0;
      const extrasTotal = item.extras?.reduce((sum, ex) => sum + (Number(ex.price) || 0), 0) || 0;
      return acc + (itemPrice + extrasTotal) * item.quantity;
    }, 0);
  }, [selectedOrder]);

  const totalFees = selectedOrder ? selectedOrder.total - orderSubtotal : 0;

  // Helper function to filter by date
  const filterByDate = (orderDate: Date) => {
    const now = new Date();
    const orderDateTime = new Date(orderDate);

    switch (dateFilter) {
      case 'today':
        return orderDateTime.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orderDateTime >= weekAgo;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return orderDateTime >= monthAgo;
      case 'custom': {
        const [y, m, d] = customDate.split('-').map(Number);
        const targetDate = new Date(y, m - 1, d);
        return orderDateTime.toDateString() === targetDate.toDateString();
      }
      case 'all':
        return true;
      default:
        return true;
    }
  };

  const filteredOrders = orders.filter(o => {
    // Hide Awaiting Payment from 'Todos' view
    const matchesStatus = filter === 'Todos'
      ? o.status !== OrderStatus.AWAITING_PAYMENT
      : o.status === filter;
    const searchLower = (search || '').toLowerCase();
    const customerMatch = (o.customerName || '').toLowerCase().includes(searchLower);
    const idMatch = (o.id || '').toLowerCase().includes(searchLower);
    const matchesDate = filterByDate(o.timestamp);

    return matchesStatus && matchesDate && (customerMatch || idMatch);
  });

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.AWAITING_PAYMENT: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      case OrderStatus.PENDING: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case OrderStatus.PREPARING: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case OrderStatus.DELIVERING: return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case OrderStatus.FINISHED: return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.AWAITING_PAYMENT: return <Clock size={12} className="animate-pulse" />;
      case OrderStatus.PENDING: return <Clock size={12} />;
      case OrderStatus.PREPARING: return <Package size={12} />;
      case OrderStatus.DELIVERING: return <Truck size={12} />;
      case OrderStatus.FINISHED: return <CheckCircle size={12} />;
    }
  };

  const nextStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'Iniciar Preparo';
      case OrderStatus.PREPARING: return 'Enviar para Entrega';
      case OrderStatus.DELIVERING: return 'Finalizar Pedido';
      default: return null;
    }
  };

  const getNextStatus = (status: OrderStatus) => {
    if (status === OrderStatus.PENDING) return OrderStatus.PREPARING;
    if (status === OrderStatus.PREPARING) return OrderStatus.DELIVERING;
    if (status === OrderStatus.DELIVERING) return OrderStatus.FINISHED;
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500" onClick={() => setActiveMenu(null)}>

      {/* Edit Modal */}
      {editingOrder && (
        <OrderEditModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={async (orderId, updates, sendToWhatsapp) => {
            const currentOrder = orders.find(o => o.id === orderId);
            if (!currentOrder) return;

            // Merge updates with current order for WhatsAppService
            const updatedOrder = { ...currentOrder, ...updates };

            await updateOrder(orderId, updates);

            if (sendToWhatsapp) {
              WhatsAppService.sendOrder(updatedOrder as Order, storeConfig?.name);
            }
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setSelectedOrder(null)}>
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div>
                <h2 className="text-xl font-black text-white">Pedido #{selectedOrder.dailyOrderNumber || selectedOrder.id.slice(-8).toUpperCase()}</h2>
                <p className="text-xs text-slate-500">{new Date(selectedOrder.timestamp).toLocaleString('pt-BR')}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                <RotateCcw size={20} className="rotate-45" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">Informações do Cliente</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400"><Search size={18} /></div>
                      <div>
                        <p className="text-xs text-slate-500">Nome</p>
                        <p className="text-sm font-bold text-white">{selectedOrder.customerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400"><Phone size={18} /></div>
                      <div>
                        <p className="text-xs text-slate-500">Telefone</p>
                        <p className="text-sm font-bold text-white">{selectedOrder.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Endereço de Entrega</h3>
                  <div className="flex items-start gap-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                    <MapPin className="mt-1 text-slate-500 shrink-0" size={20} />
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">{selectedOrder.address}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Itens do Pedido ({selectedOrder.items.length})</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => {
                    const itemBasePrice = Number(item.price) || 0;
                    const extrasTotal = item.extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0;
                    const itemPrice = (itemBasePrice + extrasTotal) * item.quantity;
                    return (
                      <div key={idx} className="bg-slate-950/30 border border-slate-800/30 p-4 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-orange-600/10 text-orange-500 flex items-center justify-center font-black text-xs">{item.quantity}x</span>
                            <span className="font-bold text-white">{item.name}</span>
                          </div>
                          <span className="text-sm font-black text-slate-100">R$ {itemPrice.toFixed(2).replace('.', ',')}</span>
                        </div>
                        {item.extras && item.extras.length > 0 && (
                          <div className="pl-11 space-y-1">
                            {item.extras.map((ex, i) => (
                              <div key={i} className="text-[10px] text-slate-500 flex justify-between">
                                <span>+ {ex.name}</span>
                                <span>R$ {ex.price.toFixed(2).replace('.', ',')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {item.observation && (
                          <div className="mt-3 pl-11">
                            <div className="bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg text-[10px] text-amber-500/80 italic">
                              <strong>Obs:</strong> {item.observation}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Método de Pagamento</p>
                  <div className="flex items-center gap-2 text-white font-bold">
                    <CreditCard size={18} className="text-orange-500" />
                    {selectedOrder.paymentMethod}
                  </div>
                </div>
                {selectedOrder.rewardTitle && (
                  <div className="bg-orange-500/10 border border-orange-500/20 p-2 px-3 rounded-lg flex items-center gap-3">
                    <Trophy size={16} className="text-orange-500" />
                    <div>
                      <p className="text-[10px] text-orange-500 uppercase tracking-widest font-black mb-0.5">Prêmio do Dia</p>
                      <p className="text-white font-black text-sm uppercase tracking-tight">{selectedOrder.rewardTitle}</p>
                    </div>
                  </div>
                )}
                {selectedOrder.couponUsed && !selectedOrder.rewardTitle && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 px-3 rounded-lg">
                    <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mb-1">Cupom Utilizado</p>
                    <p className="text-white font-black text-sm">{selectedOrder.couponUsed}</p>
                  </div>
                )}
                <div className="text-right">
                  <div className="flex flex-col items-end gap-0.5 mb-2">
                    <p className="text-[10px] text-slate-500 font-bold">SUBTOTAL: R$ {orderSubtotal.toFixed(2).replace('.', ',')}</p>
                    {selectedOrder.deliveryFee ? (
                      <p className="text-[10px] text-orange-500 font-bold">TAXA ENTREGA: + R$ {selectedOrder.deliveryFee.toFixed(2).replace('.', ',')}</p>
                    ) : null}
                    {selectedOrder.cardFee ? (
                      <p className="text-[10px] text-orange-500 font-bold">
                        {selectedOrder.paymentMethod.toLowerCase().includes('pix') ? 'TAXA PIX' : 'TAXA MAQUININHA'}: + R$ {selectedOrder.cardFee.toFixed(2).replace('.', ',')}
                      </p>
                    ) : null}
                    {!selectedOrder.deliveryFee && !selectedOrder.cardFee && totalFees > 0.05 && (
                      <p className="text-[10px] text-orange-500 font-bold">TAXAS: + R$ {totalFees.toFixed(2).replace('.', ',')}</p>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Geral</p>
                  <p className="text-3xl font-black text-orange-500">R$ {selectedOrder.total.toFixed(2).replace('.', ',')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex flex-col md:flex-row gap-3">
              <button
                onClick={() => PrinterService.printOrder(selectedOrder)}
                className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <Printer size={18} /> Imprimir Recibo
              </button>

              <button
                onClick={() => WhatsAppService.sendOrder(selectedOrder, storeConfig?.name)}
                className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} /> Enviar Pedido
              </button>

              {nextStatusLabel(selectedOrder.status) ? (
                <button
                  onClick={() => {
                    const next = getNextStatus(selectedOrder.status);
                    if (next) updateOrderStatus(selectedOrder.id, next);
                    setSelectedOrder(null);
                  }}
                  className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black shadow-xl shadow-orange-900/10 transition-all flex items-center justify-center gap-2"
                >
                  {nextStatusLabel(selectedOrder.status)} <CheckCircle size={20} />
                </button>
              ) : (
                <button onClick={() => setSelectedOrder(null)} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black transition-all">
                  Fechar Verificação
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Status Filter and Search Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <button
              onClick={onAddOrder}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black flex items-center gap-2 shadow-lg shadow-blue-900/40 transition-all active:scale-95 shrink-0"
            >
              <Plus size={18} /> Novo Pedido
            </button>
            <div className="w-px h-8 bg-slate-800 shrink-0 mx-2 hidden md:block"></div>
            {['Todos', ...Object.values(OrderStatus)].map(s => (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); setFilter(s as any); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border ${filter === s ? 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-900/20' : 'text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
              >
                {s === 'Todos' ? 'Todos Status' : s}
              </button>
            ))}
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Buscar por nome ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 text-sm"
            />
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex items-center gap-2 text-slate-500 shrink-0">
            <Calendar size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Período:</span>
          </div>
          {([
            { value: 'today', label: 'Hoje' },
            { value: 'week', label: 'Última Semana' },
            { value: 'month', label: 'Último Mês' },
            { value: 'custom', label: 'Por Data' },
            { value: 'all', label: 'Todos' }
          ] as { value: DateFilterType; label: string }[]).map(({ value, label }) => (
            <button
              key={value}
              onClick={(e) => { e.stopPropagation(); setDateFilter(value); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${dateFilter === value
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20'
                : 'text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-300'
                }`}
            >
              {label}
            </button>
          ))}

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          )}
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-5 hover:border-slate-700 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full"></div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-slate-100 font-bold tracking-tight">Pedido #{order.dailyOrderNumber || order.id.slice(0, 8)}</span>
                <div className={`px-3 py-1 rounded-full border text-[10px] font-bold flex items-center gap-2 uppercase tracking-wide ${getStatusStyle(order.status)}`}>
                  {getStatusIcon(order.status)}
                  <span>{order.status}</span>
                </div>
                {order.rewardTitle ? (
                  <div className="px-2 py-1 rounded bg-orange-500/10 text-orange-500 text-[8px] font-black border border-orange-500/20 uppercase tracking-widest flex items-center gap-1">
                    <Trophy size={8} /> PRÊMIO
                  </div>
                ) : order.couponUsed && (
                  <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black border border-emerald-500/20 uppercase tracking-widest">
                    CUPOM
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === order.id ? null : order.id);
                  }}
                  className="p-1 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  <MoreVertical size={20} />
                </button>

                {activeMenu === order.id && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <Search size={14} /> Ver Detalhes
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        PrinterService.printOrder(order);
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-green-600/10 hover:text-green-400 transition-colors flex items-center gap-2 border-t border-slate-700"
                    >
                      <Printer size={14} /> Imprimir Recibo
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingOrder(order);
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-orange-600/10 hover:text-orange-400 transition-colors flex items-center gap-2 border-t border-slate-700"
                    >
                      <Plus size={14} className="rotate-45" /> Editar Pedido
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        WhatsAppService.sendOrder(order, storeConfig?.name);
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-emerald-600/10 hover:text-emerald-400 transition-colors flex items-center gap-2 border-t border-slate-700"
                    >
                      <MessageCircle size={14} /> Enviar WhatsApp
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Tem certeza que deseja excluir este pedido?')) {
                          deleteOrder(order.id);
                        }
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors border-t border-slate-700 flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Excluir Pedido
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div
                className="cursor-pointer group/customer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedOrder(order);
                }}
              >
                <h4 className="text-slate-100 font-bold mb-3 group-hover/customer:text-orange-500 transition-colors uppercase tracking-tight">{order.customerName}</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-slate-400 text-xs">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500"><Phone size={14} /></div>
                    {order.phone}
                  </div>
                  <div className="flex items-start gap-3 text-slate-400 text-xs text-balance">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 mt-0.5"><MapPin size={14} /></div>
                    <span className="break-words leading-tight">{order.address}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 rounded-xl p-3 space-y-2">
                {order.items.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="text-[11px] text-slate-400 flex justify-between">
                    <span className="truncate pr-2">{item.quantity}x {item.name}</span>
                    <span className="shrink-0 text-slate-600">...</span>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                    className="text-[10px] text-blue-500 font-bold hover:underline"
                  >
                    + {order.items.length - 2} itens... Ver Tudo
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total</p>
                  <p className="text-slate-100 font-black text-lg">R$ {order.total.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Pagamento</p>
                  <div className="flex items-start gap-2 text-slate-200 text-[10px] font-semibold">
                    <CreditCard size={12} className="text-orange-500 shrink-0 mt-0.5" />
                    <span className="break-words leading-tight">{order.paymentMethod}</span>
                  </div>
                </div>
              </div>
            </div>

            {nextStatusLabel(order.status) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const next = getNextStatus(order.status);
                  if (next) updateOrderStatus(order.id, next);
                }}
                className="w-full py-3.5 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-900/20"
              >
                {nextStatusLabel(order.status)}
              </button>
            )}
          </div>
        ))}
        {filteredOrders.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto text-slate-700">
              <ShoppingBag size={40} />
            </div>
            <p className="text-slate-500 font-bold">Nenhum pedido encontrado com esses critérios.</p>
          </div>
        )}
      </div>
    </div>
  );
};
