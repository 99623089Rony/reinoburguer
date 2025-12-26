import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { ArrowUpRight, TrendingUp, Users, ShoppingBag, CreditCard, Calendar, Package, ArrowDownRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { OrderStatus } from '../types';

export const AdminReports: React.FC = () => {
  const { orders } = useApp();
  const [period, setPeriod] = useState<7 | 30 | 90>(7);

  // Filter orders by finished status and period
  const reportData = useMemo(() => {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - period);

    const filtered = orders.filter(o => {
      const orderDate = new Date(o.timestamp);
      return o.status === OrderStatus.FINISHED && orderDate >= startDate;
    });

    // 1. Calculations
    const totalRevenue = filtered.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = filtered.length;
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const uniqueCustomers = new Set(filtered.map(o => o.phone)).size;

    // 2. Daily Revenue Data for Chart
    const days: Record<string, number> = {};
    for (let i = 0; i < period; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      days[dayLabel] = 0;
    }

    filtered.forEach(o => {
      const dayLabel = new Date(o.timestamp).toLocaleDateString('pt-BR', { weekday: 'short' });
      if (days[dayLabel] !== undefined) {
        days[dayLabel] += o.total;
      }
    });

    const chartData = Object.entries(days).map(([name, val]) => ({ name, val })).reverse();

    // 3. Top Products (General for Period)
    const productStats: Record<string, { quantity: number, revenue: number }> = {};
    filtered.forEach(o => {
      o.items.forEach(item => {
        if (!productStats[item.name]) {
          productStats[item.name] = { quantity: 0, revenue: 0 };
        }
        productStats[item.name].quantity += item.quantity;
        const itemPrice = (Number(item.price) || 0) + (item.extras?.reduce((s, e) => s + (Number(e.price) || 0), 0) || 0);
        productStats[item.name].revenue += itemPrice * item.quantity;
      });
    });

    const topProducts = Object.entries(productStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 4. Sales Summary (Today Only)
    const today = new Date().toLocaleDateString('pt-BR');
    const todayStats: Record<string, number> = {};
    orders.filter(o =>
      new Date(o.timestamp).toLocaleDateString('pt-BR') === today &&
      o.status !== OrderStatus.PENDING // Count all except pending maybe? Or only finished? 
    ).forEach(o => {
      o.items.forEach(item => {
        todayStats[item.name] = (todayStats[item.name] || 0) + item.quantity;
      });
    });

    const todaySummary = Object.entries(todayStats)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);

    return {
      totalRevenue,
      totalOrders,
      averageTicket,
      uniqueCustomers,
      chartData,
      topProducts,
      todaySummary
    };
  }, [orders, period]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white">Dashboard de Vendas</h2>
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          {[7, 30, 90].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p as any)}
              className={`px - 4 py - 2 rounded - xl text - xs font - bold transition - all ${period === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-slate-100'} `}
            >
              {p === 7 ? '7 Dias' : p === 30 ? '30 Dias' : 'Trimestre'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Faturamento Período', val: `R$ ${reportData.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} `, icon: <TrendingUp className="text-blue-400" size={20} />, color: 'blue' },
          { label: 'Novos Clientes', val: reportData.uniqueCustomers.toString(), icon: <Users className="text-emerald-400" size={20} />, color: 'emerald' },
          { label: 'Pedidos Período', val: reportData.totalOrders.toString(), icon: <ShoppingBag className="text-amber-400" size={20} />, color: 'amber' },
          { label: 'Ticket Médio', val: `R$ ${reportData.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} `, icon: <CreditCard className="text-rose-400" size={20} />, color: 'rose' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4 hover:border-slate-700/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">{stat.icon}</div>
              <div className="flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                Live <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
              <h3 className="text-slate-100 text-2xl font-black mt-1">{stat.val}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl space-y-6">
            <div>
              <h3 className="text-slate-100 text-lg font-black">Faturamento Diário</h3>
              <p className="text-slate-500 text-[11px] mt-1 font-medium">Comparativo de vendas no período selecionado</p>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportData.chartData}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 900 }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="val"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorVal)"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Today's Summary Table */}
          <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-slate-100 text-lg font-black">Vendas de Hoje</h3>
                <p className="text-slate-500 text-[11px] mt-1 font-medium">Quantidades vendidas em tempo real</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-600/10 flex items-center justify-center text-orange-500">
                <Calendar size={20} />
              </div>
            </div>

            <div className="space-y-3">
              {reportData.todaySummary.length > 0 ? reportData.todaySummary.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-950/30 rounded-2xl border border-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                      #{idx + 1}
                    </div>
                    <span className="text-sm font-bold text-slate-200">{item.name}</span>
                  </div>
                  <span className="bg-orange-600 text-white text-[10px] font-black px-3 py-1 rounded-full">
                    {item.qty} UNID
                  </span>
                </div>
              )) : (
                <div className="py-10 text-center space-y-2">
                  <p className="text-slate-500 text-sm font-medium italic">Nenhuma venda realizada hoje ainda.</p>
                  <p className="text-slate-600 text-[10px]">As vendas aparecerão aqui assim que os pedidos forem feitos.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Products Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-6">
            <h3 className="text-slate-100 text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" /> Top {period} Dias
            </h3>

            <div className="space-y-6">
              {reportData.topProducts.map((p, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-300 truncate pr-4">{p.name}</span>
                    <span className="text-emerald-400">{p.quantity} unid.</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                      style={{ width: `${(p.quantity / (reportData.topProducts[0]?.quantity || 1)) * 100}% ` }}
                    />
                  </div>
                </div>
              ))}
              {reportData.topProducts.length === 0 && (
                <p className="text-slate-500 text-xs text-center py-4 italic">Sem dados suficientes.</p>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-3xl shadow-xl shadow-blue-900/20 text-white space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest opacity-80">Insights Pro</h3>
            <p className="text-xs leading-relaxed font-medium">
              {reportData.totalRevenue > 0
                ? `Seu ticket médio de R$ ${reportData.averageTicket.toFixed(2)} está saudável.Tente combos para aumentar em 15 % !`
                : 'Comece a vender para ver insights inteligentes sobre seu negócio aqui!'}
            </p>
            <div className="pt-2">
              <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-md">
                Ver Mais Sugestões
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
