import React, { useState, useEffect } from 'react';
import { Printer, Wifi, Usb, CheckCircle2, AlertCircle, RefreshCcw, FileText, Bluetooth } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PrinterService } from '../lib/PrinterService';
import { supabase } from '../lib/supabase';
import { PrinterConfig } from '../types';

export const AdminPrinter: React.FC = () => {
    const { storeConfig, fetchStoreConfig } = useApp();
    const [loading, setLoading] = useState(false);
    const [connectedType, setConnectedType] = useState<'usb' | 'bluetooth' | null>(null);

    // Initial state from storeConfig or defaults
    const [config, setConfig] = useState<PrinterConfig>(
        storeConfig?.printerSettings || {
            type: 'usb',
            autoPrint: false,
            paperSize: '58mm',
            copies: 1
        }
    );

    useEffect(() => {
        if (PrinterService.isConnected()) {
            setConnectedType(config.type as any);
        }
    }, [config.type]);

    const handleConnect = async (type: 'usb' | 'bluetooth') => {
        setLoading(true);
        const success = await PrinterService.connect(type);
        if (success) {
            setConnectedType(type);
            setConfig(prev => ({ ...prev, type }));
            alert(`Impressora ${type.toUpperCase()} conectada com sucesso!`);
        } else {
            alert(`Falha ao conectar via ${type.toUpperCase()}. Verifique se a impressora está ligada e no modo correto.`);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('store_config')
                .update({ printer_settings: config })
                .eq('id', storeConfig?.id);

            if (error) throw error;
            await fetchStoreConfig();
            alert('Configurações salvas!');
        } catch (error) {
            console.error('Error saving printer settings:', error);
            alert('Erro ao salvar configurações.');
        } finally {
            setLoading(false);
        }
    };

    const handleTestPrint = async () => {
        if (!connectedType) {
            alert('Conecte a impressora primeiro!');
            return;
        }

        // Mock order for testing
        const mockOrder = {
            id: 'TESTE-PRINT',
            customerName: 'Cliente Teste',
            phone: '(00) 00000-0000',
            address: 'Rua de Teste, 123 - Bairro',
            total: 25.00,
            paymentMethod: 'Dinheiro',
            status: 'Pendente' as any,
            items: [
                { name: 'X-Burger Teste', quantity: 1, price: 20.00 },
                { name: 'Refrigerante', quantity: 1, price: 5.00 }
            ] as any,
            timestamp: new Date()
        };

        const success = await PrinterService.printOrder(mockOrder, config.paperSize);
        if (!success) alert('Erro ao imprimir teste.');
    };

    return (
        <div className="p-6 space-y-6 max-w-4xl animate-in fade-in duration-500">
            <header className="flex flex-col gap-1">
                <h1 className="text-2xl font-black text-white flex items-center gap-3">
                    <Printer className="text-blue-500" /> Gerenciamento de Impressora
                </h1>
                <p className="text-slate-500 text-sm">Configure sua impressora térmica para recibos e automação.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Connection Status Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Status da Conexão</h2>
                        {connectedType ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                <CheckCircle2 size={12} /> {connectedType.toUpperCase()} ATIVO
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                                <AlertCircle size={12} /> DESCONECTADO
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col items-center justify-center p-8 bg-slate-950/50 rounded-2xl border border-slate-800/50 border-dashed">
                        {connectedType === 'bluetooth' ? <Bluetooth size={48} className="text-blue-500" /> : <Printer size={48} className={connectedType ? 'text-blue-500' : 'text-slate-700'} />}
                        <p className="mt-4 text-xs text-slate-500 text-center max-w-[200px]">
                            {connectedType
                                ? `Sua impressora ${connectedType.toUpperCase()} está pronta.`
                                : 'Selecione abaixo o método de conexão da sua impressora.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleConnect('usb')}
                            disabled={loading}
                            className={`py-4 rounded-2xl font-black transition-all flex flex-col items-center justify-center gap-2 border ${connectedType === 'usb' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                        >
                            <Usb size={20} />
                            <span className="text-[10px]">USB / SERIAL</span>
                        </button>
                        <button
                            onClick={() => handleConnect('bluetooth')}
                            disabled={loading}
                            className={`py-4 rounded-2xl font-black transition-all flex flex-col items-center justify-center gap-2 border ${connectedType === 'bluetooth' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                        >
                            <Bluetooth size={20} />
                            <span className="text-[10px]">BLUETOOTH</span>
                        </button>
                    </div>

                    {connectedType && (
                        <button
                            onClick={handleTestPrint}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <FileText size={18} /> Imprimir Teste
                        </button>
                    )}
                </div>

                {/* Settings Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl text-white">
                    <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Configurações</h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-950/30 rounded-2xl border border-slate-800">
                            <div>
                                <p className="text-sm font-bold">Impressão Automática</p>
                                <p className="text-[10px] text-slate-500">Imprimir assim que o pedido chegar</p>
                            </div>
                            <button
                                onClick={() => setConfig({ ...config, autoPrint: !config.autoPrint })}
                                className={`w-12 h-6 rounded-full transition-all relative ${config.autoPrint ? 'bg-orange-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.autoPrint ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Tamanho do Papel</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['58mm', '80mm'].map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setConfig({ ...config, paperSize: size as any })}
                                        className={`py-3 rounded-xl border text-xs font-bold transition-all ${config.paperSize === size ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Nº de Cópias</label>
                            <input
                                type="number"
                                min="1"
                                max="5"
                                value={config.copies}
                                onChange={(e) => setConfig({ ...config, copies: parseInt(e.target.value) || 1 })}
                                className="w-full bg-slate-950/30 border border-slate-800 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black shadow-xl shadow-orange-900/10 transition-all flex items-center justify-center gap-2"
                    >
                        Salvar Configurações
                    </button>
                </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-3xl space-y-3">
                <h3 className="text-blue-400 text-sm font-bold flex items-center gap-2">
                    <AlertCircle size={16} /> Dica de Uso
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                    Para que a impressão automática funcione, mantenha esta aba aberta ou o painel administrativo ativo em seu navegador.
                    Recomendamos usar o <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong> para melhor compatibilidade com a conexão USB.
                </p>
            </div>
        </div>
    );
};
