import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, CheckCircle, Clock, QrCode } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { OrderStatus } from '../types';

interface PaymentPixProps {
    orderId: string;
    amount: number;
    createdAt?: Date;
    onBack: () => void;
    onSuccess: () => void;
}

export const PaymentPix: React.FC<PaymentPixProps> = ({ orderId, amount, createdAt, onBack, onSuccess }) => {
    const { updateOrderStatus, storeConfig, deleteOrder } = useApp();
    const [qrCode, setQrCode] = useState('');
    const [qrCodeBase64, setQrCodeBase64] = useState('');
    const [pixCode, setPixCode] = useState('');
    const [paymentId, setPaymentId] = useState('');
    const [loading, setLoading] = useState(true);

    const [copied, setCopied] = useState(false);

    // Calculate initial time left based on createdAt
    const [timeLeft, setTimeLeft] = useState(() => {
        if (!createdAt) return 600;
        const now = new Date();
        const created = new Date(createdAt);
        const diffSeconds = Math.floor((now.getTime() - created.getTime()) / 1000);
        const remaining = 600 - diffSeconds;
        return remaining > 0 ? remaining : 0;
    });

    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'expired'>('pending');

    useEffect(() => {
        if (timeLeft === 0) setPaymentStatus('expired');
    }, [timeLeft]);

    useEffect(() => {
        createPixPayment();
    }, []);

    useEffect(() => {
        // Timer countdown
        if (timeLeft > 0 && paymentStatus === 'pending') {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0) {
            setPaymentStatus('expired');
        }
    }, [timeLeft, paymentStatus]);

    useEffect(() => {
        // Poll payment status every 3 seconds
        if (paymentStatus === 'pending') {
            const interval = setInterval(checkPaymentStatus, 3000);
            return () => clearInterval(interval);
        }
    }, [paymentStatus, orderId]);

    const createPixPayment = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase.functions.invoke('create-pix-payment', {
                body: {
                    orderId,
                    amount: Number(amount),
                    description: `Pedido Reino Burguer #${orderId.slice(-5).toUpperCase()}`,
                },
            });

            if (error) {
                console.error('Function execution error:', error);
                throw new Error(error.message || 'Erro na execução da função no Supabase');
            }

            if (!data || data.success === false) {
                console.error('Payment generation failed:', data);
                throw new Error(data?.message || data?.error || 'Erro ao processar pagamento com Mercado Pago');
            }

            if (!data.qrCode || !data.qrCodeBase64) {
                console.error('Invalid response data from function:', data);
                throw new Error('Resposta incompleta da função de pagamento');
            }

            setQrCode(data.qrCode);
            setQrCodeBase64(data.qrCodeBase64);
            setPixCode(data.qrCode);
            setPaymentId(data.paymentId);
        } catch (error: any) {
            console.error('Detailed error in createPixPayment:', error);
            const errorMsg = error.message || 'Erro desconhecido';

            alert(`Erro ao gerar PIX: ${errorMsg}\n\nSe o erro persistir, verifique suas credenciais do Mercado Pago.`);
        } finally {
            setLoading(false);
        }
    };

    const checkPaymentStatus = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('payment_status')
                .eq('id', orderId)
                .single();

            if (error) throw error;

            if (data.payment_status === 'paid') {
                // Force update status to PENDING so admin notification plays
                await supabase
                    .from('orders')
                    .update({ status: OrderStatus.PENDING })
                    .eq('id', orderId);

                setPaymentStatus('paid');
                setTimeout(() => onSuccess(), 2000);
            }
        } catch (error) {
            console.error('Error checking payment status:', error);
        }
    };



    const copyPixCode = () => {
        navigator.clipboard.writeText(pixCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-orange-500/20 rounded-full animate-ping absolute inset-0"></div>
                    <div className="w-20 h-20 border-t-4 border-orange-500 rounded-full animate-spin"></div>
                </div>
                <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest">Iniciando Pagamento</h2>
                    <p className="text-slate-500 text-sm mt-2">Conectando com o Mercado Pago...</p>
                </div>
            </div>
        );
    }

    if (paymentStatus === 'paid') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="text-center space-y-6">
                    <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-emerald-900/40 rotate-12 animate-in zoom-in-50 duration-500">
                        <CheckCircle size={48} className="text-white -rotate-12" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Pedido Pago!</h2>
                        <p className="text-slate-400 max-w-[250px] mx-auto text-sm">Excelente! Seu pagamento foi confirmado com sucesso. Estamos preparando seu pedido agora.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (paymentStatus === 'expired') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="text-center max-w-sm space-y-6">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                        <Clock size={40} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-white uppercase">Link Expirado</h2>
                        <p className="text-slate-500 text-sm">O tempo limite para este pagamento PIX (10 minutos) foi atingido.</p>
                    </div>
                    <button
                        onClick={async () => {
                            if (window.confirm('Deseja realmente cancelar este pedido?')) {
                                await deleteOrder(orderId);
                                onBack();
                            }
                        }}
                        className="w-full bg-red-600/10 text-red-500 border border-red-500/20 px-8 py-4 rounded-2xl font-black hover:bg-red-600/20 transition-all active:scale-95 mb-3"
                    >
                        Cancelar Pedido
                    </button>
                    <button
                        onClick={onBack}
                        className="w-full bg-slate-900 text-white px-8 py-4 rounded-2xl font-black border border-slate-800 hover:bg-slate-800 transition-all active:scale-95"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            <header className="sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-slate-900 p-6 flex items-center gap-4 z-10">
                <button onClick={onBack} className="p-2 hover:bg-slate-900 rounded-full text-slate-400 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-lg font-black text-white tracking-tight uppercase italic underline decoration-orange-500 decoration-4 underline-offset-4">Checkout PIX</h1>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto pb-32">
                <div className="p-6 max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Timer */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center justify-between shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pague em até</p>
                                <span className="text-xl font-black text-white tabular-nums leading-none">{formatTime(timeLeft)}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor Total</p>
                            <p className="text-xl font-black text-orange-500 leading-none">R$ {amount.toFixed(2).replace('.', ',')}</p>
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="bg-white p-6 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-orange-900/10">
                        {paymentId && typeof paymentId === 'string' && paymentId.startsWith('MOCK') && (
                            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg shadow-blue-500/30">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> MODO TESTE
                            </div>
                        )}
                        <div className="border-4 border-slate-50 rounded-[2rem] p-2">
                            {qrCodeBase64 ? (
                                <img
                                    src={(typeof qrCodeBase64 === 'string' && qrCodeBase64.startsWith('http')) ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                                    alt="QR Code PIX"
                                    className="w-full h-auto rounded-[1.5rem]"
                                />
                            ) : (
                                <div className="aspect-square flex items-center justify-center bg-slate-50 rounded-[1.5rem]">
                                    <QrCode size={64} className="text-slate-200" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PIX Code */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 ml-1">PIX Copia e Cola</label>
                            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 break-all text-xs text-slate-300 font-mono leading-relaxed relative group">
                                {pixCode}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-slate-950/80 pointer-events-none rounded-2xl"></div>
                            </div>
                        </div>
                        <button
                            onClick={copyPixCode}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3 shadow-xl ${copied
                                ? 'bg-emerald-500 text-white shadow-emerald-900/20'
                                : 'bg-white hover:bg-slate-100 text-slate-950'
                                }`}
                        >
                            {copied ? (
                                <>
                                    <CheckCircle size={20} /> Copiado!
                                </>
                            ) : (
                                <>
                                    <Copy size={20} /> Copiar Código
                                </>
                            )}
                        </button>
                    </div>


                    {/* Status Indicator */}
                    <div className="text-center py-4">
                        <div className="inline-flex items-center gap-3 bg-slate-900 border border-slate-800 px-6 py-3 rounded-full shadow-lg">
                            <div className="relative flex items-center justify-center">
                                <div className="w-3 h-3 bg-orange-500 rounded-full animate-ping absolute"></div>
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            </div>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Sincronizando com o Banco...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
