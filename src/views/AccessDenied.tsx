import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface AccessDeniedProps {
    onBack: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="text-center space-y-6 max-w-md">
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto animate-in zoom-in-50 duration-500">
                    <ShieldAlert size={48} className="text-red-500" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight">Acesso Negado</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Seu email não está autorizado a acessar o painel administrativo.
                    </p>
                    <p className="text-slate-500 text-xs">
                        Entre em contato com o administrador para solicitar acesso.
                    </p>
                </div>

                <button
                    onClick={onBack}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold border border-slate-800 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl"
                >
                    <ArrowLeft size={20} />
                    Voltar ao Cardápio
                </button>
            </div>
        </div>
    );
};
