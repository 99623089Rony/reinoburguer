import React, { useState } from 'react';
import { MoreVertical, Phone, MapPin, CreditCard, Clock, CheckCircle, Package, Truck, Filter, Search, RotateCcw, Bike, Sandwich, Trash2, ShoppingBag, Printer, Trophy, Plus, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { OrderStatus, Order } from '../types';
import { PrinterService } from '../lib/PrinterService';
import { AdminManualOrder } from '../components/AdminManualOrder';

type DateFilterType = 'today' | 'week' | 'month' | 'all';

export const AdminOrders: React.FC = () => {
  const { orders, updateOrderStatus, deleteOrder } = useApp();
  const [filter, setFilter] = useState<OrderStatus | 'Todos'>('Todos');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);

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
      {/* Manual Order Modal */}
      {isManualOrderOpen && (
        <AdminManualOrder onClose={() => setIsManualOrderOpen(false)} onSuccess={() => setIsManualOrderOpen(false)} />
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setSelectedOrder(null)}>
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div>
                <h2 className="text-xl font-black text-white">Pedido #{selectedOrder.id.slice(-8).toUpperCase()}</h2>
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

            <div className="h-8 w-px bg-slate-800 mx-2 hidden md:block"></div>

            <button
              onClick={() => setIsManualOrderOpen(true)}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Plus size={16} /> Novo Pedido
            </button>
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
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-5 hover:border-slate-700 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full"></div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-slate-100 font-bold tracking-tight">Pedido #{order.id.slice(0, 8)}</span>
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
                  <div className="flex items-center gap-3 text-slate-400 text-xs text-balance">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0"><MapPin size={14} /></div>
                    <span className="line-clamp-1">{order.address}</span>
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
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Pagamento</p>
                  <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold">
                    <CreditCard size={12} className="text-orange-500" />
                    {order.paymentMethod}
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
