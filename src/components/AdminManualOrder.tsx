import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { X, Search, Plus, Minus, Trash2, ShoppingBag, User, Phone, MapPin, Bike, Store, CreditCard, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product, OrderStatus } from '../types';

interface AdminManualOrderProps {
    onBack?: () => void;
    onSuccess: () => void;
}

interface ManualCartItem {
    product: Product;
    quantity: number;
    observation?: string;
    extras: { name: string; price: number }[];
}

export const AdminManualOrder: React.FC<AdminManualOrderProps> = ({ onBack, onSuccess }) => {
    const { products, deliveryFees, storeConfig } = useApp();
    const [step, setStep] = useState(1); // 1: Products, 2: Details
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<ManualCartItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

    // Customer Form
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState<'DELIVERY' | 'PICKUP'>('PICKUP');
    const [address, setAddress] = useState('');
    const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<string>('');
    const [deliveryFee, setDeliveryFee] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
    const [changeAmount, setChangeAmount] = useState('');
    const [orderObservation, setOrderObservation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter Products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, selectedCategory]);

    const categories = useMemo(() => ['Todos', ...Array.from(new Set(products.map(p => p.category)))], [products]);

    // Update fee when neighborhood changes
    useEffect(() => {
        if (deliveryMethod === 'DELIVERY' && selectedNeighborhoodId) {
            const fee = deliveryFees.find(f => f.id === selectedNeighborhoodId);
            if (fee) {
                setDeliveryFee(fee.fee);
            }
        } else if (deliveryMethod === 'PICKUP') {
            setDeliveryFee(0);
        }
    }, [selectedNeighborhoodId, deliveryMethod, deliveryFees]);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, quantity: 1, extras: [] }];
        });
    };

    const updateQuantity = (index: number, delta: number) => {
        setCart(prev => {
            const newCart = [...prev];
            const item = newCart[index];
            item.quantity += delta;
            if (item.quantity <= 0) {
                return newCart.filter((_, i) => i !== index);
            }
            return newCart;
        });
    };

    const cartSubtotal = cart.reduce((acc, item) => {
        const itemBasePrice = Number(item.product.price) || 0;
        const extrasTotal = item.extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0;
        return acc + ((itemBasePrice + extrasTotal) * item.quantity);
    }, 0);

    const cardFee = useMemo(() => {
        if (!storeConfig) return 0;
        // Logic should match CustomerCheckout.tsx: (subtotal + deliveryFee) * percent
        const currentDeliveryFee = deliveryMethod === 'DELIVERY' ? deliveryFee : 0;
        const baseForFee = cartSubtotal + currentDeliveryFee;

        const method = paymentMethod.toLowerCase();
        if (method.includes('crédito')) {
            return baseForFee * ((storeConfig.cardCreditFeePercent || 0) / 100);
        }
        if (method.includes('débito')) {
            return baseForFee * ((storeConfig.cardDebitFeePercent || 0) / 100);
        }
        if (method.includes('pix')) {
            return baseForFee * ((storeConfig.pixFeePercent || 0) / 100);
        }
        return 0;
    }, [paymentMethod, cartSubtotal, deliveryFee, deliveryMethod, storeConfig]);

    const total = cartSubtotal + (deliveryMethod === 'DELIVERY' ? deliveryFee : 0) + cardFee;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0) return alert('Adicione produtos ao carrinho');
        if (!customerName || !customerPhone) return alert('Preencha os dados do cliente');
        if (deliveryMethod === 'DELIVERY' && !address) return alert('Preencha o endereço de entrega');

        setIsSubmitting(true);

        try {
            let finalAddress = deliveryMethod === 'DELIVERY' ? address : 'Retirada no Balcão';

            if (deliveryMethod === 'DELIVERY') {
                const neighborhoodName = deliveryFees.find(df => df.id === selectedNeighborhoodId)?.neighborhood || 'Bairro Personalizado';
                finalAddress += ` | ${neighborhoodName} (Taxa: R$ ${deliveryFee.toFixed(2).replace('.', ',')})`;
            }

            if (orderObservation.trim()) {
                finalAddress += ` | Obs: ${orderObservation}`;
            }

            if (cardFee > 0) {
                finalAddress += ` | Taxa Maquininha: R$ ${cardFee.toFixed(2).replace('.', ',')}`;
            }

            if (paymentMethod === 'Dinheiro' && changeAmount) {
                const change = parseFloat(changeAmount.replace(',', '.')) - total;
                if (change > 0) {
                    finalAddress += ` | Troco p/ ${changeAmount} (Devolver R$ ${change.toFixed(2).replace('.', ',')})`;
                }
            }

            const orderData = {
                customer_name: customerName,
                phone: customerPhone,
                address: finalAddress,
                total: Math.round(total * 100) / 100,
                payment_method: paymentMethod,
                delivery_fee: deliveryMethod === 'DELIVERY' ? deliveryFee : 0,
                card_fee: Math.round(cardFee * 100) / 100,
                items: cart.map(item => ({
                    id: item.product.id,
                    name: item.product.name,
                    price: item.product.price,
                    quantity: item.quantity,
                    extras: item.extras,
                    observation: item.observation
                })),
                status: OrderStatus.PENDING,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase.from('orders').insert([orderData]);
            if (error) throw error;

            for (const item of cart) {
                if (item.product.trackStock) {
                    await supabase.rpc('decrement_stock', { p_id: item.product.id, quantity: item.quantity });
                }
            }

            alert('Pedido criado com sucesso!');
            onSuccess();
        } catch (error: any) {
            console.error('Error creating order:', error);
            alert('Erro ao criar pedido: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full h-[calc(100vh-160px)] min-h-[600px] animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 w-full h-full rounded-3xl flex flex-col md:flex-row overflow-hidden shadow-2xl">

                {/* Left Side - Product Selection */}
                <div className={`flex-1 flex flex-col border-r border-slate-800 ${step === 2 ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-black text-white flex items-center gap-2">
                                <Store className="text-orange-500" /> Novo Pedido
                            </h2>
                            {onBack && (
                                <button onClick={onBack} className="md:hidden p-2 bg-slate-800 rounded-full text-slate-400">
                                    <ArrowLeft size={20} />
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-3">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar produto..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2.5 text-slate-200 text-sm focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start custom-scrollbar bg-slate-900/40">
                        {filteredProducts.map(product => (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="bg-slate-800/50 border border-slate-800 p-3 rounded-xl flex items-center gap-3 hover:border-orange-500/50 hover:bg-slate-800 transition-all text-left group"
                            >
                                <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                    {product.image ? (
                                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <ShoppingBag size={20} className="text-slate-600 group-hover:text-orange-500 transition-colors" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-200 text-sm truncate">{product.name}</p>
                                    <p className="text-orange-500 font-bold text-xs">R$ {product.price.toFixed(2).replace('.', ',')}</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                    <Plus size={16} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Side - Cart & Details */}
                <div className={`w-full md:w-[400px] flex flex-col bg-slate-950 ${step === 1 ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-6 flex-1 flex flex-col overflow-hidden">

                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                <ShoppingBag className="text-blue-500" /> Carrinho ({cart.reduce((a, b) => a + b.quantity, 0)})
                            </h3>
                            {step === 2 && (
                                <button onClick={() => setStep(1)} className="md:hidden p-2 text-slate-400">
                                    <ArrowLeft size={20} />
                                </button>
                            )}
                        </div>

                        {/* Cart Items List */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar mb-6 max-h-[30vh]">
                            {cart.length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
                                    <ShoppingBag size={32} className="mb-2 opacity-50" />
                                    <p className="text-sm font-medium">Carrinho vazio</p>
                                </div>
                            ) : (
                                cart.map((item, idx) => (
                                    <div key={idx} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 text-xs font-bold">
                                                {item.quantity}x
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-200">{item.product.name}</p>
                                                <p className="text-xs text-slate-500 font-medium">R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => updateQuantity(idx, -1)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                                                <Minus size={14} />
                                            </button>
                                            <button onClick={() => updateQuantity(idx, 1)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-400 transition-colors">
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Customer Form */}
                        <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pb-4 pr-1">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Dados do Cliente</h3>

                            <div className="grid grid-cols-1 gap-3">
                                <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:ring-2 ring-blue-500/30 transition-all">
                                    <User size={18} className="text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Nome do Cliente"
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-slate-600 font-medium"
                                    />
                                </div>
                                <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:ring-2 ring-blue-500/30 transition-all">
                                    <Phone size={18} className="text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Telefone"
                                        value={customerPhone}
                                        onChange={e => setCustomerPhone(e.target.value)}
                                        className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-slate-600 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
                                <button
                                    onClick={() => setDeliveryMethod('PICKUP')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${deliveryMethod === 'PICKUP' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Store size={14} /> Retirada
                                </button>
                                <button
                                    onClick={() => setDeliveryMethod('DELIVERY')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${deliveryMethod === 'DELIVERY' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Bike size={14} /> Entrega
                                </button>
                            </div>

                            {deliveryMethod === 'DELIVERY' && (
                                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 focus-within:ring-2 ring-blue-500/30 transition-all">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin size={14} className="text-slate-500" />
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Endereço Completo</label>
                                        </div>
                                        <textarea
                                            placeholder="Rua, número, complemento e bairro..."
                                            value={address}
                                            onChange={e => setAddress(e.target.value)}
                                            className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-slate-600 resize-none h-16 leading-relaxed font-medium"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                                            <p className="text-[9px] text-slate-500 font-bold uppercase mb-1 ml-1">Bairro Ref.</p>
                                            <select
                                                value={selectedNeighborhoodId}
                                                onChange={e => setSelectedNeighborhoodId(e.target.value)}
                                                className="w-full bg-transparent text-xs text-white outline-none border-none font-bold cursor-pointer"
                                            >
                                                <option value="" className="bg-slate-900">Selecione...</option>
                                                {deliveryFees.map(fee => (
                                                    <option key={fee.id} value={fee.id} className="bg-slate-900">
                                                        {fee.neighborhood}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                                            <p className="text-[9px] text-slate-500 font-bold uppercase mb-1 ml-1">Taxa Entrega</p>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-orange-500 font-bold">R$</span>
                                                <input
                                                    type="number"
                                                    value={deliveryFee}
                                                    onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-transparent text-sm font-bold text-white outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 focus-within:ring-2 ring-blue-500/30 transition-all">
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block tracking-wider">Observações do Pedido</label>
                                <textarea
                                    placeholder="Ex: Sem cebola, caprichar no guardanapo..."
                                    value={orderObservation}
                                    onChange={e => setOrderObservation(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-slate-600 resize-none h-14 leading-relaxed font-medium"
                                />
                            </div>

                            <div className="pt-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-3 block tracking-wider">Forma de Pagamento</label>
                                <div className="space-y-2">
                                    <select
                                        value={paymentMethod}
                                        onChange={e => setPaymentMethod(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 ring-blue-500/30 appearance-none cursor-pointer"
                                    >
                                        <option>Dinheiro</option>
                                        <option>Pix</option>
                                        <option>Cartão de Crédito</option>
                                        <option>Cartão de Débito</option>
                                    </select>

                                    {paymentMethod === 'Dinheiro' && (
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 animate-in slide-in-from-top-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[10px] font-black text-emerald-500 uppercase">Troco para quanto?</label>
                                                <div className="flex items-center gap-1 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                                                    <span className="text-xs text-emerald-500 font-bold">R$</span>
                                                    <input
                                                        type="text"
                                                        placeholder="0,00"
                                                        value={changeAmount}
                                                        onChange={e => setChangeAmount(e.target.value)}
                                                        className="w-16 bg-transparent border-none outline-none text-sm font-black text-white placeholder:text-slate-700 text-right"
                                                    />
                                                </div>
                                            </div>
                                            {changeAmount && (() => {
                                                const val = parseFloat(changeAmount.replace(',', '.'));
                                                const change = val - total;
                                                return change > 0 ? (
                                                    <p className="text-xs font-bold text-emerald-400 text-center">
                                                        Troco a devolver: R$ {change.toFixed(2).replace('.', ',')}
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] font-bold text-red-400 text-center uppercase tracking-tighter">Valor insuficiente para o total</p>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Summary */}
                    <div className="p-6 bg-slate-900 border-t border-slate-800">
                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                                <span>Produtos</span>
                                <span>R$ {cartSubtotal.toFixed(2).replace('.', ',')}</span>
                            </div>
                            {deliveryMethod === 'DELIVERY' && deliveryFee > 0 && (
                                <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                                    <span>Taxa de Entrega</span>
                                    <span>+ R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                                </div>
                            )}
                            {cardFee > 0 && (
                                <div className="flex justify-between items-center text-xs text-blue-400 font-bold">
                                    <span>Taxa Maquininha</span>
                                    <span>+ R$ {cardFee.toFixed(2).replace('.', ',')}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-end pt-3 border-t border-slate-800">
                                <p className="text-xs text-slate-400 font-black uppercase">Total do Pedido</p>
                                <p className="text-3xl font-black text-emerald-400">R$ {total.toFixed(2).replace('.', ',')}</p>
                            </div>
                        </div>

                        {step === 1 && (
                            <button
                                onClick={() => {
                                    if (cart.length === 0) return alert('Adicione itens primeiro');
                                    setStep(2);
                                }}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black md:hidden transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                            >
                                Informar Pagamento
                            </button>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || cart.length === 0}
                            className={`w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 ${step === 1 ? 'hidden md:flex' : 'flex'}`}
                        >
                            {isSubmitting ? (
                                <span className="animate-pulse">PROCESSANDO...</span>
                            ) : (
                                <><CheckCircle size={22} /> FINALIZAR PEDIDO</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
