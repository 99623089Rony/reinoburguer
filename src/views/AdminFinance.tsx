import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
    DollarSign, TrendingUp, TrendingDown, Calendar, Plus,
    ArrowUpRight, ArrowDownRight, Wallet, CreditCard, Banknote, Search, ClipboardList
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer
} from 'recharts';
import { Transaction } from '../types';

export const AdminFinance: React.FC = () => {
    const { transactions, fetchTransactions, addTransaction } = useApp();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
    const [dateRange, setDateRange] = useState<{ start: string; end: string; label: string }>({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
        label: 'Hoje'
    });

    // Helper to set date ranges
    const applyDateFilter = (type: 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM', customStart?: string, customEnd?: string) => {
        const today = new Date();
        let start = new Date();
        let end = new Date();

        switch (type) {
            case 'TODAY':
                // Start and end are already today
                setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0], label: 'Hoje' });
                break;
            case 'YESTERDAY':
                start.setDate(today.getDate() - 1);
                end.setDate(today.getDate() - 1);
                setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0], label: 'Ontem' });
                break;
            case 'WEEK':
                const day = today.getDay(); // 0 (Sun) to 6 (Sat)
                const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
                start.setDate(diff);
                end.setDate(diff + 6);
                setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0], label: 'Esta Semana' });
                break;
            case 'MONTH':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0], label: 'Este Mês' });
                break;
            case 'CUSTOM':
                if (customStart && customEnd) {
                    setDateRange({ start: customStart, end: customEnd, label: 'Personalizado' });
                }
                break;
        }
    };

    // Form State
    const [newTrans, setNewTrans] = useState<{
        type: 'INCOME' | 'EXPENSE';
        amount: string;
        description: string;
        category: string;
        paymentMethod: string;
    }>({
        type: 'EXPENSE',
        amount: '',
        description: '',
        category: 'Suprimentos',
        paymentMethod: 'Dinheiro'
    });

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // Filtered Transactions
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const tDate = new Date(t.createdAt).toISOString().split('T')[0];
            const matchesDate = tDate >= dateRange.start && tDate <= dateRange.end;
            const matchesType = filterType === 'ALL' || t.type === filterType;
            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesDate && matchesType && matchesSearch;
        });
    }, [transactions, dateRange, filterType, searchTerm]);

    // Financial Metrics (Based on filtered data)
    const metrics = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
        const expense = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
        const balance = income - expense;
        return { income, expense, balance };
    }, [filteredTransactions]);

    // Charts Data
    const chartsData = useMemo(() => {
        const methods: Record<string, number> = {};
        filteredTransactions.filter(t => t.type === 'INCOME').forEach(t => {
            const method = t.paymentMethod || 'Outros';
            methods[method] = (methods[method] || 0) + t.amount;
        });
        const pieData = Object.entries(methods).map(([name, value]) => ({ name, value }));

        return { pieData };
    }, [filteredTransactions]);

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTrans.amount || !newTrans.description) return;

        await addTransaction({
            type: newTrans.type,
            amount: parseFloat(newTrans.amount.replace(',', '.')),
            description: newTrans.description,
            category: newTrans.category,
            paymentMethod: newTrans.paymentMethod
        });
        setIsAddModalOpen(false);
        setNewTrans({ type: 'EXPENSE', amount: '', description: '', category: 'Suprimentos', paymentMethod: 'Dinheiro' });
    };

    const COLORS = ['#F97316', '#10B981', '#3B82F6', '#6366F1'];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-100 flex items-center gap-3">
                        <DollarSign className="text-emerald-500" size={32} /> Central Financeira
                    </h2>
                    <p className="text-slate-400">Visão geral do caixa e movimentações do dia</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
                >
                    <Plus size={20} /> Nova Movimentação
                </button>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Balance */}
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet size={100} className="text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-wider">Saldo em Caixa</p>
                    <h3 className={`text-4xl font-black mt-2 ${metrics.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {metrics.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-800/50 w-fit px-3 py-1 rounded-full">
                        <Calendar size={12} /> {dateRange.label === 'Personalizado' ? `${new Date(dateRange.start).toLocaleDateString('pt-BR')} - ${new Date(dateRange.end).toLocaleDateString('pt-BR')}` : dateRange.label}
                    </div>
                </div>

                {/* Income */}
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <ArrowUpRight className="text-emerald-500" size={24} />
                        </div>
                        <p className="text-slate-400 font-bold text-sm uppercase">Entradas</p>
                    </div>
                    <h3 className="text-3xl font-black text-white">
                        {metrics.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                </div>

                {/* Expense */}
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-500/10 rounded-xl">
                            <ArrowDownRight className="text-red-500" size={24} />
                        </div>
                        <p className="text-slate-400 font-bold text-sm uppercase">Saídas</p>
                    </div>
                    <h3 className="text-3xl font-black text-white">
                        {metrics.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                </div>
            </div>

            {/* Visuals Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Transactions List */}
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 lg:p-8 flex flex-col h-[500px]">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                            <ClipboardList className="text-orange-500" /> Movimentações
                        </h3>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2 text-slate-200 text-sm focus:ring-2 focus:ring-orange-500 w-full md:w-32"
                                />
                            </div>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="bg-slate-800 border-none rounded-xl px-4 py-2 text-slate-200 text-sm focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="ALL">Tipos (Todos)</option>
                                <option value="INCOME">Entradas</option>
                                <option value="EXPENSE">Saídas</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                        {['TODAY', 'YESTERDAY', 'WEEK', 'MONTH'].map((type: any) => {
                            const labelMap: any = { 'TODAY': 'Hoje', 'YESTERDAY': 'Ontem', 'WEEK': 'Semana', 'MONTH': 'Mês' };
                            const isActive = dateRange.label === labelMap[type] || (dateRange.label === 'Hoje' && type === 'TODAY');

                            return (
                                <button
                                    key={type}
                                    onClick={() => applyDateFilter(type)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${isActive ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                                >
                                    {labelMap[type]}
                                </button>
                            )
                        })}
                        <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 border border-slate-700">
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => applyDateFilter('CUSTOM', e.target.value, dateRange.end)}
                                className="bg-transparent text-xs text-slate-300 outline-none w-24"
                            />
                            <span className="text-slate-600">-</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => applyDateFilter('CUSTOM', dateRange.start, e.target.value)}
                                className="bg-transparent text-xs text-slate-300 outline-none w-24"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {filteredTransactions
                            .map(t => (
                                <div key={t.id} className="bg-slate-800/40 p-4 rounded-2xl flex items-center justify-between group hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'INCOME' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                            {t.type === 'INCOME' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold">{t.description}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-slate-500 uppercase font-black bg-slate-900 px-2 py-0.5 rounded-md">{t.category}</span>
                                                <span className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-black ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {t.type === 'INCOME' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </p>
                                        <p className="text-xs text-slate-600 font-medium">{t.paymentMethod || '-'}</p>
                                    </div>
                                </div>
                            ))}
                        {transactions.length === 0 && (
                            <div className="text-center py-20 text-slate-600">
                                Nenhuma movimentação registrada hoje.
                            </div>
                        )}
                        {transactions.length > 0 && filteredTransactions.length === 0 && (
                            <div className="text-center py-20 text-slate-600">
                                Nenhuma movimentação neste período.
                            </div>
                        )}
                    </div>
                </div>

                {/* Charts Area */}
                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 h-[500px] flex flex-col">
                        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                            <CreditCard className="text-blue-500" /> Distribuição de Receita
                        </h3>
                        <div className="flex-1 min-h-0">
                            {chartsData.pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartsData.pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={120}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {chartsData.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '1rem', color: '#fff' }}
                                            formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            formatter={(value) => <span style={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '12px' }}>{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                    <Wallet size={48} className="mb-4 opacity-20" />
                                    <p>Sem dados para gráfico</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Transaction Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative">
                        <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-2 animate-in slide-in-from-bottom-2">
                            Nova Movimentação
                        </h3>

                        <form onSubmit={handleAddSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setNewTrans({ ...newTrans, type: 'INCOME', category: 'Aporte' })}
                                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${newTrans.type === 'INCOME' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-800/80'}`}
                                >
                                    <TrendingUp size={24} />
                                    <span className="font-bold text-sm">Entrada</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewTrans({ ...newTrans, type: 'EXPENSE', category: 'Suprimentos' })}
                                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${newTrans.type === 'EXPENSE' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-800/80'}`}
                                >
                                    <TrendingDown size={24} />
                                    <span className="font-bold text-sm">Saída</span>
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Valor (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={newTrans.amount}
                                        onChange={e => setNewTrans({ ...newTrans, amount: e.target.value })}
                                        className="w-full bg-slate-800 border-none rounded-xl py-4 pl-12 pr-4 text-white font-bold focus:ring-2 focus:ring-orange-500"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Descrição</label>
                                <input
                                    type="text"
                                    required
                                    value={newTrans.description}
                                    onChange={e => setNewTrans({ ...newTrans, description: e.target.value })}
                                    className="w-full bg-slate-800 border-none rounded-xl py-4 px-4 text-white focus:ring-2 focus:ring-orange-500"
                                    placeholder="Ex: Compra de embalagens"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Categoria</label>
                                    <select
                                        value={newTrans.category}
                                        onChange={e => setNewTrans({ ...newTrans, category: e.target.value })}
                                        className="w-full bg-slate-800 border-none rounded-xl py-4 px-4 text-white font-bold focus:ring-2 focus:ring-orange-500 appearance-none"
                                    >
                                        {newTrans.type === 'INCOME' ? (
                                            <>
                                                <option>Vendas</option>
                                                <option>Aporte</option>
                                                <option>Outros</option>
                                            </>
                                        ) : (
                                            <>
                                                <option>Suprimentos</option>
                                                <option>Equipamentos</option>
                                                <option>Sangria</option>
                                                <option>Pessoal</option>
                                                <option>Contas</option>
                                                <option>Marketing</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Pagamento</label>
                                    <select
                                        value={newTrans.paymentMethod}
                                        onChange={e => setNewTrans({ ...newTrans, paymentMethod: e.target.value })}
                                        className="w-full bg-slate-800 border-none rounded-xl py-4 px-4 text-white font-bold focus:ring-2 focus:ring-orange-500 appearance-none"
                                    >
                                        <option>Dinheiro</option>
                                        <option>Pix</option>
                                        <option>Cartão</option>
                                        <option>Transferência</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 bg-slate-800 text-slate-300 py-4 rounded-xl font-bold hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg active:scale-95"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
