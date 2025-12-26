
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, Lock, Mail, User, AlertCircle, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Register: React.FC<{ onBackToLogin: () => void }> = ({ onBackToLogin }) => {
    const { storeConfig } = useApp();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // 1. Verificar se o email já está na lista de admin
            const { data: adminCheck } = await supabase
                .from('admin_users')
                .select('email')
                .eq('email', email)
                .maybeSingle();

            if (adminCheck) {
                // EMAIL CAMPEÃO : Está n lista VIP -> Criar conta direto
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        }
                    }
                });

                if (signUpError) throw signUpError;
                if (!data.user) throw new Error('Erro ao criar usuário.');

                setSuccess('Conta criada com sucesso! Você já pode fazer login.');
            } else {
                // EMAIL COMUM : Não está na lista -> Criar solicitação de acesso

                // Primeiro verifique se já não pediu antes
                const { data: existingRequest } = await supabase
                    .from('admin_access_requests')
                    .select('status')
                    .eq('email', email)
                    .eq('status', 'pending')
                    .maybeSingle();

                if (existingRequest) {
                    throw new Error('Já existe uma solicitação pendente para este email. Aguarde a aprovação do administrador.');
                }

                const { error: requestError } = await supabase
                    .from('admin_access_requests')
                    .insert([{
                        email,
                        name: fullName,
                        status: 'pending'
                    }]);

                if (requestError) throw requestError;

                setSuccess('Sua solicitação de acesso foi enviada para o administrador (Ronilson). Aguarde a liberação para fazer login.');
            }

        } catch (err: any) {
            let msg = err.message || 'Erro ao processar solicitação.';
            if (msg.includes('already registered')) {
                msg = 'Este email já possui uma conta. Tente fazer login ou recupere a senha.';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-8 shadow-2xl shadow-black relative">
                <button
                    onClick={onBackToLogin}
                    className="absolute top-4 left-4 text-slate-500 hover:text-slate-300 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-orange-900/50 transform -rotate-3">
                        <span className="font-black text-3xl">{(storeConfig?.name || 'R')[0]}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{storeConfig?.name || 'Reino Burguer'}</h1>
                    <p className="text-slate-500 text-sm">Crie sua conta para começar</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="shrink-0" size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex flex-col items-center text-center gap-3 text-sm animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2">
                            <UserPlus className="shrink-0" size={18} />
                            <span className="font-bold">Sucesso!</span>
                        </div>
                        <p>{success}</p>
                        <button
                            onClick={onBackToLogin}
                            className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-xs font-bold transition-all shadow-lg"
                        >
                            Ir para Login
                        </button>
                    </div>
                )}

                {!success && (

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-400 ml-1">Nome Completo</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-12 py-3.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                                    placeholder="Seu Nome"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-400 ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-12 py-3.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                                    placeholder="seu@email.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-400 ml-1">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-12 py-3.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-900/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span className="text-sm">Criando conta...</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus size={20} />
                                    <span>Criar Conta</span>
                                </>
                            )}
                        </button>
                    </form>
                )}

                <div className="text-center">
                    <p className="text-xs text-slate-500">
                        Já tem uma conta?{' '}
                        <button onClick={onBackToLogin} className="text-orange-500 font-bold hover:text-orange-400 transition-colors">
                            Fazer Login
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
