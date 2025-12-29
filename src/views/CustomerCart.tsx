import React, { useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, X, Check, Edit2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CartItem, ExtraOption, ExtraGroup } from '../types';

export const CustomerCart: React.FC<{ onCheckout: () => void }> = ({ onCheckout }) => {
  const { cart, updateCartQuantity, removeFromCart, updateCartItem, extrasGroups, productExtras, isStoreOpen } = useApp(); // Added isStoreOpen


  // Modal State
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<ExtraOption[]>([]);

  const openEditModal = (item: CartItem) => {
    // Find ExtraOption objects from the names stored in the cart item
    // This is safer than just using the saved names because we need the IDs for the toggle logic
    const currentExtras: ExtraOption[] = [];
    if (item.extras) {
      item.extras.forEach(savedExtra => {
        // Try to find the full option object in any group
        for (const group of extrasGroups) {
          const found = group.options.find(o => o.name === savedExtra.name);
          if (found) {
            currentExtras.push(found);
            break;
          }
        }
      });
    }

    setEditingItem(item);
    setSelectedExtras(currentExtras);
  };

  const closeEditModal = () => {
    setEditingItem(null);
  };

  const handleUpdateExtraQuantity = (group: ExtraGroup, option: ExtraOption, delta: number) => {
    const currentQty = selectedExtras.filter(e => e.id === option.id).length;
    const currentInGroup = selectedExtras.filter(e => group.options.some(o => o.id === e.id)).length;

    if (delta > 0) {
      // Adding

      // Special case: If group only allows 1 item, treat as valid switch (Radio behavior)
      if (group.maxSelection === 1) {
        const others = selectedExtras.filter(e => !group.options.some(o => o.id === e.id));
        setSelectedExtras([...others, option]);
        return;
      }

      // Check Group Max
      if (group.maxSelection > 0 && currentInGroup >= group.maxSelection) {
        alert(`Você só pode escolher até ${group.maxSelection} opções neste grupo.`);
        return;
      }

      // Check Item Max
      const maxQty = option.maxQuantity || 1;
      if (currentQty >= maxQty) {
        if (maxQty > 1) alert(`Máximo de ${maxQty} unidades para este item.`);
        return;
      }

      setSelectedExtras(prev => [...prev, option]);

    } else {
      // Removing
      if (currentQty === 0) return;

      setSelectedExtras(prev => {
        const idx = prev.findIndex(e => e.id === option.id);
        if (idx === -1) return prev;
        const newArr = [...prev];
        newArr.splice(idx, 1);
        return newArr;
      });
    }
  };

  const handleSaveChanges = () => {
    if (!editingItem) return;

    // Validate Minimums - ONLY for groups that are relevant/visible to this product
    const relevantGroups = extrasGroups.filter(g => {
      const hasSpecificExtras = productExtras.some(pe => pe.product_id === editingItem.id);
      if (!hasSpecificExtras) return true; // Show all by default
      return productExtras.some(pe => pe.product_id === editingItem.id && pe.group_id === g.id);
    });

    for (const group of relevantGroups) {
      if (group.options.length === 0) continue; // Skip empty groups

      const count = selectedExtras.filter(e => group.options.some(o => o.id === e.id)).length;
      if (count < group.minSelection) {
        alert(`${group.name}: Selecione pelo menos ${group.minSelection} opção(ões).`);
        return;
      }
    }

    const extrasForCart = selectedExtras.map(e => ({ name: e.name, price: e.price }));
    updateCartItem(editingItem.cartId!, { extras: extrasForCart });
    closeEditModal();
  };

  const subtotal = cart.reduce((acc, item) => {
    const itemBasePrice = Number(item.price) || 0;
    const extrasTotal = item.extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0;
    return acc + ((itemBasePrice + extrasTotal) * item.quantity);
  }, 0);
  const total = subtotal;

  if (cart.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-10 space-y-6 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
          <ShoppingBag size={48} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Seu carrinho está vazio</h2>
          <p className="text-sm text-gray-500 mt-2">Que tal dar uma olhada no nosso cardápio?</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen animate-in slide-in-from-right duration-300">
      <header className="p-6 flex items-center justify-between border-b bg-white sticky top-0 z-10">
        <h1 className="text-xl font-black text-gray-900">Meu Carrinho</h1>
        <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold">{cart.length} itens</span>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-32">
        {cart.map(item => {
          const itemBasePrice = Number(item.price) || 0;
          const extrasTotal = item.extras?.reduce((acc, e) => acc + (Number(e.price) || 0), 0) || 0;
          const unitPrice = itemBasePrice + extrasTotal;
          const finalPrice = unitPrice * item.quantity;

          return (
            <div key={item.cartId} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex gap-4 transition-all hover:shadow-md animate-in slide-in-from-bottom duration-300">
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                    {/* Base Price Display */}
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 mb-2 px-1">
                      <span>Preço do Lanche</span>
                      <span>R$ {itemBasePrice.toFixed(2).replace('.', ',')}</span>
                    </div>

                    {item.extras && item.extras.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.extras.map((ex, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[10px] text-orange-700 bg-orange-50/50 pl-2 pr-1 py-1 rounded-md border border-orange-100/50 group/extra">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateCartItem(item.cartId!, { extras: item.extras?.filter((_, i) => i !== idx) })}
                                className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 transition-colors"
                              >
                                <X size={10} />
                              </button>
                              <span className="font-medium">+ {ex.name}</span>
                            </div>
                            <span className="font-bold">R$ {ex.price.toFixed(2).replace('.', ',')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeFromCart(item.cartId!)} className="text-gray-300 hover:text-red-500 transition-colors ml-2"><Trash2 size={16} /></button>
                </div>

                {/* Exposed Observation Field */}
                <textarea
                  value={item.observation || ''}
                  onChange={e => updateCartItem(item.cartId!, { observation: e.target.value })}
                  placeholder="Alguma observação? (Ex: tirar cebola)"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[10px] text-gray-600 focus:border-orange-200 focus:bg-white outline-none transition-all resize-none h-12 mt-2"
                />

                <div className="flex items-center justify-between mt-3">
                  {/* Customize Button */}
                  <button
                    onClick={() => openEditModal(item)}
                    className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors"
                  >
                    {item.extras && item.extras.length > 0 ? (
                      <>
                        <Edit2 size={12} /> Editar Adicionais
                      </>
                    ) : (
                      <>
                        <Plus size={12} /> Adicionais
                      </>
                    )}
                  </button>

                  <div className="flex items-center bg-gray-50 rounded-full p-1 gap-3 border">
                    <button onClick={() => updateCartQuantity(item.cartId!, -1)} className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 hover:bg-gray-100"><Minus size={12} /></button>
                    <span className="text-xs font-bold text-gray-900">{item.quantity}</span>
                    <button onClick={() => updateCartQuantity(item.cartId!, 1)} className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-sm"><Plus size={12} /></button>
                  </div>
                </div>
                <div className="text-right mt-1">
                  <span className="text-orange-600 font-extrabold text-sm">R$ {finalPrice.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="p-6 bg-white border-t space-y-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-[3rem]">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900 font-bold">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 italic">Taxa de entrega será calculada no checkout</span>
          </div>
          <div className="flex justify-between items-end pt-2 border-t border-dashed">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-2xl font-black text-orange-600">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
        <button
          onClick={onCheckout}
          disabled={!isStoreOpen}
          className={`w-full py-5 rounded-3xl font-black shadow-2xl transition-all transform ${isStoreOpen
            ? 'bg-orange-500 text-white shadow-orange-200 active:scale-95 hover:-translate-y-1'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
            }`}
        >
          {isStoreOpen ? 'Ir para o Checkout' : 'Loja Fechada'}
        </button>
        {!isStoreOpen && (
          <p className="text-center text-xs text-red-500 font-bold mt-2">
            Desculpe, estamos fechados no momento. Confira nosso horário de atendimento.
          </p>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={closeEditModal} />
          <div className="bg-white w-full max-w-md max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col relative animate-in zoom-in-95 fade-in duration-300 overflow-hidden">

            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Personalizar Item</h3>
                <p className="text-xs text-slate-500">{editingItem.name}</p>
              </div>
              <button onClick={closeEditModal} className="bg-gray-200 p-2 rounded-full text-gray-500"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 relative">
              <div className="space-y-6">
                {/* Filter groups relevant to this product */}
                {extrasGroups
                  .filter(g => {
                    const hasSpecificExtras = productExtras.some(pe => pe.product_id === editingItem.id);
                    if (!hasSpecificExtras) return true; // Show all by default if no links exist
                    return productExtras.some(pe => pe.product_id === editingItem.id && pe.group_id === g.id);
                  })
                  .map(group => (
                    <div key={group.id} className="space-y-3">
                      <div className="flex justify-between items-baseline border-b border-gray-100 pb-2">
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm uppercase">{group.name}</h3>
                          <span className="text-xs text-slate-400">
                            {group.minSelection > 0 ? `Min: ${group.minSelection}` : 'Opcional'}
                            {group.maxSelection > 1 ? ` (Máx: ${group.maxSelection})` : ''}
                          </span>
                        </div>
                        <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded">
                          {selectedExtras.filter(e => group.options.some(o => o.id === e.id)).length}/{group.maxSelection}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {group.options.map(option => {
                          const qty = selectedExtras.filter(e => e.id === option.id).length;
                          const isSelected = qty > 0;
                          return (
                            <div key={option.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-white'}`}>
                              <div className="flex-1">
                                <span className={`text-sm font-medium ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>{option.name}</span>
                                <div className="text-orange-600 font-bold text-sm">+ R$ {option.price.toFixed(2).replace('.', ',')}</div>
                              </div>

                              <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 p-1 shadow-sm">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUpdateExtraQuantity(group, option, -1); }}
                                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${qty > 0 ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : 'bg-gray-50 text-gray-300'}`}
                                  disabled={qty === 0}
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="font-bold text-slate-800 w-6 text-center">{qty}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUpdateExtraQuantity(group, option, 1); }}
                                  className="w-8 h-8 flex items-center justify-center rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex flex-col gap-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">Total do Item</span>
                <span className="text-2xl font-black text-orange-600">
                  R$ {((Number(editingItem.price) + selectedExtras.reduce((acc, e) => acc + (Number(e.price) || 0), 0)) * editingItem.quantity).toFixed(2).replace('.', ',')}
                </span>
              </div>
              <button
                onClick={handleSaveChanges}
                className="w-full bg-slate-900 text-white h-16 rounded-2xl font-black text-lg hover:bg-slate-800 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
              >
                <Check size={24} /> Confirmar e Somar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
