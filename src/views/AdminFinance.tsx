import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DollarSign, TrendingUp, TrendingDown, Plus, Calendar, ArrowUpRight, ArrowDownRight, Trash2, Wallet } from 'lucide-react';

export const AdminFinance: React.FC = () => {
    const { transactions, addTransaction, orders } = useApp();
    const [showAddModal, setShowAddModal] = useState(false);
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom' | 'custom-month'>('today');
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [newTransaction, setNewTransaction] = useState({
        type: 'INCOME' as 'INCOME' | 'EXPENSE',
        amount: '',
        description: '',
        category: 'Vendas',
        paymentMethod: 'Dinheiro'
    });

    // Calculations
    const parseAmount = (val: string) => parseFloat(val.replace(',', '.')) || 0;

    const filterByDate = (date: Date) => {
        const now = new Date();
        const target = new Date(date);

        switch (dateFilter) {
            case 'today':
                return target.toDateString() === now.toDateString();
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return target >= weekAgo;
            case 'month':
                return target.getMonth() === now.getMonth() && target.getFullYear() === now.getFullYear();
            case 'custom-month':
                const [y, m] = selectedMonth.split('-').map(Number);
                return target.getMonth() === (m - 1) && target.getFullYear() === y;
            case 'custom':
                return target.toISOString().split('T')[0] === customDate;
            case 'all':
                return true;
        }
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => filterByDate(new Date(t.createdAt)));
    }, [transactions, dateFilter, customDate]);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => filterByDate(new Date(o.timestamp)) && o.status === 'Finalizado');
    }, [orders, dateFilter, customDate]);

    const summary = useMemo(() => {
        // Gross income from transactions
        const grossIncome = filteredTransactions.reduce((acc, t) => {
            return t.type === 'INCOME' ? acc + t.amount : acc;
        }, 0);

        // Fees from filtered orders
        const feesBredowndown = filteredOrders.reduce((acc, o) => {
            const delivery = Number(o.deliveryFee) || 0;
            const cardFee = Number(o.cardFee) || 0;

            acc.delivery += delivery;
            if (o.paymentMethod === 'Pix') {
                acc.pix += cardFee;
            } else if (['Cartão Crédito', 'Cartão Débito', 'Card'].includes(o.paymentMethod)) {
                acc.machine += cardFee;
            }
            return acc;
        }, { delivery: 0, machine: 0, pix: 0 });

        const totalFees = feesBredowndown.delivery + feesBredowndown.machine + feesBredowndown.pix;
        const netIncome = grossIncome - totalFees;

        const expenses = filteredTransactions.reduce((acc, t) => {
            return t.type === 'EXPENSE' ? acc + t.amount : acc;
        }, 0);

        // Balance is Net - Expenses
        const balance = netIncome - expenses;

        return {
            grossIncome,
            netIncome,
            expenses,
            balance,
            fees: feesBredowndown,
            totalFees
        };
    }, [filteredTransactions, filteredOrders]);

    const handleSave = async () => {
        if (!newTransaction.amount || !newTransaction.description) return alert('Preencha os campos obrigatórios');

        await addTransaction({
            type: newTransaction.type,
            amount: parseAmount(newTransaction.amount),
            description: newTransaction.description,
            category: newTransaction.category,
            paymentMethod: newTransaction.paymentMethod
        });

        setShowAddModal(false);
        setNewTransaction({ type: 'INCOME', amount: '', description: '', category: 'Vendas', paymentMethod: 'Dinheiro' });
        alert('Transação adicionada!');
    };

    const getPeriodLabel = () => {
        switch (dateFilter) {
            case 'today': return 'Hoje';
            case 'week': return 'Última Semana';
            case 'month': return 'Mês Atual';
            case 'custom-month':
                const [y, m] = selectedMonth.split('-').map(Number);
                return new Date(y, m - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            case 'custom': return new Date(customDate).toLocaleDateString();
            case 'all': return 'Total';
        }
    };

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <Wallet className="text-emerald-500" /> Financeiro
                    </h1>
                    <p className="text-slate-500 text-sm">Controle de fluxo de caixa e lançamentos.</p>
                </div>
                <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    {([
                        { value: 'today', label: 'Hoje' },
                        { value: 'week', label: '7 Dias' },
                        { value: 'month', label: 'Mês Atual' },
                        { value: 'all', label: 'Todos' }
                    ] as const).map(f => (
                        <button
                            key={f.value}
                            onClick={() => setDateFilter(f.value)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${dateFilter === f.value
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                                : 'text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}

                    {dateFilter === 'custom' || dateFilter === 'custom-month' ? (
                        <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                            {dateFilter === 'custom' ? (
                                <input
                                    type="date"
                                    value={customDate}
                                    onChange={(e) => setCustomDate(e.target.value)}
                                    className="bg-slate-800 text-white border border-emerald-500 rounded-xl px-4 py-2 text-xs font-bold outline-none shadow-lg shadow-emerald-500/20 focus:ring-2 focus:ring-emerald-500/20"
                                />
                            ) : (
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="bg-slate-800 text-white border border-emerald-500 rounded-xl px-4 py-2 text-xs font-bold outline-none shadow-lg shadow-emerald-500/20 focus:ring-2 focus:ring-emerald-500/20"
                                />
                            )}
                            <button
                                onClick={() => setDateFilter('custom')}
                                className={`p-2 rounded-lg border ${dateFilter === 'custom' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-800 text-slate-500'}`}
                                title="Escolher Dia"
                            >
                                <Calendar size={14} />
                            </button>
                            <button
                                onClick={() => setDateFilter('custom-month')}
                                className={`p-2 rounded-lg border ${dateFilter === 'custom-month' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-800 text-slate-500'}`}
                                title="Escolher Mês"
                            >
                                <Calendar size={14} className="opacity-50" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setDateFilter('custom')}
                            className="px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300 flex items-center gap-2"
                        >
                            <Calendar size={14} /> Data
                        </button>
                    )}

                    <div className="w-px h-8 bg-slate-800 mx-2 hidden md:block"></div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all whitespace-nowrap"
                    >
                        <Plus size={16} /> Novo
                    </button>
                </div>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Gross Card */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-blue-500">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-950/50 px-3 py-1 rounded-full">Valor Bruto</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm text-slate-400 font-bold mb-1">{getPeriodLabel()}</p>
                        <h3 className="text-3xl font-black text-blue-400">
                            R$ {summary.grossIncome.toFixed(2).replace('.', ',')}
                        </h3>
                    </div>
                </div>

                {/* Fees Card */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                            <DollarSign size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                            Taxas Totais
                        </span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Maquininha:</span>
                            <span className="font-bold text-slate-400">R$ {summary.fees.machine.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                            <span>PIX:</span>
                            <span className="font-bold text-slate-400">R$ {summary.fees.pix.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Entrega:</span>
                            <span className="font-bold text-slate-400">R$ {summary.fees.delivery.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-800 flex justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase">Total:</span>
                            <h3 className="text-lg font-black text-amber-500">
                                R$ {summary.totalFees.toFixed(2).replace('.', ',')}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Net Card */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            {getPeriodLabel()}
                        </span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Valor Líquido</p>
                        <h3 className="text-3xl font-black text-emerald-400">
                            R$ {summary.netIncome.toFixed(2).replace('.', ',')}
                        </h3>
                    </div>
                </div>

                {/* Balance/Expense Card */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500">
                            <TrendingDown size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                            Despesas & Saldo
                        </span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Despesas:</span>
                            <span className="font-bold text-rose-400">R$ {summary.expenses.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-800 flex justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase">Saldo Final:</span>
                            <h3 className={`text-xl font-black ${summary.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                R$ {summary.balance.toFixed(2).replace('.', ',')}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Wallet size={18} className="text-slate-500" /> Histórico ({getPeriodLabel()})
                    </h3>
                </div>

                <div className="divide-y divide-slate-800/50">
                    {filteredTransactions.length > 0 ? filteredTransactions.map((t) => (
                        <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.type === 'INCOME'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : 'bg-rose-500/10 text-rose-500'
                                    }`}>
                                    {t.type === 'INCOME' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-200 text-sm">{t.description}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                            {t.category}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                            {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {t.paymentMethod && (
                                            <span className="text-[10px] text-slate-500 border-l border-slate-700 pl-2">
                                                {t.paymentMethod}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className={`text-right font-black ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toFixed(2).replace('.', ',')}
                            </div>
                        </div>
                    )) : (
                        <div className="p-10 text-center text-slate-500">
                            <p className="text-sm font-medium">Nenhuma transação encontrada para {getPeriodLabel().toLowerCase()}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Transaction Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="font-black text-xl text-white">Novo Lançamento</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setNewTransaction({ ...newTransaction, type: 'INCOME' })}
                                className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${newTransaction.type === 'INCOME'
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                                    : 'bg-slate-800 text-slate-500'
                                    }`}
                            >
                                <ArrowUpRight size={18} /> Entrada
                            </button>
                            <button
                                onClick={() => setNewTransaction({ ...newTransaction, type: 'EXPENSE' })}
                                className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${newTransaction.type === 'EXPENSE'
                                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/40'
                                    : 'bg-slate-800 text-slate-500'
                                    }`}
                            >
                                <ArrowDownRight size={18} /> Saída
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Descrição</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Venda no balcão, Pagamento fornecedor..."
                                    value={newTransaction.description}
                                    onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Valor</label>
                                    <input
                                        type="text"
                                        placeholder="0,00"
                                        value={newTransaction.amount}
                                        onChange={e => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Categoria</label>
                                    <select
                                        value={newTransaction.category}
                                        onChange={e => setNewTransaction({ ...newTransaction, category: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500"
                                    >
                                        <option>Vendas</option>
                                        <option>Insumos</option>
                                        <option>Contas da Empresa</option>
                                        <option>Pessoal</option>
                                        <option>Marketing</option>
                                        <option>Manutenção</option>
                                        <option>Outros</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Meio de Pagamento</label>
                                <select
                                    value={newTransaction.paymentMethod}
                                    onChange={e => setNewTransaction({ ...newTransaction, paymentMethod: e.target.value })}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500"
                                >
                                    <option>Dinheiro</option>
                                    <option>Pix</option>
                                    <option>Cartão Crédito</option>
                                    <option>Cartão Débito</option>
                                    <option>Transferência</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            className={`w-full py-4 rounded-xl font-black text-white shadow-xl transition-all ${newTransaction.type === 'INCOME'
                                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                                : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                                }`}
                        >
                            Confirmar Lançamento
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
