
import React from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, Clock, CheckCircle, Package, Truck } from 'lucide-react';
import { OrderStatus } from '../types';

const OrderTimer: React.FC<{ timestamp: Date; onExpired: () => void }> = ({ timestamp, onExpired }) => {
    const [timeLeft, setTimeLeft] = React.useState(() => {
        const now = new Date();
        const diffSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
        const remaining = 600 - diffSeconds;
        return remaining > 0 ? remaining : 0;
    });

    React.useEffect(() => {
        if (timeLeft <= 0) {
            onExpired();
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, onExpired]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (timeLeft <= 0) return <span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded-md border border-red-100">Expirado</span>;

    return (
        <div className="flex items-center gap-1 text-orange-600 font-bold bg-orange-100 px-2 py-1 rounded-md border border-orange-200 text-xs">
            <Clock size={12} />
            <span>{formatTime(timeLeft)}</span>
        </div>
    );
};

export const CustomerOrders: React.FC = () => {
    const { orders, openPayment, deleteOrder, customerProfile } = useApp();

    // Filter orders by the current customer's phone number
    const myOrders = React.useMemo(() => {
        if (!customerProfile?.phone) return [];

        // Normalize phone for comparison
        const myPhone = customerProfile.phone.replace(/\D/g, '');

        return orders.filter(order => {
            const orderPhone = (order.phone || '').replace(/\D/g, '');
            return orderPhone === myPhone;
        });
    }, [orders, customerProfile]);

    const getStatusIcon = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.AWAITING_PAYMENT: return <Clock size={20} className="text-slate-400 animate-pulse" />;
            case OrderStatus.PENDING: return <Clock size={20} className="text-amber-500" />;
            case OrderStatus.PREPARING: return <Package size={20} className="text-blue-500" />;
            case OrderStatus.DELIVERING: return <Truck size={20} className="text-indigo-500" />;
            case OrderStatus.FINISHED: return <CheckCircle size={20} className="text-emerald-500" />;
        }
    };

    const getStatusText = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.AWAITING_PAYMENT: return 'Aguardando Pagamento';
            case OrderStatus.PENDING: return 'Aguardando Confirmação';
            case OrderStatus.PREPARING: return 'Preparando seu Pedido';
            case OrderStatus.DELIVERING: return 'Saiu para Entrega';
            case OrderStatus.FINISHED: return 'Pedido Entregue';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-32 animate-in fade-in duration-500">
            <header className="bg-white p-6 sticky top-0 z-10 border-b border-gray-100 shadow-sm">
                <h1 className="text-2xl font-black text-slate-900">Meus Pedidos</h1>
                <p className="text-sm text-gray-500">Acompanhe o status da sua entrega</p>
            </header>

            <div className="p-6 space-y-6">
                {myOrders.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <Package size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>Nenhum pedido recente</p>
                    </div>
                ) : (
                    myOrders.map(order => (
                        <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pedido #{order.id.slice(0, 6)}</span>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-gray-400">{order.timestamp.toLocaleTimeString().slice(0, 5)}</p>
                                        {order.status === OrderStatus.AWAITING_PAYMENT && (
                                            <OrderTimer
                                                timestamp={order.timestamp}
                                                onExpired={() => {
                                                    // Optional: auto-delete or just show expired
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                    {getStatusIcon(order.status)}
                                    <span className="text-xs font-bold text-slate-700">{getStatusText(order.status)}</span>
                                </div>
                            </div>

                            {/* Actions for Awaiting Payment */}
                            {order.status === OrderStatus.AWAITING_PAYMENT && (
                                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 flex items-center justify-between mb-2">
                                    <div className="text-xs text-orange-800">
                                        <p className="font-bold">Pagamento Pendente</p>
                                        <p>Finalize para receber seu pedido.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={async () => {
                                                if (window.confirm('Tem certeza que deseja cancelar este pedido?')) {
                                                    await deleteOrder(order.id);
                                                }
                                            }}
                                            className="bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded-lg transition-colors border border-red-100"
                                            title="Cancelar Pedido"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => openPayment(order.id, order.total, order.timestamp)}
                                            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all"
                                        >
                                            Pagar Agora
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Progress Bar */}
                            <div className="relative pt-2">
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${order.status === OrderStatus.AWAITING_PAYMENT ? 'w-[5%] bg-slate-300' :
                                            order.status === OrderStatus.PENDING ? 'w-[10%] bg-amber-400' :
                                                order.status === OrderStatus.PREPARING ? 'w-[50%] bg-blue-500' :
                                                    order.status === OrderStatus.DELIVERING ? 'w-[80%] bg-indigo-500' :
                                                        'w-full bg-emerald-500'
                                            }`}
                                    ></div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-slate-600"><span className="font-bold text-slate-900">{item.quantity}x</span> {item.name}</span>
                                        <span className="text-slate-900 font-bold">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                                <span className="text-sm text-gray-500">Total</span>
                                <span className="text-xl font-black text-orange-600">R$ {order.total.toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
