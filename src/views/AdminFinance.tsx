import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DollarSign, TrendingUp, TrendingDown, Plus, Calendar, ArrowUpRight, ArrowDownRight, Trash2, Wallet } from 'lucide-react';

export const AdminFinance: React.FC = () => {
    const { transactions, addTransaction } = useApp();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTransaction, setNewTransaction] = useState({
        type: 'INCOME' as 'INCOME' | 'EXPENSE',
        amount: '',
        description: '',
        category: 'Vendas',
        paymentMethod: 'Dinheiro'
    });

    // Calculations
    const parseAmount = (val: string) => parseFloat(val.replace(',', '.')) || 0;

    const summary = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return transactions.reduce((acc, t) => {
            const amount = t.amount;
            const date = new Date(t.createdAt);
            const isThisMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;

            // Total Balance (All time)
            if (t.type === 'INCOME') acc.balance += amount;
            else acc.balance -= amount;

            // Monthly Stats
            if (isThisMonth) {
                if (t.type === 'INCOME') acc.monthIncome += amount;
                else acc.monthExpense += amount;
            }

            return acc;
        }, { balance: 0, monthIncome: 0, monthExpense: 0 });
    }, [transactions]);

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

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <Wallet className="text-emerald-500" /> Financeiro
                    </h1>
                    <p className="text-slate-500 text-sm">Controle de fluxo de caixa e lançamentos.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                >
                    <Plus size={20} /> Novo Lançamento
                </button>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Balance Card */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-500">
                            <DollarSign size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-950/50 px-3 py-1 rounded-full">Saldo Total</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm text-slate-400 font-bold mb-1">Caixa Atual</p>
                        <h3 className={`text-3xl font-black ${summary.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            R$ {summary.balance.toFixed(2).replace('.', ',')}
                        </h3>
                    </div>
                </div>

                {/* Monthly Income */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1">
                            <Calendar size={10} /> Este Mês
                        </span>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Entradas</p>
                        <h3 className="text-2xl font-black text-blue-400">
                            R$ {summary.monthIncome.toFixed(2).replace('.', ',')}
                        </h3>
                    </div>
                </div>

                {/* Monthly Expense */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500">
                            <TrendingDown size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                            <Calendar size={10} /> Este Mês
                        </span>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Saídas</p>
                        <h3 className="text-2xl font-black text-rose-400">
                            R$ {summary.monthExpense.toFixed(2).replace('.', ',')}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Wallet size={18} className="text-slate-500" /> Histórico de Transações
                    </h3>
                </div>

                <div className="divide-y divide-slate-800/50">
                    {transactions.length > 0 ? transactions.map((t) => (
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
                                            {new Date(t.createdAt).toLocaleDateString()}
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
                            <p className="text-sm font-medium">Nenhuma transação encontrada</p>
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
                                        <option>Suprimentos</option>
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
