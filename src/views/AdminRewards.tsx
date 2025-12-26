import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Ticket, Plus, Trash2, Edit2, ShieldCheck, Tag, Package } from 'lucide-react';
import { Reward } from '../types';

export const AdminRewards: React.FC = () => {
    const { rewards, addReward, updateReward, deleteReward } = useApp();
    const [isEditing, setIsEditing] = useState(false);
    const [editingReward, setEditingReward] = useState<Partial<Reward> | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingReward?.id) {
            await updateReward(editingReward as Reward);
        } else {
            await addReward(editingReward as Omit<Reward, 'id'>);
        }
        setIsEditing(false);
        setEditingReward(null);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-100 flex items-center gap-3">
                    <Ticket className="text-orange-500" /> Central de Recompensas
                </h2>
                <button
                    onClick={() => {
                        setEditingReward({ title: '', description: '', pointsCost: 0, type: 'product', isActive: true });
                        setIsEditing(true);
                    }}
                    className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2"
                >
                    <Plus size={16} /> Nova Recompensa
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {rewards.map(r => (
                    <div key={r.id} className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl flex flex-col gap-4 group hover:border-orange-500/30 transition-all backdrop-blur-sm">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
                                    {r.type === 'product' ? <Package size={24} className="text-orange-500" /> : <Tag size={24} className="text-emerald-500" />}
                                </div>
                                <div>
                                    <h4 className="text-slate-100 font-bold text-lg">{r.title}</h4>
                                    <p className="text-slate-500 text-xs">{r.description}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase px-2 py-1 rounded-md border border-orange-500/20">
                                    {r.pointsCost} Pontos
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                            <button
                                onClick={() => {
                                    setEditingReward(r);
                                    setIsEditing(true);
                                }}
                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Excluir esta recompensa?')) deleteReward(r.id);
                                }}
                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {rewards.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] text-center px-6">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 mb-4">
                        <Ticket size={32} />
                    </div>
                    <h3 className="text-slate-300 font-bold text-lg mb-2">Nenhuma recompensa cadastrada</h3>
                    <p className="text-slate-500 text-sm max-w-xs">
                        Comece cadastrando um prêmio que seus clientes poderão resgatar com pontos.
                    </p>
                    <div className="mt-6 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl text-[10px] text-orange-500/60 uppercase font-black tracking-widest leading-relaxed max-w-sm">
                        ⚠️ Se você cadastrou e não apareceu, verifique se rodou o script SQL no Supabase conforme o Walkthrough.
                    </div>
                </div>
            )}

            {isEditing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative">
                        <h3 className="text-xl font-black text-white">{editingReward?.id ? 'Editar' : 'Nova'} Recompensa</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Título</label>
                                <input
                                    type="text"
                                    required
                                    value={editingReward?.title}
                                    onChange={e => setEditingReward({ ...editingReward, title: e.target.value })}
                                    className="w-full bg-slate-800 border-none rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                                    placeholder="Ex: Batata Frita Grátis"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Descrição</label>
                                <textarea
                                    value={editingReward?.description}
                                    onChange={e => setEditingReward({ ...editingReward, description: e.target.value })}
                                    className="w-full bg-slate-800 border-none rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 transition-all font-medium h-20"
                                    placeholder="Dê detalhes sobre o prêmio..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Custo em Pontos</label>
                                    <input
                                        type="number"
                                        required
                                        value={editingReward?.pointsCost}
                                        onChange={e => setEditingReward({ ...editingReward, pointsCost: parseInt(e.target.value) })}
                                        className="w-full bg-slate-800 border-none rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Tipo</label>
                                    <select
                                        value={editingReward?.type}
                                        onChange={e => setEditingReward({ ...editingReward, type: e.target.value as 'product' | 'discount' })}
                                        className="w-full bg-slate-800 border-none rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                                    >
                                        <option value="product">Produto</option>
                                        <option value="discount">Desconto (R$)</option>
                                    </select>
                                </div>
                            </div>

                            {editingReward?.type === 'product' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Vincular a Produto do Cardápio</label>
                                    <select
                                        value={editingReward?.productId || ''}
                                        onChange={e => setEditingReward({ ...editingReward, productId: e.target.value })}
                                        className="w-full bg-slate-800 border-none rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                                    >
                                        <option value="">Selecione um produto (Opcional)...</option>
                                        {useApp().products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>
                                        ))}
                                    </select>
                                    <p className="text-[9px] text-slate-500 ml-2">Vincular permite que o cliente adicione o item ao carrinho com um clique.</p>
                                </div>
                            )}

                            {editingReward?.type === 'discount' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Valor do Desconto (R$)</label>
                                    <input
                                        type="number"
                                        required
                                        value={editingReward?.discountValue}
                                        onChange={e => setEditingReward({ ...editingReward, discountValue: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border-none rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                                        placeholder="0.00"
                                    />
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 bg-slate-800 text-slate-400 py-4 rounded-2xl font-bold active:scale-95 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
