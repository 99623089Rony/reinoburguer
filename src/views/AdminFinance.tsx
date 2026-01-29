import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DollarSign, TrendingUp, TrendingDown, Plus, Calendar, ArrowUpRight, ArrowDownRight, Trash2, Wallet, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Bill } from '../types';

export const AdminFinance: React.FC = () => {
    const { transactions, addTransaction, orders, bills, addBill, payBill, deleteBill } = useApp();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBillModal, setShowBillModal] = useState(false);
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom' | 'custom-month'>('today');
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const [newTransaction, setNewTransaction] = useState({
        type: 'INCOME' as 'INCOME' | 'EXPENSE',
        amount: '',
        description: '',
        category: 'Vendas',
        paymentMethod: 'Dinheiro'
    });

    const [newBill, setNewBill] = useState({
        description: '',
        amount: '',
        dueDate: new Date().toISOString().split('T')[0],
        category: 'Contas da Empresa'
    });

    // Initial Debt / Balance (Manual Adjustment)
    const initialBalance = useMemo(() => {
        return transactions
            .filter(t => t.category === 'Saldo Inicial' || t.category === 'Aporte de Capital')
            .reduce((acc, t) => t.type === 'INCOME' ? acc + t.amount : acc - t.amount, 0);
    }, [transactions]);

    const parseAmount = (val: string) => parseFloat(val.replace(',', '.')) || 0;

    const filterByDate = (date: Date) => {
        const now = new Date();
        const target = new Date(date);
        switch (dateFilter) {
            case 'today': return target.toDateString() === now.toDateString();
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return target >= weekAgo;
            case 'month': return target.getMonth() === now.getMonth() && target.getFullYear() === now.getFullYear();
            case 'custom-month':
                const [y, m] = selectedMonth.split('-').map(Number);
                return target.getMonth() === (m - 1) && target.getFullYear() === y;
            case 'custom': return target.toISOString().split('T')[0] === customDate;
            case 'all': return true;
        }
    };

    const filteredTransactions = useMemo(() => transactions.filter(t => filterByDate(new Date(t.createdAt))), [transactions, dateFilter, customDate, selectedMonth]);
    const filteredOrders = useMemo(() => orders.filter(o => filterByDate(new Date(o.timestamp)) && o.status === 'Finalizado'), [orders, dateFilter, customDate, selectedMonth]);

    const summary = useMemo(() => {
        const incomeTransactions = filteredTransactions.filter(t => t.type === 'INCOME');
        const expenseTransactions = filteredTransactions.filter(t => t.type === 'EXPENSE');

        const totalIncome = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);
        const totalExpense = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);

        // Split by Payment Method for the physical/digital cashier
        const byMethod = filteredTransactions.reduce((acc, t) => {
            const method = t.paymentMethod || 'Dinheiro';
            if (!acc[method]) acc[method] = 0;
            acc[method] += (t.type === 'INCOME' ? t.amount : -t.amount);
            return acc;
        }, {} as Record<string, number>);

        // Manual check for order-based fees if not already in transactions
        const machineFees = filteredOrders.reduce((acc, o) => {
            if (['Cartão Crédito', 'Cartão Débito', 'Card'].includes(o.paymentMethod)) {
                return acc + (Number(o.cardFee) || 0);
            }
            return acc;
        }, 0);

        const pixFees = filteredOrders.reduce((acc, o) => {
            if (o.paymentMethod === 'Pix') return acc + (Number(o.cardFee) || 0);
            return acc;
        }, 0);

        const deliveryFees = filteredOrders.reduce((acc, o) => acc + (Number(o.deliveryFee) || 0), 0);

        return {
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense,
            cashInHand: byMethod['Dinheiro'] || 0,
            digitalTotal: (byMethod['Pix'] || 0) + (byMethod['Cartão Crédito'] || 0) + (byMethod['Cartão Débito'] || 0),
            fees: { machine: machineFees, pix: pixFees, delivery: deliveryFees }
        };
    }, [filteredTransactions, filteredOrders]);

    const pendingBills = useMemo(() => bills.filter(b => b.status === 'pending'), [bills]);

    const handleSaveTransaction = async () => {
        if (!newTransaction.amount || !newTransaction.description) return alert('Campos obrigatórios: Valor e Descrição');
        await addTransaction({
            type: newTransaction.type,
            amount: parseAmount(newTransaction.amount),
            description: newTransaction.description,
            category: newTransaction.category,
            paymentMethod: newTransaction.paymentMethod
        });
        setShowAddModal(false);
        setNewTransaction({ type: 'INCOME', amount: '', description: '', category: 'Vendas', paymentMethod: 'Dinheiro' });
    };

    const handleSaveBill = async () => {
        if (!newBill.amount || !newBill.description) return alert('Campos obrigatórios: Valor e Descrição');
        await addBill({
            description: newBill.description,
            amount: parseAmount(newBill.amount),
            dueDate: newBill.dueDate,
            status: 'pending',
            category: newBill.category
        });
        setShowBillModal(false);
        setNewBill({ description: '', amount: '', dueDate: new Date().toISOString().split('T')[0], category: 'Contas da Empresa' });
    };

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <Wallet className="text-emerald-500" /> Fluxo de Caixa
                    </h1>
                    <p className="text-slate-500 text-sm">Controle de entradas, saídas e contas a pagar.</p>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button onClick={() => setDateFilter('today')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${dateFilter === 'today' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' : 'text-slate-400 border-slate-800'}`}>Hoje</button>
                    <button onClick={() => setDateFilter('month')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${dateFilter === 'month' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' : 'text-slate-400 border-slate-800'}`}>Mês</button>
                    <button onClick={() => setDateFilter('all')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${dateFilter === 'all' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' : 'text-slate-400 border-slate-800'}`}>Tudo</button>
                    <div className="w-px h-8 bg-slate-800 mx-2" />
                    <button onClick={() => setShowAddModal(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"><Plus size={16} /> Lançar</button>
                </div>
            </header>

            {/* Dashboard Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Status do Caixa (Physical vs Digital) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Physical Cash Card */}
                        <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-3xl relative overflow-hidden group shadow-xl">
                            <div className="absolute right-0 top-0 p-20 bg-emerald-500/5 rounded-full blur-2xl" />
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                                        <Wallet size={20} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">Gaveta (Dinheiro)</span>
                                </div>
                                <h2 className="text-4xl font-black text-white">R$ {summary.cashInHand.toFixed(2).replace('.', ',')}</h2>
                                <p className="text-xs text-slate-500 font-medium">Este é o valor físico que deve estar no local.</p>
                            </div>
                        </div>

                        {/* Digital/Receivables Card */}
                        <div className="bg-slate-900 border border-blue-500/20 p-6 rounded-3xl relative overflow-hidden group shadow-xl">
                            <div className="absolute right-0 top-0 p-20 bg-blue-500/5 rounded-full blur-2xl" />
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                                        <TrendingUp size={20} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full">Digital (PIX/Cartão)</span>
                                </div>
                                <h2 className="text-4xl font-black text-white">R$ {summary.digitalTotal.toFixed(2).replace('.', ',')}</h2>
                                <p className="text-xs text-slate-500 font-medium">Valores recebidos via meios eletrônicos.</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Metrics Bar */}
                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 transition-widest">Entradas</p>
                            <p className="text-lg font-black text-emerald-400">R$ {summary.totalIncome.toFixed(2).replace('.', ',')}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 transition-widest">Saídas</p>
                            <p className="text-lg font-black text-rose-400">R$ {summary.totalExpense.toFixed(2).replace('.', ',')}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 transition-widest">Taxas Maq/Pix</p>
                            <p className="text-lg font-black text-amber-500">R$ {(summary.fees.machine + summary.fees.pix).toFixed(2).replace('.', ',')}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 transition-widest">Balanço Final</p>
                            <p className={`text-xl font-black ${summary.balance >= 0 ? 'text-white' : 'text-rose-400'}`}>R$ {summary.balance.toFixed(2).replace('.', ',')}</p>
                        </div>
                    </div>
                </div>

                {/* 2. Contas a Pagar (Accounts Payable) */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl flex flex-col min-h-[400px]">
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                        <h3 className="font-black text-white flex items-center gap-2">
                            <Clock size={18} className="text-amber-500" /> Contas a Pagar
                        </h3>
                        <button onClick={() => setShowBillModal(true)} className="p-2 bg-slate-800 rounded-lg text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all">
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[400px] no-scrollbar p-4 space-y-3">
                        {pendingBills.length > 0 ? pendingBills.map(bill => (
                            <div key={bill.id} className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl group hover:border-amber-500/30 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-bold text-sm text-white">{bill.description}</p>
                                        <p className="text-[10px] text-slate-500">Vence em: {new Date(bill.dueDate).toLocaleDateString()}</p>
                                    </div>
                                    <p className="font-black text-rose-400 text-sm">R$ {bill.amount.toFixed(2).replace('.', ',')}</p>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={() => payBill(bill.id, 'Dinheiro')}
                                        className="flex-1 py-1.5 bg-emerald-500/20 text-emerald-500 rounded-lg text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all"
                                    >
                                        Pagar (Dinheiro)
                                    </button>
                                    <button
                                        onClick={() => payBill(bill.id, 'Pix')}
                                        className="flex-1 py-1.5 bg-blue-500/20 text-blue-500 rounded-lg text-[10px] font-black hover:bg-blue-500 hover:text-white transition-all"
                                    >
                                        Pagar (Pix)
                                    </button>
                                    <button onClick={() => deleteBill(bill.id)} className="p-1.5 text-slate-600 hover:text-rose-500"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-50">
                                <CheckCircle2 size={40} />
                                <p className="text-xs font-bold">Tudo em dia!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                    <h3 className="font-black text-white">Histórico de Movimentações</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-950/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                                <th className="p-4">Data</th>
                                <th className="p-4">Descrição</th>
                                <th className="p-4">Categoria</th>
                                <th className="p-4">Método</th>
                                <th className="p-4 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {filteredTransactions.map(t => (
                                <tr key={t.id} className="hover:bg-slate-800/30 transition-colors text-sm">
                                    <td className="p-4 text-slate-500 text-xs">
                                        {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="p-4 font-bold text-slate-200">{t.description}</td>
                                    <td className="p-4"><span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-[10px] font-bold text-slate-400">{t.category}</span></td>
                                    <td className="p-4 text-slate-400 text-xs">{t.paymentMethod || 'Dinheiro'}</td>
                                    <td className={`p-4 text-right font-black ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toFixed(2).replace('.', ',')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="font-black text-xl text-white">Novo Lançamento</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><Plus size={20} className="rotate-45" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setNewTransaction({ ...newTransaction, type: 'INCOME' })} className={`py-4 rounded-2xl font-black text-xs flex flex-col items-center gap-2 border-2 transition-all ${newTransaction.type === 'INCOME' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-950/50 border-slate-800 text-slate-500'}`}><ArrowUpRight size={20} /> ENTRADA</button>
                            <button onClick={() => setNewTransaction({ ...newTransaction, type: 'EXPENSE' })} className={`py-4 rounded-2xl font-black text-xs flex flex-col items-center gap-2 border-2 transition-all ${newTransaction.type === 'EXPENSE' ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-slate-950/50 border-slate-800 text-slate-500'}`}><ArrowDownRight size={20} /> SAÍDA</button>
                        </div>
                        <div className="space-y-4">
                            <input type="text" placeholder="Descrição (Ex: Feirante, Venda balcão...)" value={newTransaction.description} onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-emerald-500 font-bold" />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Valor R$ 0,00" value={newTransaction.amount} onChange={e => setNewTransaction({ ...newTransaction, amount: e.target.value })} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-emerald-500 font-bold" />
                                <select value={newTransaction.paymentMethod} onChange={e => setNewTransaction({ ...newTransaction, paymentMethod: e.target.value })} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-emerald-500 font-bold">
                                    <option>Dinheiro</option>
                                    <option>Pix</option>
                                    <option>Cartão Crédito</option>
                                    <option>Cartão Débito</option>
                                </select>
                            </div>
                            <select value={newTransaction.category} onChange={e => setNewTransaction({ ...newTransaction, category: e.target.value })} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-emerald-500 font-bold">
                                <option>Vendas</option>
                                <option>Insumos</option>
                                <option>Contas da Empresa</option>
                                <option>Marketing</option>
                                <option>Manutenção</option>
                                <option>Saldo Inicial</option>
                                <option>Outros</option>
                            </select>
                            {newTransaction.category === 'Saldo Inicial' && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="text-amber-500" size={18} />
                                    <p className="text-[10px] text-amber-500 font-medium">Use 'Saldo Inicial' para registrar aportes ou dívidas iniciais (Saída p/ saldo negativo inicial).</p>
                                </div>
                            )}
                        </div>
                        <button onClick={handleSaveTransaction} className="w-full py-4 bg-white text-black rounded-2xl font-black shadow-xl hover:scale-[1.02] transition-all">Confirmar Lançamento</button>
                    </div>
                </div>
            )}

            {showBillModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="font-black text-xl text-white">Agendar Conta</h3>
                            <button onClick={() => setShowBillModal(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><Plus size={20} className="rotate-45" /></button>
                        </div>
                        <div className="space-y-4">
                            <input type="text" placeholder="Nome da Conta (Ex: Aluguel, Luz...)" value={newBill.description} onChange={e => setNewBill({ ...newBill, description: e.target.value })} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-emerald-500 font-bold" />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Valor R$ 0,00" value={newBill.amount} onChange={e => setNewBill({ ...newBill, amount: e.target.value })} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-emerald-500 font-bold" />
                                <input type="date" value={newBill.dueDate} onChange={e => setNewBill({ ...newBill, dueDate: e.target.value })} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-emerald-500 font-bold text-xs" />
                            </div>
                            <select value={newBill.category} onChange={e => setNewBill({ ...newBill, category: e.target.value })} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-emerald-500 font-bold">
                                <option>Contas da Empresa</option>
                                <option>Insumos</option>
                                <option>Equipamentos</option>
                                <option>Pro-labore</option>
                                <option>Outros</option>
                            </select>
                        </div>
                        <button onClick={handleSaveBill} className="w-full py-4 bg-amber-500 text-black rounded-2xl font-black shadow-xl hover:scale-[1.02] transition-all">Salvar Conta a Pagar</button>
                    </div>
                </div>
            )}
        </div>
    );
};
