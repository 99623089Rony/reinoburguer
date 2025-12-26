
import React from 'react';
import { CheckCircle, Package, Clock, ShoppingBag } from 'lucide-react';

export const SuccessPage: React.FC<{ onReset: () => void, onTrack: () => void }> = ({ onReset, onTrack }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-500">
      <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mb-8 relative">
        <div className="absolute inset-0 bg-green-400 rounded-full opacity-20 animate-ping"></div>
        <CheckCircle size={64} className="text-green-500 relative z-10" />
      </div>

      <h1 className="text-3xl font-black text-slate-900 text-center mb-4">Pedido enviado com sucesso!</h1>
      <p className="text-slate-500 text-center max-w-sm mb-6">
        Sua comida deliciosa já está sendo preparada e chegará em breve.
      </p>

      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 mb-12 animate-in slide-in-from-bottom-2 duration-700">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Cópia enviada via WhatsApp</span>
      </div>

      <div className="w-full max-w-sm bg-gray-50 rounded-3xl p-6 mb-8 border border-gray-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-orange-500">
            <Package size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">NÚMERO DO PEDIDO</p>
            <p className="text-xl font-black text-slate-900">#12345</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-orange-500">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TEMPO ESTIMADO</p>
            <p className="text-xl font-black text-slate-900">30 - 45 min</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={onTrack}
          className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black shadow-xl shadow-orange-200 active:scale-95 transition-all"
        >
          Acompanhar Pedido
        </button>
        <button
          onClick={onReset}
          className="w-full bg-white text-orange-500 border-2 border-orange-100 py-4 rounded-2xl font-bold hover:bg-orange-50 active:scale-95 transition-all"
        >
          Voltar ao Cardápio
        </button>
      </div>
    </div>
  );
};
