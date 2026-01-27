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
    const [showErrors, setShowErrors] = useState(false);

    // Neighborhood Autocomplete states
    const [neighborhoodSearch, setNeighborhoodSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isCustomNeighborhood, setIsCustomNeighborhood] = useState(false);

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
                setNeighborhoodSearch(fee.neighborhood);
            }
        } else if (deliveryMethod === 'PICKUP') {
            setDeliveryFee(0);
        }
    }, [selectedNeighborhoodId, deliveryMethod, deliveryFees]);

    const handleNeighborhoodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNeighborhoodSearch(value);
        setIsCustomNeighborhood(false);

        if (value.trim()) {
            const matches = deliveryFees.filter(df =>
                df.is_active &&
                df.neighborhood.toLowerCase().includes(value.toLowerCase())
            );
            setSuggestions(matches);
            setShowSuggestions(true);
        } else {
            setSuggestions(deliveryFees.filter(df => df.is_active));
            setShowSuggestions(true);
        }
    };

    const selectSuggestion = (s: any) => {
        setNeighborhoodSearch(s.neighborhood);
        setSelectedNeighborhoodId(s.id);
        setDeliveryFee(s.fee);
        setShowSuggestions(false);
        setIsCustomNeighborhood(false);
    };

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
        const currentDeliveryFee = deliveryMethod === 'DELIVERY' ? deliveryFee : 0;
        const baseForFee = cartSubtotal + currentDeliveryFee;

        const calculateReverseFee = (base: number, percent: number) => {
            if (percent <= 0 || percent >= 100) return 0;
            // Matches Ton simulator precision (floor)
            const finalTotal = Math.floor((base / (1 - percent / 100)) * 100) / 100;
            return finalTotal - base;
        };

        const method = paymentMethod.toLowerCase();
        if (method.includes('crédito')) {
            return calculateReverseFee(baseForFee, storeConfig.cardCreditFeePercent || 0);
        }
        if (method.includes('débito')) {
            return calculateReverseFee(baseForFee, storeConfig.cardDebitFeePercent || 0);
        }
        if (method.includes('pix')) {
            return calculateReverseFee(baseForFee, storeConfig.pixFeePercent || 0);
        }
        return 0;
    }, [paymentMethod, cartSubtotal, deliveryFee, deliveryMethod, storeConfig]);

    const total = cartSubtotal + (deliveryMethod === 'DELIVERY' ? deliveryFee : 0) + cardFee;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Comprehensive Validation
        const hasCartItems = cart.length > 0;
        const hasCustomerName = customerName.trim() !== '';
        const hasCustomerPhone = customerPhone.trim() !== '';
        const hasDeliveryAddress = deliveryMethod !== 'DELIVERY' || (address.trim() !== '');
        const hasNeighborhood = deliveryMethod !== 'DELIVERY' || (selectedNeighborhoodId || isCustomNeighborhood);

        if (!hasCartItems || !hasCustomerName || !hasCustomerPhone || !hasDeliveryAddress || !hasNeighborhood) {
            setShowErrors(true);
            return;
        }

        setIsSubmitting(true);
        setShowErrors(false);

        try {
            let finalAddress = deliveryMethod === 'DELIVERY' ? address : 'Retirada no Balcão';

            if (deliveryMethod === 'DELIVERY') {
                const neighborhoodName = isCustomNeighborhood
                    ? neighborhoodSearch
                    : deliveryFees.find(df => df.id === selectedNeighborhoodId)?.neighborhood || neighborhoodSearch;
                finalAddress += ` | ${neighborhoodName} (Taxa: R$ ${deliveryFee.toFixed(2).replace('.', ',')})`;
            }

            if (orderObservation.trim()) {
                finalAddress += ` | Obs: ${orderObservation}`;
            }

            if (cardFee > 0) {
                const methodLabel = (() => {
                    const m = paymentMethod.toLowerCase();
                    if (m.includes('pix')) return 'Taxa PIX';
                    if (m.includes('crédito')) return 'Taxa Crédito';
                    if (m.includes('débito')) return 'Taxa Débito';
                    return 'Taxa Maquininha';
                })();
                finalAddress += ` | ${methodLabel}: R$ ${cardFee.toFixed(2).replace('.', ',')}`;
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
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-300">
            {/* Full Screen Header */}
            <div className="h-20 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-8 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 transition-all group">
                        <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                            Novo Pedido
                        </h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Registro de Pedido Manual</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end mr-4">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Total Parcial</span>
                        <span className="text-2xl font-black text-emerald-400">R$ {total.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <button onClick={onBack} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all">
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* Step 1: Product Selection */}
                <div className={`flex-1 flex flex-col md:flex-row overflow-hidden ${step !== 1 ? 'hidden' : 'flex'}`}>
                    {/* Left Side - Products */}
                    <div className="flex-1 flex flex-col border-r border-slate-800">
                        <div className="p-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
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

                        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start custom-scrollbar bg-slate-900/40">
                            {filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="bg-slate-800/50 border border-slate-800 p-4 rounded-xl flex items-center gap-3 hover:border-orange-500/50 hover:bg-slate-800 transition-all text-left group"
                                >
                                    <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center shrink-0 overflow-hidden text-slate-600">
                                        {product.image ? (
                                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <ShoppingBag size={20} className="group-hover:text-orange-500 transition-colors" />
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

                    {/* Right Side - Mini Cart Summary */}
                    <div className="w-full md:w-96 flex flex-col bg-slate-950 border-l border-slate-800">
                        <div className="p-6 flex-1 flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tight">
                                    <ShoppingBag className="text-blue-500" /> Carrinho ({cart.reduce((a, b) => a + b.quantity, 0)})
                                </h3>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar mb-6">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl">
                                        <ShoppingBag size={48} className={`mb-4 ${showErrors && cart.length === 0 ? 'text-red-500 animate-bounce' : 'opacity-20'}`} />
                                        <p className={`text-sm font-bold uppercase tracking-widest ${showErrors && cart.length === 0 ? 'text-red-400' : 'opacity-40'}`}>Carrinho Vazio</p>
                                        {showErrors && cart.length === 0 && <p className="text-[10px] text-red-500 font-bold uppercase mt-2">Adicione itens</p>}
                                    </div>
                                ) : (
                                    cart.map((item, idx) => (
                                        <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 text-xs font-black">
                                                    {item.quantity}x
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-200">{item.product.name}</p>
                                                    <p className="text-xs text-orange-500 font-bold">R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => updateQuantity(idx, -1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                                                    <Minus size={14} />
                                                </button>
                                                <button onClick={() => updateQuantity(idx, 1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors">
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-auto space-y-4 pt-4 border-t border-slate-800">
                                <div className="flex justify-between items-end">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Subtotal</p>
                                    <p className="text-2xl font-black text-white">R$ {cartSubtotal.toFixed(2).replace('.', ',')}</p>
                                </div>
                                <button
                                    onClick={() => cart.length > 0 ? setStep(2) : setShowErrors(true)}
                                    disabled={cart.length === 0}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/10 active:scale-95"
                                >
                                    IDENTIFICAR CLIENTE <ArrowLeft size={20} className="rotate-180" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step 2: Spacious Checkout Form */}
                <div className={`flex-1 overflow-y-auto custom-scrollbar bg-slate-950 p-6 md:p-12 ${step !== 2 ? 'hidden' : 'flex flex-col items-center'}`}>
                    <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-8 gap-4">
                            <button onClick={() => setStep(1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold group">
                                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Voltar para os Produtos
                            </button>
                            <div className="text-left md:text-right">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Resumo do Pedido</p>
                                <p className="text-lg font-bold text-white">{cart.reduce((a, b) => a + b.quantity, 0)} itens — R$ {cartSubtotal.toFixed(2).replace('.', ',')}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Left Column: Customer & Address */}
                            <div className="space-y-8">
                                <section className="space-y-4">
                                    <h3 className="text-sm font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <User size={16} /> Dados do Cliente
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <div className={`bg-slate-900 border ${showErrors && !customerName ? 'border-red-500 ring-4 ring-red-500/10' : 'border-slate-800'} rounded-2xl px-5 py-4 flex items-center gap-4 focus-within:ring-2 ring-blue-500/30 transition-all shadow-inner`}>
                                                <User size={20} className={showErrors && !customerName ? 'text-red-400' : 'text-slate-500'} />
                                                <input
                                                    type="text"
                                                    placeholder="Nome do Cliente"
                                                    value={customerName}
                                                    onChange={e => setCustomerName(e.target.value)}
                                                    className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-slate-600 font-bold"
                                                />
                                            </div>
                                            {showErrors && !customerName && <p className="text-[10px] text-red-500 font-bold uppercase ml-1">Nome é obrigatório</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <div className={`bg-slate-900 border ${showErrors && !customerPhone ? 'border-red-500 ring-4 ring-red-500/10' : 'border-slate-800'} rounded-2xl px-5 py-4 flex items-center gap-4 focus-within:ring-2 ring-blue-500/30 transition-all shadow-inner`}>
                                                <Phone size={20} className={showErrors && !customerPhone ? 'text-red-400' : 'text-slate-500'} />
                                                <input
                                                    type="text"
                                                    placeholder="Telefone / WhatsApp"
                                                    value={customerPhone}
                                                    onChange={e => setCustomerPhone(e.target.value)}
                                                    className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-slate-600 font-bold"
                                                />
                                            </div>
                                            {showErrors && !customerPhone && <p className="text-[10px] text-red-500 font-bold uppercase ml-1">Telefone é obrigatório</p>}
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <MapPin size={16} /> Entrega / Retirada
                                        </h3>
                                        <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
                                            <button
                                                onClick={() => setDeliveryMethod('PICKUP')}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${deliveryMethod === 'PICKUP' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                <Store size={14} /> Balcão
                                            </button>
                                            <button
                                                onClick={() => setDeliveryMethod('DELIVERY')}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${deliveryMethod === 'DELIVERY' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                <Bike size={14} /> Entrega
                                            </button>
                                        </div>
                                    </div>

                                    {deliveryMethod === 'DELIVERY' ? (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                            <div className={`bg-slate-900 border ${showErrors && !address ? 'border-red-500 ring-4 ring-red-500/10' : 'border-slate-800'} rounded-2xl px-5 py-4 focus-within:ring-2 ring-blue-500/30 transition-all shadow-inner`}>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">Endereço Completo *</label>
                                                <textarea
                                                    placeholder="Rua, número, complemento e ponto de referência..."
                                                    value={address}
                                                    onChange={e => setAddress(e.target.value)}
                                                    className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-slate-700 resize-none h-24 leading-relaxed font-bold"
                                                />
                                            </div>
                                            {showErrors && !address && <p className="text-[10px] text-red-500 font-bold uppercase ml-1">Endereço é obrigatório</p>}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="relative">
                                                    <div className={`bg-slate-900 border ${showErrors && !selectedNeighborhoodId && !isCustomNeighborhood ? 'border-red-500 ring-4 ring-red-500/10' : 'border-slate-800'} rounded-2xl px-5 py-4 focus-within:ring-2 ring-blue-500/30 transition-all shadow-inner`}>
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Bairro *</label>
                                                        <input
                                                            type="text"
                                                            value={neighborhoodSearch}
                                                            onChange={handleNeighborhoodChange}
                                                            onFocus={() => {
                                                                setSuggestions(deliveryFees.filter(df => df.is_active));
                                                                setShowSuggestions(true);
                                                            }}
                                                            placeholder="Digitar bairro..."
                                                            className="w-full bg-transparent text-base font-bold text-white outline-none border-none placeholder:text-slate-700"
                                                            autoComplete="off"
                                                        />
                                                    </div>

                                                    {showSuggestions && suggestions.length > 0 && (
                                                        <div className="absolute z-[110] top-[calc(100%+8px)] left-0 right-0 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                                            {suggestions.map(s => (
                                                                <button
                                                                    key={s.id}
                                                                    onClick={() => selectSuggestion(s)}
                                                                    className="w-full text-left px-5 py-4 hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0 flex justify-between items-center group"
                                                                >
                                                                    <span className="font-bold text-slate-200">{s.neighborhood}</span>
                                                                    <span className="text-xs font-black text-orange-500 bg-orange-500/10 px-3 py-1.5 rounded-xl">
                                                                        {s.fee > 0 ? `+ R$ ${s.fee.toFixed(2).replace('.', ',')}` : 'Grátis'}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                            <button
                                                                onClick={() => {
                                                                    setIsCustomNeighborhood(true);
                                                                    setSelectedNeighborhoodId('');
                                                                    setShowSuggestions(false);
                                                                    if (!neighborhoodSearch) setNeighborhoodSearch('Outro Bairro');
                                                                }}
                                                                className="w-full text-left px-5 py-5 bg-slate-800/30 hover:bg-orange-500/10 transition-colors flex flex-col gap-1"
                                                            >
                                                                <span className="font-black text-orange-500 text-[10px] uppercase tracking-[0.2em]">Bairro não listado?</span>
                                                                <span className="font-bold text-slate-200">Definir Manualmente</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                    {showSuggestions && (
                                                        <div className="fixed inset-0 z-[105] bg-transparent" onClick={() => setShowSuggestions(false)} />
                                                    )}
                                                    {showErrors && !selectedNeighborhoodId && !isCustomNeighborhood && <p className="text-[10px] text-red-500 font-bold uppercase ml-1 mt-1">Selecione o bairro</p>}
                                                </div>

                                                <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 shadow-inner">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Taxa de Entrega (R$)</label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg text-orange-500 font-black">R$</span>
                                                        <input
                                                            type="number"
                                                            value={deliveryFee}
                                                            onChange={e => {
                                                                setDeliveryFee(parseFloat(e.target.value) || 0);
                                                                setIsCustomNeighborhood(true);
                                                                setSelectedNeighborhoodId('');
                                                            }}
                                                            className="w-full bg-transparent text-xl font-black text-white outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-10 flex flex-col items-center text-center gap-4 animate-in fade-in slide-in-from-bottom-4 transition-all">
                                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
                                                <Store size={40} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-emerald-400 uppercase tracking-widest">Retirada no Balcão</h4>
                                                <p className="text-sm text-slate-400 font-medium mt-2 max-w-xs">{storeConfig?.address || 'O cliente virá buscar o pedido na loja.'}</p>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </div>

                            {/* Right Column: Payment & Summary */}
                            <div className="space-y-8">
                                <section className="space-y-4">
                                    <h3 className="text-sm font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <CreditCard size={16} /> Forma de Pagamento
                                    </h3>
                                    <div className="space-y-4">
                                        <select
                                            value={paymentMethod}
                                            onChange={e => setPaymentMethod(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-5 text-lg font-black text-white outline-none focus:ring-2 ring-blue-500/30 appearance-none cursor-pointer shadow-lg"
                                        >
                                            <option>Dinheiro</option>
                                            <option>Pix</option>
                                            <option>Cartão de Crédito</option>
                                            <option>Cartão de Débito</option>
                                        </select>

                                        {paymentMethod === 'Dinheiro' && (
                                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 space-y-4 animate-in slide-in-from-top-4">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Troco para quanto?</label>
                                                    <div className="flex items-center gap-2 bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800 shadow-inner">
                                                        <span className="text-sm text-emerald-500 font-black">R$</span>
                                                        <input
                                                            type="text"
                                                            placeholder="0,00"
                                                            value={changeAmount}
                                                            onChange={e => setChangeAmount(e.target.value)}
                                                            className="w-24 bg-transparent border-none outline-none text-lg font-black text-white placeholder:text-slate-800 text-right"
                                                        />
                                                    </div>
                                                </div>
                                                {changeAmount && (() => {
                                                    const val = parseFloat(changeAmount.replace(',', '.'));
                                                    const change = val - total;
                                                    return change > 0 ? (
                                                        <div className="bg-emerald-500/10 rounded-xl py-3 text-center">
                                                            <p className="text-sm font-black text-emerald-400">TROCO: R$ {change.toFixed(2).replace('.', ',')}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] font-black text-red-400 text-center uppercase tracking-widest">Valor insuficiente</p>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-sm font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <ShoppingBag size={16} /> Resumo Financeiro
                                    </h3>
                                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl shadow-black/50 overflow-hidden relative group/total">
                                        <div className="space-y-4 relative z-10">
                                            <div className="flex justify-between items-center text-sm font-bold">
                                                <span className="text-slate-500 uppercase tracking-widest">Subtotal</span>
                                                <span className="text-slate-200">R$ {cartSubtotal.toFixed(2).replace('.', ',')}</span>
                                            </div>
                                            {deliveryMethod === 'DELIVERY' && deliveryFee > 0 && (
                                                <div className="flex justify-between items-center text-sm font-bold">
                                                    <span className="text-slate-500 uppercase tracking-widest text-[10px]">Taxa de Entrega</span>
                                                    <span className="text-white">+ R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                                                </div>
                                            )}
                                            {cardFee > 0 && (
                                                <div className="flex justify-between items-center text-sm font-black animate-in fade-in slide-in-from-right-4">
                                                    <span className="text-orange-500 uppercase tracking-widest text-[10px]">
                                                        {(() => {
                                                            const m = paymentMethod.toLowerCase();
                                                            if (m.includes('pix')) return 'Taxa PIX';
                                                            if (m.includes('crédito')) return 'Taxa Crédito';
                                                            if (m.includes('débito')) return 'Taxa Débito';
                                                            return 'Taxa Maquininha';
                                                        })()}
                                                    </span>
                                                    <span className="text-orange-500">+ R$ {cardFee.toFixed(2).replace('.', ',')}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-6 border-t border-slate-800 flex justify-between items-end relative z-10">
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-1">Total Final</p>
                                                <p className="text-5xl font-black text-emerald-400 tracking-tighter">R$ {total.toFixed(2).replace('.', ',')}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting}
                                            className="w-full py-6 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-3xl font-black shadow-2xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 text-xl uppercase tracking-[0.2em] relative z-10"
                                        >
                                            {isSubmitting ? (
                                                <span className="animate-pulse">PROCESSANDO...</span>
                                            ) : (
                                                <><CheckCircle size={28} /> FINALIZAR PEDIDO</>
                                            )}
                                        </button>

                                        {/* Decorative Background Glow */}
                                        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl group-hover/total:bg-emerald-500/10 transition-colors" />
                                    </div>
                                </section>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-5 focus-within:ring-2 ring-blue-500/30 transition-all shadow-inner">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">Observações do Pedido</label>
                            <textarea
                                placeholder="Alguma instrução especial para a cozinha ou entrega?"
                                value={orderObservation}
                                onChange={e => setOrderObservation(e.target.value)}
                                className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-slate-700 resize-none h-24 leading-relaxed font-bold"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
