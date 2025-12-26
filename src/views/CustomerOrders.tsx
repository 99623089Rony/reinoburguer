
import React from 'react';
import { useApp } from '../context/AppContext';
import { Clock, CheckCircle, Package, Truck, Phone, MapPin } from 'lucide-react';
import { OrderStatus } from '../types';

export const CustomerOrders: React.FC = () => {
    const { orders } = useApp();
    // Filter by simulated user phone or just show all for demo
    // For this demo, we can show the most recent orders since we don't have real user auth on customer side yet
    const myOrders = orders.slice(0, 5); // Show last 5 orders

    const getStatusIcon = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.PENDING: return <Clock size={20} className="text-amber-500" />;
            case OrderStatus.PREPARING: return <Package size={20} className="text-blue-500" />;
            case OrderStatus.DELIVERING: return <Truck size={20} className="text-indigo-500" />;
            case OrderStatus.FINISHED: return <CheckCircle size={20} className="text-emerald-500" />;
        }
    };

    const getStatusText = (status: OrderStatus) => {
        switch (status) {
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
                                    <p className="text-xs text-gray-400">{order.timestamp.toLocaleTimeString().slice(0, 5)}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                    {getStatusIcon(order.status)}
                                    <span className="text-xs font-bold text-slate-700">{getStatusText(order.status)}</span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative pt-2">
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${order.status === OrderStatus.PENDING ? 'w-[10%] bg-amber-400' :
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
