import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, UserCheck, UserX, Clock, Shield, Trash2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AccessRequest {
    id: string;
    email: string;
    name: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

interface AdminUser {
    id: string;
    email: string;
    role: string;
    created_at: string;
}

export const AdminTeam: React.FC = () => {
    const { storeConfig } = useApp();
    const [requests, setRequests] = useState<AccessRequest[]>([]);
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        const { data: reqs } = await supabase
            .from('admin_access_requests')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        const { data: usrs } = await supabase
            .from('admin_users')
            .select('*')
            .order('created_at', { ascending: true });

        if (reqs) setRequests(reqs);
        if (usrs) setAdmins(usrs);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();

        // Realtime subscription for requests
        const sub = supabase.channel('admin_requests')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_access_requests' }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, []);

    const handleApprove = async (request: AccessRequest) => {
        try {
            // 1. Add to authorized admins
            const { error: insertError } = await supabase
                .from('admin_users')
                .insert([{ email: request.email, role: 'admin' }]);

            if (insertError) throw insertError;

            // 2. Update status
            await supabase
                .from('admin_access_requests')
                .update({ status: 'approved' })
                .eq('id', request.id);

            alert(`Acesso liberado para ${request.name}! Agora essa pessoa pode criar a conta.`);
            fetchData();
        } catch (error: any) {
            console.error(error);
            alert('Erro ao aprovar: ' + error.message);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm('Rejeitar solicitação?')) return;

        await supabase
            .from('admin_access_requests')
            .update({ status: 'rejected' })
            .eq('id', id);

        fetchData();
    };

    const handleRemoveAdmin = async (email: string) => {
        if (email === 'ronilsondesouza159@gmail.com') {
            alert('Você não pode remover o Admin Mestre!');
            return;
        }

        if (!confirm(`Tem certeza que deseja remover o acesso de ${email}?`)) return;

        try {
            await supabase.from('admin_users').delete().eq('email', email);
            fetchData();
        } catch (error: any) {
            alert('Erro ao remover: ' + error.message);
        }
    };

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500 pb-24">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Equipe & Acessos</h1>
                    <p className="text-slate-500 mt-1">Gerencie quem tem acesso ao painel administrativo.</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                    <Shield size={24} />
                </div>
            </header>

            {/* Pending Requests */}
            {requests.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Clock size={16} /> Solicitações Pendentes
                    </h2>
                    <div className="grid gap-4">
                        {requests.map(req => (
                            <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border border-orange-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-lg">
                                        {(req.name || '?')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{req.name || 'Sem nome'}</h3>
                                        <p className="text-slate-500 text-sm">{req.email}</p>
                                        <p className="text-xs text-orange-500 mt-1">Solicitado em {new Date(req.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleReject(req.id)}
                                        className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 font-medium text-sm transition-colors"
                                    >
                                        Rejeitar
                                    </button>
                                    <button
                                        onClick={() => handleApprove(req)}
                                        className="px-6 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
                                    >
                                        <UserCheck size={16} /> Aprovar Acesso
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Authorized Admins */}
            <section className="space-y-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <User size={16} /> Administradores Ativos
                </h2>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {admins.map((admin, idx) => (
                        <div key={admin.id} className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${idx !== admins.length - 1 ? 'border-b border-slate-100' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${admin.email === 'ronilsondesouza159@gmail.com' ? 'bg-indigo-600' : 'bg-slate-500'}`}>
                                    {admin.email[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800">{admin.email}</h3>
                                        {admin.email === 'ronilsondesouza159@gmail.com' && (
                                            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">MESTRE</span>
                                        )}
                                    </div>
                                    <p className="text-slate-400 text-xs">Adicionado em {new Date(admin.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {admin.email !== 'ronilsondesouza159@gmail.com' && (
                                <button
                                    onClick={() => handleRemoveAdmin(admin.email)}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Remover acesso"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    ))}
                    {admins.length === 0 && !loading && (
                        <div className="p-8 text-center text-slate-400">Nenhum administrador encontrado.</div>
                    )}
                </div>
            </section>
        </div>
    );
};
