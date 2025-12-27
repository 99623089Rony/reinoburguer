import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Check, MapPin, Phone, User, CreditCard, Wallet, Banknote, Clock } from 'lucide-react'; // Added Clock
import { useApp } from '../context/AppContext';
import { OrderStatus } from '../types';

import { supabase } from '../lib/supabase';

export const CustomerCheckout: React.FC<{
  onBack: () => void;
  onSuccess: () => void;
  onPixPayment?: (orderId: string, amount: number) => void;
}> = ({ onBack, onSuccess, onPixPayment }) => {
  const { cart, clearCart, storeConfig, customerProfile, updateCustomerProfile, myCoupons, prefillCoupon, setPrefillCoupon, fetchMyCoupons, isStoreOpen } = useApp(); // Added isStoreOpen
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [loading, setLoading] = useState(false);
  const [changeFor, setChangeFor] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [orderObservation, setOrderObservation] = useState('');

  // Auto-fill and apply prefilled coupon
  React.useEffect(() => {
    if (prefillCoupon) {
      setCouponCode(prefillCoupon);
      const coupon = myCoupons.find(c => c.code.toUpperCase() === prefillCoupon.toUpperCase() && !c.isUsed);
      if (coupon) {
        setAppliedCoupon(coupon);
        setPrefillCoupon(null); // Clear after applying
      }
    }
  }, [prefillCoupon, myCoupons, setPrefillCoupon]);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [isCustomNeighborhood, setIsCustomNeighborhood] = useState(false);
  const [selectedFee, setSelectedFee] = useState<number | null>(null);
  const { deliveryFees } = useApp();

  // VALIDATION LOGIC
  const formatPhone = (val: string) => {
    // Remove everything that is not a number
    let clean = val.replace(/\D/g, '');

    // Limit to 11 digits (DDD + 9 + 8 digits)
    clean = clean.substring(0, 11);

    if (clean.length === 0) return '';

    if (clean.length <= 2) return `(${clean}`;

    if (clean.length <= 7) return `(${clean.substring(0, 2)}) ${clean.substring(2)}`;

    // (XX) XXXXX-XXXX
    if (clean.length === 11) {
      return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7)}`;
    }

    // (XX) XXXX-XXXX (Landline fallback, though less common for mobile apps)
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 6)}-${clean.substring(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  // Helper to validate entire form step 1
  const validateForm = () => {
    // Name: Min 3 chars
    if (!name || name.trim().length < 3) return false;

    // Phone: Min 10 digits clean
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) return false;

    // Address
    if (!street || street.trim().length < 3) return false;
    if (!number || number.trim().length === 0) return false;

    // Neighborhood
    if (!isCustomNeighborhood && selectedFee === null) return false;
    if (isCustomNeighborhood && (!neighborhood || neighborhood.trim().length < 2)) return false;

    return true;
  };
  React.useEffect(() => {
    if (customerProfile) {
      if (!name) setName(customerProfile.name || '');
      if (!phone) setPhone(customerProfile.phone || '');

      if (customerProfile.address && !street && !number && !neighborhood) {
        try {
          const parts = customerProfile.address.split(',');
          if (parts.length >= 2) {
            setStreet(parts[0].trim());

            const rest = parts.slice(1).join(',').trim(); // "123 - Centro"
            const numberParts = rest.split(' - ');

            if (numberParts.length >= 2) {
              setNumber(numberParts[0].trim());
              const hood = numberParts.slice(1).join(' - ').trim();
              const cleanHood = hood.split('|')[0].trim();

              setNeighborhood(cleanHood);

              // Try to find fee matched by name
              const match = deliveryFees.find(df => df.neighborhood.toLowerCase() === cleanHood.toLowerCase() && df.is_active);
              if (match) {
                setSelectedFee(match.fee);
                setIsCustomNeighborhood(false);
              } else {
                // If not found, assume custom
                setIsCustomNeighborhood(true);
                setSelectedFee(0);
              }
            } else {
              setNumber(rest);
            }
          }
        } catch (e) {
          console.log("Error parsing address for autofill", e);
        }
      }
    }
  }, [customerProfile, deliveryFees]); // Run when these change


  const subtotal = cart.reduce((acc, item) => {
    const itemBasePrice = Number(item.price) || 0;
    const extrasTotal = item.extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0;
    return acc + ((itemBasePrice + extrasTotal) * item.quantity);
  }, 0);

  const currentDeliveryFee = selectedFee ?? 0;
  const discount = appliedCoupon?.reward?.discountValue || 0;

  // Calculate Card Fees
  const cardDebitFee = paymentMethod === 'Débito' ? (subtotal + currentDeliveryFee - discount) * ((storeConfig?.cardDebitFeePercent || 0) / 100) : 0;
  const cardCreditFee = paymentMethod === 'Crédito' ? (subtotal + currentDeliveryFee - discount) * ((storeConfig?.cardCreditFeePercent || 0) / 100) : 0;

  const total = Math.max(0, subtotal + currentDeliveryFee - discount + cardDebitFee + cardCreditFee);

  // Block access if store is closed
  if (!isStoreOpen) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 bg-slate-50 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-6">
          <Clock size={48} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Loja Fechada</h2>
        <p className="text-slate-500 mb-8 max-w-xs">
          Nosso horário de atendimento acabou. Por favor, volte amanhã para fazer seu pedido!
        </p>
        <button
          onClick={onBack}
          className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold shadow-xl active:scale-95 transition-all"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  const applyCoupon = () => {
    const coupon = myCoupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase() && !c.isUsed);
    if (coupon) {
      setAppliedCoupon(coupon);
      alert('Cupom aplicado com sucesso!');
    } else {
      alert('Cupom inválido ou já utilizado.');
    }
  };

  const handleNeighborhoodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'CUSTOM') {
      setIsCustomNeighborhood(true);
      setNeighborhood('');
      setSelectedFee(0);
    } else {
      setIsCustomNeighborhood(false);
      const feeObj = deliveryFees.find(df => df.id === value);
      if (feeObj) {
        setNeighborhood(feeObj.neighborhood);
        setSelectedFee(feeObj.fee);
      }
    }
  };

  const handleFinish = async () => {
    if (loading) return;
    setLoading(true);

    try {
      let fullAddress = `${street}, ${number} - ${neighborhood}`;

      // Append Observation
      if (orderObservation.trim()) {
        fullAddress += ` | Obs: ${orderObservation}`;
      }

      let finalPaymentMethod = paymentMethod;
      if (paymentMethod === 'Dinheiro' && changeFor) {
        const changeVal = parseFloat(changeFor.replace(',', '.'));
        const changeAmount = changeVal - total;
        if (changeAmount > 0) {
          finalPaymentMethod = `Dinheiro (Troco p/ ${changeFor} - Devolver R$ ${changeAmount.toFixed(2).replace('.', ',')})`;
        } else {
          finalPaymentMethod = `Dinheiro (Troco para ${changeFor})`;
        }
      }

      console.log('🚀 Enviando pedido...', { name, phone, fullAddress, total, payment: finalPaymentMethod });

      const { data: newOrder, error } = await supabase.from('orders').insert([
        {
          customer_name: name,
          phone: phone,
          address: fullAddress,
          total: total,
          payment_method: finalPaymentMethod,
          status: paymentMethod === 'Pix' ? OrderStatus.AWAITING_PAYMENT : OrderStatus.PENDING,
          items: cart,
          coupon_used: appliedCoupon?.code || null,
          reward_title: appliedCoupon?.reward?.title || null
        }
      ]).select().single();

      console.log('📦 Resultado do pedido:', { newOrder, error });

      if (error) {
        console.error('❌ Error submitting order:', error);
        alert('Erro ao enviar pedido. Tente novamente.');
        return;
      }

      // Mark coupon as used
      if (appliedCoupon) {
        await supabase.from('coupons').update({ is_used: true }).eq('id', appliedCoupon.id);
        fetchMyCoupons();
      }

      // Decrement Stock for tracked items
      for (const item of cart) {
        if (item.trackStock) {
          await supabase.rpc('decrement_stock', { p_id: item.id, quantity: item.quantity });
        }
      }

      // Update local profile with latest data
      updateCustomerProfile({ name, phone, address: fullAddress });

      // If payment is PIX, redirect to PIX payment screen
      if (paymentMethod === 'Pix' && onPixPayment) {
        setLoading(false);
        clearCart();
        onPixPayment(newOrder.id, total);
        return;
      }

      // WhatsApp Redirection (for other payment methods)
      if (storeConfig?.whatsapp) {
        const orderId = newOrder?.id?.slice(-5).toUpperCase() || 'NOVO';
        let message = `================================\n`;
        message += `      NOVO PEDIDO\n`;
        message += `      #REINO${orderId}\n`;
        message += `================================\n`;
        message += `Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
        message += `Hora: ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
        message += `\n`;
        message += `CLIENTE: ${name}\n`;
        message += `TELEFONE: ${phone}\n`;
        message += `ENDERECO: ${fullAddress}\n`;
        message += `\n`;
        message += `--------------------------------\n`;
        message += `ITENS DO PEDIDO\n`;
        message += `--------------------------------\n`;

        cart.forEach((item, index) => {
          const extrasTotal = item.extras?.reduce((sum, e) => sum + e.price, 0) || 0;
          const itemTotal = (item.price + extrasTotal) * item.quantity;

          message += `\n${index + 1}. ${item.name}\n`;
          message += `   Qtd: ${item.quantity}x  Valor: R$ ${itemTotal.toFixed(2).replace('.', ',')}\n`;

          if (item.extras && item.extras.length > 0) {
            message += `   Adicionais:\n`;
            item.extras.forEach(e => {
              message += `   - ${e.name} (+R$ ${e.price.toFixed(2).replace('.', ',')})\n`;
            });
          }

          if (item.observation) {
            message += `   Obs: ${item.observation}\n`;
          }
        });

        message += `\n--------------------------------\n`;
        message += `RESUMO\n`;
        message += `--------------------------------\n`;
        message += `Subtotal ......... R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
        message += `Taxa Entrega ..... R$ ${currentDeliveryFee.toFixed(2).replace('.', ',')}\n`;
        if (discount > 0) message += `Desconto ......... - R$ ${discount.toFixed(2).replace('.', ',')}\n`;
        if (cardDebitFee > 0) message += `Taxa Débito ...... R$ ${cardDebitFee.toFixed(2).replace('.', ',')}\n`;
        if (cardCreditFee > 0) message += `Taxa Crédito ..... R$ ${cardCreditFee.toFixed(2).replace('.', ',')}\n`;
        if (appliedCoupon?.reward) {
          message += `PRÊMIO DO DIA .... ${appliedCoupon.reward.title.toUpperCase()}\n`;
        }
        message += `--------------------------------\n`;
        message += `TOTAL ............ R$ ${total.toFixed(2).replace('.', ',')}\n`;
        message += `================================\n`;
        message += `\n`;
        message += `PAGAMENTO: ${finalPaymentMethod}\n`;
        message += `\n`;
        message += `Pedido confirmado!\n`;
        message += `${storeConfig?.name || 'Reino Burguer'}`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${storeConfig.whatsapp}&text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
      }

      // Only clear cart and show success for non-PIX payments
      clearCart();
      onSuccess();
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 animate-in slide-in-from-right duration-300">
      <header className="sticky top-0 bg-orange-500 text-white p-6 flex items-center gap-4 z-10 shadow-lg">
        <button onClick={onBack} className="p-2 hover:bg-orange-600 rounded-full transition-colors"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold">{step === 1 ? 'Dados de Entrega' : 'Pagamento'}</h1>
      </header>

      <div className="p-6 space-y-8 pb-32">
        {step === 1 ? (
          <div className="space-y-6">
            <section className="space-y-4">
              <h3 className="text-orange-600 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <User size={16} /> Contato
              </h3>
              <div className="space-y-3">
                <div className="group">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-4 mb-1 block">Seu Nome</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Ana Silva"
                    className="w-full bg-white border border-gray-100 p-4 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-gray-300"
                  />
                  {name.length > 0 && name.trim().length < 3 && (
                    <span className="text-[10px] text-red-500 ml-4 font-bold">Nome deve ter pelo menos 3 caracteres</span>
                  )}
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-4 mb-1 block">Telefone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="(99) 99999-9999"
                    maxLength={15}
                    className="w-full bg-white border border-gray-100 p-4 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-gray-300"
                  />
                  {phone.length > 0 && phone.replace(/\D/g, '').length < 10 && (
                    <span className="text-[10px] text-red-500 ml-4 font-bold">Número incompleto</span>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-orange-600 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <MapPin size={16} /> Endereço
              </h3>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 group">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-4 mb-1 block">Rua / Avenida</label>
                  <input
                    type="text"
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    placeholder="Digite o logradouro"
                    className="w-full bg-white border border-gray-100 p-4 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-gray-300"
                  />
                  {street.length > 0 && street.trim().length < 3 && (
                    <span className="text-[10px] text-red-500 ml-4 font-bold">Endereço deve ter pelo menos 3 caracteres</span>
                  )}
                </div>
                <div className="col-span-4 group">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-4 mb-1 block">Número</label>
                  <input
                    type="text"
                    value={number}
                    onChange={e => setNumber(e.target.value)}
                    placeholder="123"
                    className="w-full bg-white border border-gray-100 p-4 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-gray-300"
                  />
                </div>
                <div className="col-span-8 group">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-4 mb-1 block">Bairro</label>

                  {!isCustomNeighborhood ? (
                    <div className="relative">
                      <select
                        onChange={handleNeighborhoodChange}
                        value={deliveryFees.find(df => df.neighborhood === neighborhood)?.id || ''}
                        className="w-full bg-white border border-gray-100 p-4 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none text-slate-700"
                      >
                        <option value="">Selecione seu bairro...</option>
                        {deliveryFees.filter(df => df.is_active).map(df => (
                          <option key={df.id} value={df.id}>
                            {df.neighborhood} (+ R$ {df.fee.toFixed(2).replace('.', ',')})
                          </option>
                        ))}
                        <option value="CUSTOM">Outro / Não encontrei meu bairro</option>
                      </select>
                      <MapPin size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none" />
                    </div>
                  ) : (
                    <div className="relative animate-in slide-in-from-bottom-2 fade-in">
                      <input
                        type="text"
                        value={neighborhood}
                        onChange={e => setNeighborhood(e.target.value)}
                        placeholder="Digite o nome do bairro"
                        className="w-full bg-white border border-gray-100 p-4 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-gray-300"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          setIsCustomNeighborhood(false);
                          setNeighborhood('');
                          setSelectedFee(null);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-500 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Ver lista
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-bold text-slate-800 border-b pb-4">Resumo do Pedido</h3>
              {cart.map(item => {
                const extrasTotal = item.extras?.reduce((sum, e) => sum + e.price, 0) || 0;
                const itemTotal = (item.price + extrasTotal) * item.quantity;
                return (
                  <div key={item.cartId} className="space-y-1">
                    <div className="flex justify-between text-sm text-slate-900 font-bold">
                      <span>{item.quantity}x {item.name}</span>
                      <span>R$ {itemTotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                    {item.extras && item.extras.length > 0 && (
                      <div className="pl-4 text-[10px] text-slate-500">
                        {item.extras.map(e => `+ ${e.name}`).join(', ')}
                      </div>
                    )}
                    {item.observation && <div className="pl-4 text-[10px] text-orange-600 italic">Obs: {item.observation}</div>}
                  </div>
                );
              })}
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-800 font-medium">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Taxa de Entrega</span>
                  <span className={`font-medium ${currentDeliveryFee === 0 ? 'text-orange-500 font-bold' : 'text-slate-800'}`}>
                    {isCustomNeighborhood
                      ? 'A combinar'
                      : (currentDeliveryFee > 0 ? `R$ ${currentDeliveryFee.toFixed(2).replace('.', ',')}` : 'Grátis')}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-bold">
                    <span>Desconto do Cupom</span>
                    <span>- R$ {discount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                {cardDebitFee > 0 && (
                  <div className="flex justify-between text-xs text-orange-400">
                    <span>Taxa Maquininha (Débito)</span>
                    <span>R$ {cardDebitFee.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                {cardCreditFee > 0 && (
                  <div className="flex justify-between text-xs text-orange-400">
                    <span>Taxa Maquininha (Crédito)</span>
                    <span>R$ {cardCreditFee.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black text-slate-900 pt-2">
                  <span>Total</span>
                  <span className="text-orange-600">R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>

            {/* Coupon Input */}
            {(storeConfig?.rewardsEnabled ?? true) && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm">Tem um cupom?</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    placeholder="DIGITE O CÓDIGO"
                    disabled={appliedCoupon}
                    className="flex-1 bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 uppercase font-black tracking-widest placeholder:font-bold placeholder:tracking-normal"
                  />
                  {!appliedCoupon ? (
                    <button
                      onClick={applyCoupon}
                      className="bg-slate-900 text-white px-6 rounded-2xl font-bold text-xs active:scale-95 transition-all"
                    >
                      Aplicar
                    </button>
                  ) : (
                    <button
                      onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                      className="bg-red-50 text-red-500 px-6 rounded-2xl font-bold text-xs active:scale-95 transition-all"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* General Observation */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm">Observações Gerais</h3>
              <textarea
                placeholder="Alguma observação para o pedido? Ex: Campainha não funciona, deixar no portão..."
                value={orderObservation}
                onChange={e => setOrderObservation(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 min-h-[80px] outline-none resize-none placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-800">Método de Pagamento</h3>
              <div className="space-y-3">
                {/* Pix */}
                <div
                  onClick={() => setPaymentMethod('Pix')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${paymentMethod === 'Pix' ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100 hover:border-orange-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center"><Wallet className="text-blue-500" /></div>
                    <span className={`text-sm font-semibold ${paymentMethod === 'Pix' ? 'text-orange-900' : 'text-slate-600'}`}>Pix (Instantâneo e seguro)</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === 'Pix' ? 'border-orange-500 bg-orange-500' : 'border-gray-200'}`}>
                    {paymentMethod === 'Pix' && <Check size={12} className="text-white" />}
                  </div>
                </div>

                {/* Debit Card */}
                <div
                  onClick={() => setPaymentMethod('Débito')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${paymentMethod === 'Débito' ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100 hover:border-orange-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center"><CreditCard className="text-orange-500" /></div>
                    <div>
                      <span className={`block text-sm font-semibold ${paymentMethod === 'Débito' ? 'text-orange-900' : 'text-slate-600'}`}>Cartão de Débito (Entrega)</span>
                      {(storeConfig?.cardDebitFeePercent || 0) > 0 && (
                        <span className="text-[10px] text-orange-600 font-bold block">Taxa: {storeConfig?.cardDebitFeePercent}%</span>
                      )}
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === 'Débito' ? 'border-orange-500 bg-orange-500' : 'border-gray-200'}`}>
                    {paymentMethod === 'Débito' && <Check size={12} className="text-white" />}
                  </div>
                </div>

                {/* Credit Card */}
                <div
                  onClick={() => setPaymentMethod('Crédito')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${paymentMethod === 'Crédito' ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100 hover:border-orange-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center"><CreditCard className="text-indigo-500" /></div>
                    <div>
                      <span className={`block text-sm font-semibold ${paymentMethod === 'Crédito' ? 'text-orange-900' : 'text-slate-600'}`}>Cartão de Crédito (Entrega)</span>
                      {(storeConfig?.cardCreditFeePercent || 0) > 0 && (
                        <span className="text-[10px] text-orange-600 font-bold block">Taxa: {storeConfig?.cardCreditFeePercent}%</span>
                      )}
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === 'Crédito' ? 'border-orange-500 bg-orange-500' : 'border-gray-200'}`}>
                    {paymentMethod === 'Crédito' && <Check size={12} className="text-white" />}
                  </div>
                </div>

                {/* Money */}
                <div className="space-y-3">
                  <div
                    onClick={() => setPaymentMethod('Dinheiro')}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${paymentMethod === 'Dinheiro' ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100 hover:border-orange-200'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center"><Banknote className="text-emerald-500" /></div>
                      <span className={`text-sm font-semibold ${paymentMethod === 'Dinheiro' ? 'text-orange-900' : 'text-slate-600'}`}>Dinheiro na Entrega (Troco)</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === 'Dinheiro' ? 'border-orange-500 bg-orange-500' : 'border-gray-200'}`}>
                      {paymentMethod === 'Dinheiro' && <Check size={12} className="text-white" />}
                    </div>
                  </div>

                  {paymentMethod === 'Dinheiro' && (
                    <div className="animate-in slide-in-from-top-2 duration-200 pl-4 pr-1 space-y-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Troco para quanto?</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                          <input
                            type="text"
                            value={changeFor}
                            onChange={e => setChangeFor(e.target.value)}
                            placeholder="0,00"
                            className="w-full bg-white border border-orange-200 pl-10 pr-4 py-3 rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                          />
                        </div>
                      </div>
                      {changeFor && (
                        <div className="ml-2">
                          {(() => {
                            const val = parseFloat(changeFor.replace(',', '.'));
                            const change = val - total;
                            return change > 0 ? (
                              <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-100">
                                Seu troco será: R$ {change.toFixed(2).replace('.', ',')}
                              </div>
                            ) : (
                              <div className="text-red-500 text-xs font-bold px-2">
                                Valor insuficiente para o total de R$ {total.toFixed(2).replace('.', ',')}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 max-w-md mx-auto z-20">
        <button
          onClick={() => step === 1 ? setStep(2) : handleFinish()}
          disabled={loading || (step === 1 && !validateForm())}
          className={`w-full py-5 rounded-3xl font-black shadow-2xl transition-all flex items-center justify-center gap-2 ${loading || (step === 1 && !validateForm())
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
            : 'bg-orange-500 text-white shadow-orange-200 active:scale-95'
            }`}
        >
          {loading ? (
            <span className="animate-pulse">Enviando Pedido...</span>
          ) : (
            step === 1 ? (
              <>Próximo Passo <ChevronRight size={20} /></>
            ) : (
              <>Finalizar Pedido <Check size={20} /></>
            )
          )}
        </button>
      </div>
    </div >
  );
};
