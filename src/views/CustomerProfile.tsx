import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Award, Save, Check, Ticket, Tag, Package } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CustomerProfile: React.FC = () => {
    const { customerProfile, updateCustomerProfile, rewards, myCoupons, redeemReward, customers, products, addToCart, setCustomerTab, setShowCheckout, setPrefillCoupon, loginCustomer } = useApp();

    // Controlled form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: ''
    });

    const [isEditing, setIsEditing] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isRecovering, setIsRecovering] = useState(false);
    const [recoveryPhone, setRecoveryPhone] = useState('');

    // Sync form with profile when NOT editing
    useEffect(() => {
        if (!isEditing) {
            setFormData({
                name: customerProfile?.name || '',
                phone: customerProfile?.phone || '',
                address: customerProfile?.address || ''
            });
            // If profile is empty, start in edit mode
            if (!customerProfile?.name) {
                setIsEditing(true);
            }
        }
    }, [customerProfile, isEditing]);

    const handleSave = async () => {
        await updateCustomerProfile(formData);
        setIsEditing(false);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    return (
        <div className="p-6 space-y-8 pb-32 animate-in fade-in duration-500">
            {/* Loyalty Card */}
            <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl border border-slate-800">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />

                <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-orange-600/20 flex items-center justify-center border-2 border-orange-500 shadow-xl">
                        <Award size={32} className="text-orange-500" />
                    </div>

                    <div className="text-center space-y-1">
                        <h2 className="text-4xl font-black">{customerProfile?.points || 0}</h2>
                        <p className="text-orange-500 font-bold text-[10px] uppercase tracking-widest">Reino Pontos</p>
                    </div>

                    <div className="w-full bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 backdrop-blur-sm">
                        <p className="text-slate-400 text-[10px] text-center uppercase font-bold tracking-tight">
                            Ganhe 1 ponto a cada R$ 1,00 gasto
                        </p>
                    </div>
                </div>
            </div>

            {/* Ranking Position */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-6 shadow-xl border border-slate-700 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-orange-500/10 transition-all duration-500" />
                <div className="flex items-center justify-between relative z-10">
                    <div className="space-y-1">
                        <p className="text-orange-500/80 text-[10px] font-black uppercase tracking-[0.2em]">Ranking Mensal</p>
                        <h4 className="text-white font-black text-xl flex items-center gap-2">
                            {(() => {
                                const pos = [...customers].sort((a, b) => b.pointsMonthly - a.pointsMonthly).findIndex(c => c.phone === customerProfile?.phone) + 1;
                                if (pos === 0) return '---';
                                if (pos === 1) return '👑 1º Lugar (Rei)';
                                return `${pos}º Lugar`;
                            })()}
                        </h4>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-500 text-[10px] font-bold uppercase">Este Mês</p>
                        <p className="text-slate-300 font-bold">{customerProfile?.pointsMonthly || 0} pts</p>
                    </div>
                </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-slate-900 font-black text-lg flex items-center gap-2">
                        <User size={20} className="text-orange-500" /> Seus Dados
                    </h3>
                    {!isEditing && !isRecovering && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsRecovering(true)}
                                className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                            >
                                Recuperar Conta
                            </button>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-[10px] font-bold text-orange-600 uppercase bg-orange-100 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                            >
                                Alterar
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                    {isRecovering ? (
                        <div className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Seu WhatsApp</label>
                                <input
                                    type="text"
                                    value={recoveryPhone}
                                    onChange={e => {
                                        let v = e.target.value.replace(/\D/g, '');
                                        if (v.length > 11) v = v.slice(0, 11);
                                        if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                                        if (v.length > 9) v = `${v.slice(0, 10)}-${v.slice(10)}`;
                                        setRecoveryPhone(v);
                                    }}
                                    placeholder="(00) 00000-0000"
                                    maxLength={15}
                                    className="w-full bg-gray-50 border border-transparent p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all placeholder:text-gray-300"
                                />
                                <p className="text-[10px] text-slate-400 ml-2">Digite o número usado em pedidos anteriores para recuperar seus pontos e histórico.</p>
                            </div>
                            <button
                                onClick={async () => {
                                    if (!recoveryPhone || recoveryPhone.length < 14) return alert('Digite um telefone válido.');
                                    const success = await loginCustomer(recoveryPhone);
                                    if (success) {
                                        setIsRecovering(false);
                                        setRecoveryPhone('');
                                        setIsSaved(true);
                                        setTimeout(() => setIsSaved(false), 3000);
                                    } else {
                                        alert('😕 Cadastro não encontrado.\n\nVerifique o número ou faça seu primeiro pedido para criar sua conta.');
                                    }
                                }}
                                disabled={!recoveryPhone}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all mt-4 disabled:opacity-50"
                            >
                                <User size={20} /> Recuperar Meus Dados
                            </button>
                            <button
                                onClick={() => setIsRecovering(false)}
                                className="w-full text-slate-400 py-2 text-[10px] font-bold uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                        </div>
                    ) : isEditing ? (
                        <div className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Nome Completo</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ex: Ana Silva"
                                    className="w-full bg-gray-50 border border-transparent p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all placeholder:text-gray-300"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">WhatsApp</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="(00) 00000-0000"
                                    className="w-full bg-gray-50 border border-transparent p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all placeholder:text-gray-300"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Endereço Principal</label>
                                <textarea
                                    value={formData.address}
                                    onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="Rua, Número, Bairro..."
                                    className="w-full bg-gray-50 border border-transparent p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all h-24 resize-none placeholder:text-gray-300"
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={!formData.name || !formData.phone}
                                className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-orange-200 active:scale-95 transition-all mt-4 disabled:opacity-50"
                            >
                                <Save size={20} /> Salvar Alterações
                            </button>

                            {customerProfile?.name && (
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="w-full text-slate-400 py-2 text-[10px] font-bold uppercase tracking-widest"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-orange-50 text-orange-500"><User size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome</p>
                                    <p className="font-bold text-slate-700">{customerProfile?.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-orange-50 text-orange-500"><Phone size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp</p>
                                    <p className="font-bold text-slate-700">{customerProfile?.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-orange-50 text-orange-500"><MapPin size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Endereço</p>
                                    <p className="font-bold text-slate-700 leading-tight">{customerProfile?.address || 'Não informado'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Redeem Rewards */}
            <div className="space-y-6">
                <h3 className="text-slate-900 font-black text-lg flex items-center gap-2">
                    <Ticket size={20} className="text-orange-500" /> Trocar Pontos
                </h3>

                <div className="flex overflow-x-auto gap-4 pb-2 -mx-6 px-6 no-scrollbar">
                    {rewards.filter(r => r.isActive && !myCoupons.some(c => c.rewardId === r.id && !c.isUsed)).map(r => (
                        <div key={r.id} className="min-w-[280px] bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                    <span className="bg-orange-100 text-orange-600 text-[10px] font-black uppercase px-2 py-1 rounded-md">
                                        {r.pointsCost} Pontos
                                    </span>
                                    {r.type === 'discount' ? <Tag size={16} className="text-emerald-500" /> : <Package size={16} className="text-orange-500" />}
                                </div>
                                <h4 className="font-bold text-slate-900">{r.title}</h4>
                                <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{r.description}</p>
                            </div>
                            <button
                                onClick={async () => {
                                    if ((customerProfile?.points || 0) < r.pointsCost) return alert('Você ainda não tem pontos suficientes.');
                                    if (confirm(`Trocar ${r.pointsCost} pontos por ${r.title}?`)) {
                                        const res = await redeemReward(r.id);
                                        if (res.success) alert(`Oba! Cupom gerado: ${res.code}. Ele já está na sua lista!`);
                                        else alert(res.error);
                                    }
                                }}
                                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs active:scale-95 transition-all disabled:opacity-30"
                                disabled={(customerProfile?.points || 0) < r.pointsCost}
                            >
                                Resgatar Agora
                            </button>
                        </div>
                    ))}
                    {rewards.filter(r => r.isActive && !myCoupons.some(c => c.rewardId === r.id && !c.isUsed)).length === 0 && (
                        <div className="p-8 bg-gray-50 border border-dashed border-gray-200 rounded-[2rem] w-full text-center">
                            <p className="text-xs text-slate-400 font-bold">Nenhum prêmio novo disponível no momento.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* My Coupons */}
            {myCoupons.filter(c => !c.isUsed).length > 0 && (
                <div className="space-y-6">
                    <h3 className="text-slate-900 font-black text-lg flex items-center gap-2">
                        <Award size={20} className="text-emerald-500" /> Meus Cupons
                    </h3>
                    <div className="space-y-3">
                        {myCoupons.filter(c => !c.isUsed).map(c => (
                            <div key={c.id} className="p-4 rounded-2xl border bg-emerald-50/50 border-emerald-100 shadow-sm flex justify-between items-center">
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-800 text-sm leading-tight">{c.reward?.title}</p>
                                    <p className={`text-[10px] font-black tracking-widest uppercase ${c.isUsed ? 'text-gray-400' : 'text-emerald-600'}`}>
                                        {c.isUsed ? 'Já Utilizado' : c.code}
                                    </p>
                                </div>
                                {!c.isUsed && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                const pId = c.reward?.productId;
                                                const product = products.find(p => p.id === pId);

                                                if (product) {
                                                    addToCart(product, 1);
                                                    alert(`${product.name} adicionado ao carrinho!`);
                                                }

                                                setPrefillCoupon(c.code);
                                                setCustomerTab('cart');
                                                setShowCheckout(true);
                                            }}
                                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all shadow-lg shadow-emerald-200"
                                        >
                                            Usar Cupom
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(c.code);
                                                alert('Código copiado!');
                                            }}
                                            className="bg-white p-2 rounded-xl border border-emerald-200 text-emerald-600 active:scale-90 transition-all"
                                        >
                                            <Check size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {isSaved && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 z-[100]">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <Check size={14} />
                    </div>
                    <span className="text-xs font-bold">Perfil atualizado com sucesso!</span>
                </div>
            )}
        </div>
    );
};
