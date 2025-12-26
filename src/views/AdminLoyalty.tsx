import React from 'react';
import { useApp } from '../context/AppContext';
import { User, Phone, Award, DollarSign, MapPin, RefreshCw, Settings, Trophy, Ticket } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AdminLoyalty: React.FC = () => {
    const { customers, updateCustomerPoints, fetchCustomers, resetRanking, rewards, storeConfig, updateStoreConfig } = useApp();

    const handleAdjustPoints = async (id: string, currentPoints: number) => {
        const newPoints = prompt('Novo saldo de pontos:', currentPoints.toString());
        if (newPoints !== null && !isNaN(parseInt(newPoints))) {
            await updateCustomerPoints(id, parseInt(newPoints));
        }
    };

    const monthlyRanking = [...customers].sort((a, b) => (b.pointsMonthly || 0) - (a.pointsMonthly || 0)).slice(0, 5);
    const top3 = monthlyRanking.slice(0, 3);

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-slate-100 flex items-center gap-3">
                        <Award className="text-orange-500" /> Fidelidade & Rank
                    </h2>
                    <span className="bg-slate-800 text-slate-400 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-slate-700">
                        {customers.length} Clientes
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            if (confirm('Tem certeza que deseja ENCERRAR o período atual e premiar o vencedor? Os pontos mensais de todos serão zerados e o 1º lugar receberá o prêmio automaticamente.')) {
                                await resetRanking();
                                alert('Período encerrado! Ranking reiniciado.');
                            }
                        }}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all active:scale-95 border border-orange-500/20 shadow-lg shadow-orange-900/20"
                    >
                        Encerrar Período
                    </button>
                    <button
                        onClick={() => fetchCustomers()}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all active:scale-95 border border-slate-700"
                    >
                        <RefreshCw size={14} className="text-orange-500" /> Atualizar
                    </button>
                </div>
            </div>

            {/* Ranking Settings Card */}
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-sm space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center text-orange-500">
                        <Award size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white">Configuração de Ciclo e Premiação</h3>
                        <p className="text-slate-500 text-xs font-medium">Defina a regra para o vencedor automático de cada período.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Tempo do Ciclo</label>
                        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                            {(['weekly', 'fortnightly', 'monthly'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => updateStoreConfig({ rankingPeriod: p })}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${storeConfig?.rankingPeriod === p ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                >
                                    {p === 'weekly' ? 'Semanal' : p === 'fortnightly' ? 'Quinzenal' : 'Mensal'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Prêmio para o 1º Lugar</label>
                        <select
                            value={storeConfig?.rankingPrizeId || ''}
                            onChange={(e) => updateStoreConfig({ rankingPrizeId: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:border-orange-500 outline-none text-xs font-bold appearance-none cursor-pointer"
                        >
                            <option value="">Selecione um prêmio...</option>
                            {rewards.map(r => (
                                <option key={r.id} value={r.id}>{r.title} ({r.pointsCost} pts)</option>
                            ))}
                        </select>
                        <div className="mt-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-[10px] text-blue-400 font-medium leading-relaxed">
                            💡 O cliente que terminar o ciclo em primeiro receberá este cupom na aba "Meus Cupons" automaticamente.
                        </div>
                    </div>
                </div>
            </div>

            {/* Podium Section */}
            {monthlyRanking.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-6 bg-orange-500 rounded-full" />
                        <h3 className="text-slate-100 font-bold uppercase tracking-widest text-xs">Pódio do Mês (Top 3)</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 2nd Place */}
                        <div className="md:order-1 order-2 bg-slate-900/40 border-2 border-slate-300/10 p-6 rounded-[2.5rem] flex flex-col items-center gap-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-300/5 rounded-full -mr-16 -mt-16 blur-xl" />
                            <div className="w-12 h-12 bg-slate-200 text-slate-900 rounded-full flex items-center justify-center font-black text-xl shadow-lg border-4 border-slate-800">2</div>
                            <div className="text-center">
                                <p className="text-slate-100 font-bold">{monthlyRanking[1]?.name || '---'}</p>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-tighter">{monthlyRanking[1]?.pointsMonthly || 0} pts neste mês</p>
                            </div>
                        </div>

                        {/* 1st Place */}
                        <div className="md:order-2 order-1 bg-orange-600/10 border-2 border-orange-500/30 p-8 rounded-[3rem] flex flex-col items-center gap-4 relative overflow-hidden scale-110 shadow-2xl shadow-orange-950/20">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/20 rounded-full -mr-20 -mt-20 blur-2xl" />
                            <div className="w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center font-black text-2xl shadow-xl border-4 border-slate-900 animate-bounce">1</div>
                            <div className="text-center">
                                <p className="text-orange-500 font-black text-xl mb-1">👑 Rei do Reino</p>
                                <p className="text-slate-100 font-bold text-lg leading-tight">{monthlyRanking[0]?.name || 'Aguardando...'}</p>
                                <p className="text-orange-500/70 text-[10px] font-black uppercase tracking-widest mt-1">{monthlyRanking[0]?.pointsMonthly || 0} pts acumulados</p>
                            </div>
                        </div>

                        {/* 3rd Place */}
                        <div className="md:order-3 order-3 bg-slate-900/40 border-2 border-orange-900/10 p-6 rounded-[2.5rem] flex flex-col items-center gap-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-900/5 rounded-full -mr-16 -mt-16 blur-xl" />
                            <div className="w-12 h-12 bg-orange-900 text-orange-200 rounded-full flex items-center justify-center font-black text-xl shadow-lg border-4 border-slate-800">3</div>
                            <div className="text-center">
                                <p className="text-slate-100 font-bold">{monthlyRanking[2]?.name || '---'}</p>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-tighter">{monthlyRanking[2]?.pointsMonthly || 0} pts neste mês</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* All Customers List */}
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-slate-700 rounded-full" />
                    <h3 className="text-slate-100 font-bold uppercase tracking-widest text-xs">Gestão Geral de Clientes</h3>
                </div>

                <div className="grid gap-4">
                    {customers.map(c => (
                        <div key={c.id} className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group hover:border-orange-500/30 transition-all backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
                                    <User size={24} className="text-slate-500" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-slate-100 font-bold text-lg">{c.name}</h4>
                                    <div className="flex items-center gap-3">
                                        <p className="text-slate-500 text-xs flex items-center gap-1"><Phone size={12} /> {c.phone}</p>
                                        <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                        <p className="text-slate-500 text-xs flex items-center gap-1"><MapPin size={12} className="hidden" /> {c.address?.slice(0, 30)}...</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 w-full md:w-auto border-t md:border-t-0 border-slate-800 pt-4 md:pt-0">
                                <div className="flex gap-4">
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Gasto</p>
                                        <p className="text-slate-200 font-bold text-sm">R$ {c.totalSpent.toFixed(2)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-orange-500 uppercase mb-1">Pontos</p>
                                        <p className="text-orange-500 font-black text-sm">{c.points}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleAdjustPoints(c.id, c.points)}
                                    className="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all hover:bg-orange-500 hover:text-white ml-auto"
                                >
                                    Ajustar
                                </button>
                            </div>
                        </div>
                    ))}

                    {customers.length === 0 && (
                        <div className="text-center py-20 bg-slate-900/20 border border-dashed border-slate-800 rounded-[2.5rem]">
                            <p className="text-slate-500 font-bold">Nenhum cliente cadastrado ainda.</p>
                            <p className="text-slate-600 text-xs mt-1">Os clientes aparecem aqui após o primeiro pedido.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
