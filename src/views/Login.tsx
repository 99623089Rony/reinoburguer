
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, Lock, Mail, AlertCircle, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Login: React.FC<{ onLoginSuccess: () => void; onRegisterClick: () => void }> = ({ onLoginSuccess, onRegisterClick }) => {
    const { storeConfig } = useApp();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        const hash = window.location.hash;
        if (hash && hash.includes('error=')) {
            const params = new URLSearchParams(hash.substring(1)); // remove #
            const errorDescription = params.get('error_description');
            const errorCode = params.get('error_code');

            if (errorDescription) {
                // Determine user-friendly message
                let userMessage = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
                if (errorCode === 'otp_expired') {
                    userMessage = 'O link de confirmação expirou. Por favor, solicite um novo acesso ou criação de conta.';
                }
                setError(userMessage);
            }
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Verificar se o email está autorizado na tabela admin_users
            const { data: adminCheck } = await supabase
                .from('admin_users')
                .select('email')
                .eq('email', email)
                .single();

            if (!adminCheck) {
                // Email não autorizado - fazer logout e mostrar erro
                await supabase.auth.signOut();
                throw new Error('Acesso Negado. Seu email não está autorizado a acessar o painel administrativo.');
            }

            onLoginSuccess();
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-8 shadow-2xl shadow-black">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-orange-900/50 transform rotate-3">
                        <span className="font-black text-3xl">{(storeConfig?.name || 'R')[0]}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{storeConfig?.name || 'Reino Burguer'}</h1>
                    <p className="text-slate-500 text-sm">Acesse o painel administrativo</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="shrink-0" size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
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
                                <span className="text-sm">Entrando...</span>
                            </>
                        ) : (
                            <>
                                <LogIn size={20} />
                                <span>Entrar no Sistema</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center space-y-4">
                    <button onClick={() => alert('Contate o administrador do sistema.')} className="text-xs text-slate-500 hover:text-orange-400 transition-colors">
                        Esqueceu sua senha?
                    </button>

                    <div className="border-t border-slate-800 pt-4">
                        <button onClick={onRegisterClick} className="flex items-center justify-center gap-2 w-full text-slate-400 hover:text-white transition-colors text-sm font-medium">
                            <UserPlus size={16} />
                            <span>Não tem uma conta? <span className="text-orange-500">Cadastre-se</span></span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
