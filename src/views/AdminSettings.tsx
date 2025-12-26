import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { useImageUpload } from '../hooks/useImageUpload';
import { Settings, Phone, Save, CheckCircle, LayoutGrid, Palette, Clock, Truck, MapPin, Plus, Trash2, Image, Upload, Loader2, User as UserIcon } from 'lucide-react';
import { OpeningHour, DeliveryFee } from '../types';

export const AdminSettings: React.FC = () => {
    const { storeConfig, updateStoreConfig, openingHours: dbOpeningHours, updateOpeningHour, deliveryFees: dbDeliveryFees, addDeliveryFee, updateDeliveryFee, deleteDeliveryFee } = useApp();
    const [activeTab, setActiveTab] = useState<'general' | 'hours' | 'visual' | 'profile'>('general');
    const [whatsapp, setWhatsapp] = useState('');
    const [storeName, setStoreName] = useState('');
    const [pixKey, setPixKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Visual Store State
    const { uploadImage, uploading, error: uploadError } = useImageUpload(); // Hook from AdminMenu
    const [visualForm, setVisualForm] = useState({ coverUrl: '', logoUrl: '' });
    const [savingVisual, setSavingVisual] = useState(false);
    const [savedVisual, setSavedVisual] = useState(false);

    // Local state for Opening Hours and Delivery Fees
    const [localOpeningHours, setLocalOpeningHours] = useState<OpeningHour[]>([]);
    const [localDeliveryFees, setLocalDeliveryFees] = useState<DeliveryFee[]>([]);
    const [savingHours, setSavingHours] = useState(false);
    const [savedHours, setSavedHours] = useState(false);
    const [savingFees, setSavingFees] = useState(false);
    const [savedFees, setSavedFees] = useState(false);

    // Profile State
    const [profileForm, setProfileForm] = useState({ name: '', email: '', newPassword: '' });
    const [savingProfile, setSavingProfile] = useState(false);
    const [savedProfile, setSavedProfile] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setProfileForm(prev => ({
                    ...prev,
                    name: user.user_metadata.full_name || '',
                    email: user.email || ''
                }));
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        if (storeConfig) {
            setWhatsapp(storeConfig.whatsapp || '');
            setStoreName(storeConfig.name || '');
            setPixKey(storeConfig.pixKey || '');
            setVisualForm({
                coverUrl: storeConfig.coverUrl || '',
                logoUrl: storeConfig.logoUrl || ''
            });
        }
    }, [storeConfig]);

    useEffect(() => {
        setLocalOpeningHours(dbOpeningHours);
    }, [dbOpeningHours]);

    useEffect(() => {
        setLocalDeliveryFees(dbDeliveryFees);
    }, [dbDeliveryFees]);

    const handleSaveGeneral = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaved(false);
        try {
            await updateStoreConfig({
                whatsapp,
                name: storeName,
                pixKey
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveHours = async () => {
        setSavingHours(true);
        setSavedHours(false);
        try {
            // Find modified hours and update them
            const modifiedHours = localOpeningHours.filter(local => {
                const db = dbOpeningHours.find(h => h.id === local.id);
                return db && (db.open_time !== local.open_time || db.close_time !== local.close_time || db.is_closed !== local.is_closed);
            });

            await Promise.all(modifiedHours.map(h => updateOpeningHour(h)));
            setSavedHours(true);
            setTimeout(() => setSavedHours(false), 3000);
        } catch (error) {
            console.error('Error saving hours:', error);
        } finally {
            setSavingHours(false);
        }
    };

    const handleSaveFees = async () => {
        setSavingFees(true);
        setSavedFees(false);
        try {
            // Find modified fees and update them
            const modifiedFees = localDeliveryFees.filter(local => {
                const db = dbDeliveryFees.find(f => f.id === local.id);
                return db && (db.neighborhood !== local.neighborhood || db.fee !== local.fee || db.is_active !== local.is_active);
            });

            await Promise.all(modifiedFees.map(f => updateDeliveryFee(f)));
            setSavedFees(true);
            setTimeout(() => setSavedFees(false), 3000);
        } catch (error) {
            console.error('Error saving fees:', error);
        } finally {
            setSavingFees(false);
        }
    };

    const handleVisualFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'coverUrl' | 'logoUrl') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = await uploadImage(file, 'store-assets');
        if (url) {
            setVisualForm(prev => ({ ...prev, [field]: url }));
        }
    };

    const handleSaveVisual = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingVisual(true);
        setSavedVisual(false);
        try {
            await updateStoreConfig({
                coverUrl: visualForm.coverUrl,
                logoUrl: visualForm.logoUrl
            });
            setSavedVisual(true);
            setTimeout(() => setSavedVisual(false), 3000);
        } catch (error) {
            console.error('Error saving visual settings:', error);
        } finally {
            setSavingVisual(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        setSavedProfile(false);

        try {
            // Update profile data
            const updates: any = {
                data: { full_name: profileForm.name }
            };

            if (profileForm.newPassword) {
                updates.password = profileForm.newPassword;
            }

            const { error } = await supabase.auth.updateUser(updates);

            if (error) throw error;

            setSavedProfile(true);
            setProfileForm(prev => ({ ...prev, newPassword: '' })); // Clear password field
            setTimeout(() => setSavedProfile(false), 3000);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert(`Erro: ${error.message || 'Erro ao atualizar perfil'}`);
        } finally {
            setSavingProfile(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Tab Header */}
            <div className="flex justify-center">
                <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl shadow-xl">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'general' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Settings size={18} /> Configurações Gerais
                    </button>
                    <button
                        onClick={() => setActiveTab('hours')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'hours' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Clock size={18} /> Horários e Taxas
                    </button>
                    <button
                        onClick={() => setActiveTab('visual')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'visual' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Palette size={18} /> Visual da Loja
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <UserIcon size={18} /> Perfil
                    </button>
                </div>
            </div>

            {activeTab === 'general' && (
                <div className="max-w-2xl mx-auto w-full space-y-8 animate-in slide-in-from-left-4 duration-500">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500">
                                <Settings size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight">Configurações Gerais</h3>
                                <p className="text-slate-500 text-sm">Gerencie as integrações e comportamentos da sua loja.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveGeneral} className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-orange-500">
                                    <Phone size={18} />
                                    <h4 className="text-sm font-bold uppercase tracking-wider">Integração WhatsApp</h4>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 block">Número do WhatsApp (com DDD)</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors">
                                            <span className="font-bold text-sm">+</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={whatsapp}
                                            onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                                            placeholder="5511999999999"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-4 text-white focus:border-emerald-500 outline-none transition-all placeholder:text-slate-700 font-mono"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 italic ml-2">
                                        Insira apenas números, incluindo o código do país (Brasil: 55) e o DDD.
                                    </p>
                                </div>
                            </div>

                            <hr className="border-slate-800/50" />

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-blue-500">
                                    <LayoutGrid size={18} />
                                    <h4 className="text-sm font-bold uppercase tracking-wider">Identidade da Loja</h4>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 block">Nome da Loja</label>
                                    <input
                                        type="text"
                                        value={storeName}
                                        onChange={e => setStoreName(e.target.value)}
                                        placeholder="Ex: Reino Burguer"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-700 font-bold"
                                    />
                                </div>
                            </div>

                            <hr className="border-slate-800/50" />

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-violet-500">
                                    <Palette size={18} />
                                    <h4 className="text-sm font-bold uppercase tracking-wider">Informações de Pagamento</h4>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 block">Chave PIX da Loja</label>
                                    <input
                                        type="text"
                                        value={pixKey}
                                        onChange={e => setPixKey(e.target.value)}
                                        placeholder="Seu e-mail, CPF ou chave aleatória"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:border-violet-500 outline-none transition-all placeholder:text-slate-700 font-mono text-sm"
                                    />
                                    <p className="text-[10px] text-slate-500 italic ml-2">
                                        Esta chave será mostrada aos clientes no momento do checkout se escolherem PIX.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 block">Taxa Débito (%)</label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={storeConfig?.cardDebitFeePercent || ''}
                                                onChange={e => updateStoreConfig({ cardDebitFeePercent: parseFloat(e.target.value) || 0 })}
                                                placeholder="Ex: 1.99"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:border-violet-500 outline-none transition-all placeholder:text-slate-700 font-mono text-sm"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold">%</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 block">Taxa Crédito (%)</label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={storeConfig?.cardCreditFeePercent || ''}
                                                onChange={e => updateStoreConfig({ cardCreditFeePercent: parseFloat(e.target.value) || 0 })}
                                                placeholder="Ex: 4.99"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:border-violet-500 outline-none transition-all placeholder:text-slate-700 font-mono text-sm"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold">%</div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 italic ml-2 -mt-4">
                                    Estas taxas serão adicionadas ao total do pedido quando o cliente selecionar a opção correspondente.
                                </p>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${saved
                                        ? 'bg-emerald-500 text-white shadow-emerald-900/20'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 active:scale-[0.98]'
                                        }`}
                                >
                                    {saving ? (
                                        <span className="animate-pulse">Salvando...</span>
                                    ) : saved ? (
                                        <>
                                            <CheckCircle size={24} /> Configuração Salva!
                                        </>
                                    ) : (
                                        <>
                                            <Save size={24} /> Salvar Alterações
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'hours' && (
                <div className="space-y-12 animate-in slide-in-from-right-4 duration-500">
                    {/* Opening Hours Section */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
                        <div className="absolute top-8 right-8">
                            <div className="bg-slate-950 border border-emerald-500/20 px-3 py-1.5 rounded-full flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 bg-orange-600/20 rounded-2xl flex items-center justify-center text-orange-500">
                                <Clock size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight">Horários de Funcionamento</h3>
                                <p className="text-slate-500 text-sm">Controle sua disponibilidade semanal.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                            {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((dayName, idx) => {
                                const hour = localOpeningHours.find(h => h.day_of_week === idx);
                                if (!hour) return null;
                                return (
                                    <OpeningHourRow
                                        key={idx}
                                        dayName={dayName}
                                        hour={hour}
                                        onUpdate={(updatedHour) => {
                                            setLocalOpeningHours(prev => prev.map(h => h.id === updatedHour.id ? updatedHour : h));
                                        }}
                                    />
                                );
                            })}
                        </div>

                        <div className="mt-8">
                            <button
                                onClick={handleSaveHours}
                                disabled={savingHours}
                                className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${savedHours
                                    ? 'bg-emerald-500 text-white shadow-emerald-900/20'
                                    : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-900/20 active:scale-[0.98]'
                                    }`}
                            >
                                {savingHours ? (
                                    <span className="animate-pulse">Salvando...</span>
                                ) : savedHours ? (
                                    <>
                                        <CheckCircle size={24} /> Horários Salvos!
                                    </>
                                ) : (
                                    <>
                                        <Save size={24} /> Salvar Horários
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Delivery Fees Section */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500">
                                <Truck size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight">Taxas de Entrega</h3>
                                <p className="text-slate-500 text-sm">Gerencie o custo por região.</p>
                            </div>
                        </div>

                        <form
                            className="flex gap-2 mb-10 bg-slate-950 p-2 rounded-2xl border border-slate-800 focus-within:border-blue-500/50 transition-all shadow-inner"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                const form = e.currentTarget;
                                const neighborhoodInput = form.elements.namedItem('neighborhood') as HTMLInputElement;
                                const feeInput = form.elements.namedItem('fee') as HTMLInputElement;
                                const neighborhood = neighborhoodInput.value;
                                const fee = parseFloat(feeInput.value.replace(',', '.'));
                                if (neighborhood && !isNaN(fee)) {
                                    setSaving(true);
                                    await addDeliveryFee(neighborhood, fee);
                                    setSaving(false);
                                    form.reset();
                                }
                            }}
                        >
                            <div className="relative flex-1 group">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                                <input
                                    name="neighborhood"
                                    placeholder="Nome do bairro..."
                                    required
                                    className="w-full bg-transparent pl-10 pr-4 py-3 text-white outline-none placeholder:text-slate-700 text-sm font-bold"
                                />
                            </div>
                            <div className="w-28 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700">R$</span>
                                <input
                                    name="fee"
                                    placeholder="0,00"
                                    required
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-3 text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-700 text-sm font-black text-center"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                                <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Add</span>
                            </button>
                        </form>

                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-4">Regiões Atendidas</h4>
                            <div className="space-y-3">
                                {localDeliveryFees.map((df) => (
                                    <DeliveryFeeRow
                                        key={df.id}
                                        df={df}
                                        onUpdate={(updatedFee) => {
                                            setLocalDeliveryFees(prev => prev.map(f => f.id === updatedFee.id ? updatedFee : f));
                                        }}
                                        onDelete={deleteDeliveryFee}
                                    />
                                ))}

                                {localDeliveryFees.length === 0 && (
                                    <div className="py-20 flex flex-col items-center justify-center opacity-10">
                                        <Truck size={64} className="mb-4" />
                                        <p className="text-xs font-black uppercase tracking-[0.3em] text-center">Nenhuma taxa</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8">
                            <button
                                onClick={handleSaveFees}
                                disabled={savingFees}
                                className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${savedFees
                                    ? 'bg-emerald-500 text-white shadow-emerald-900/20'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 active:scale-[0.98]'
                                    }`}
                            >
                                {savingFees ? (
                                    <span className="animate-pulse">Salvando...</span>
                                ) : savedFees ? (
                                    <>
                                        <CheckCircle size={24} /> Taxas Salvas!
                                    </>
                                ) : (
                                    <>
                                        <Save size={24} /> Salvar Taxas
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'visual' && (
                <div className="max-w-2xl mx-auto w-full space-y-8 animate-in slide-in-from-right-4 duration-500">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-6">
                            <Palette size={24} className="text-blue-500" /> Personalizar Loja
                        </h3>

                        <form onSubmit={handleSaveVisual} className="space-y-8">
                            {/* CAPA STORE */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-400 uppercase">Foto de Capa</label>
                                <div className="relative group w-full h-40 bg-slate-950 border-2 border-dashed border-slate-800 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all">
                                    {visualForm.coverUrl ? (
                                        <img src={visualForm.coverUrl} className="w-full h-full object-cover" alt="Capa" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-600">
                                            <Image size={32} />
                                            <span className="text-xs font-bold uppercase">Sem Capa</span>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                        <div className="flex flex-col items-center text-white gap-2">
                                            {uploading ? <Loader2 className="animate-spin" /> : <Upload size={24} />}
                                            <span className="text-xs font-bold uppercase">Alterar Capa</span>
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleVisualFileUpload(e, 'coverUrl')}
                                        disabled={uploading}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={visualForm.coverUrl}
                                    onChange={e => setVisualForm({ ...visualForm, coverUrl: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-400 focus:text-white outline-none"
                                    placeholder="Ou cole a URL aqui..."
                                />
                            </div>

                            {/* LOGO STORE */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-400 uppercase">Logo da Loja</label>
                                <div className="flex items-center gap-6">
                                    <div className="relative group w-32 h-32 bg-slate-950 border-2 border-dashed border-slate-800 rounded-full overflow-hidden hover:border-blue-500/50 transition-all shrink-0">
                                        {visualForm.logoUrl ? (
                                            <img src={visualForm.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-600">
                                                <Image size={24} />
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                            {uploading ? <Loader2 className="animate-spin text-white" /> : <Upload className="text-white" size={20} />}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleVisualFileUpload(e, 'logoUrl')}
                                            disabled={uploading}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-400 mb-3">
                                            Clique na imagem ao lado para enviar um arquivo do seu computador.
                                        </p>
                                        <input
                                            type="text"
                                            value={visualForm.logoUrl}
                                            onChange={e => setVisualForm({ ...visualForm, logoUrl: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-400 focus:text-white outline-none"
                                            placeholder="Ou cole a URL aqui..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {uploadError && <p className="text-red-400 text-xs font-bold text-center">{uploadError}</p>}

                            <button
                                type="submit"
                                disabled={savingVisual}
                                className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${savedVisual
                                    ? 'bg-emerald-500 text-white shadow-emerald-900/20'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 active:scale-[0.98]'
                                    }`}
                            >
                                {savingVisual ? (
                                    <span className="animate-pulse">Salvando...</span>
                                ) : savedVisual ? (
                                    <>
                                        <CheckCircle size={24} /> Alterações Salvas!
                                    </>
                                ) : (
                                    <>
                                        <Save size={24} /> Salvar Alterações
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'profile' && (
                <div className="max-w-xl mx-auto w-full space-y-8 animate-in slide-in-from-right-4 duration-500">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-500">
                                <UserIcon size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight">Meu Perfil</h3>
                                <p className="text-slate-500 text-sm">Gerencie suas informações de acesso.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveProfile} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email</label>
                                <input
                                    type="email"
                                    value={profileForm.email}
                                    disabled
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-slate-500 cursor-not-allowed select-none"
                                />
                                <p className="text-[10px] text-slate-600 ml-1">O email não pode ser alterado.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nome de Exibição</label>
                                <input
                                    type="text"
                                    value={profileForm.name}
                                    onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Como você quer ser chamado"
                                    required
                                />
                            </div>

                            <hr className="border-slate-800/50" />

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nova Senha</label>
                                <input
                                    type="password"
                                    value={profileForm.newPassword}
                                    onChange={e => setProfileForm(p => ({ ...p, newPassword: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Deixe em branco para manter a atual"
                                    minLength={6}
                                    autoComplete="new-password"
                                    autoCapitalize="none"
                                />
                                <p className="text-[10px] text-slate-500 ml-1">Mínimo de 6 caracteres.</p>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={savingProfile}
                                    className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${savedProfile
                                        ? 'bg-emerald-500 text-white shadow-emerald-900/20'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20 active:scale-[0.98]'
                                        }`}
                                >
                                    {savingProfile ? (
                                        <span className="animate-pulse">Atualizando...</span>
                                    ) : savedProfile ? (
                                        <>
                                            <CheckCircle size={24} /> Atualizado!
                                        </>
                                    ) : (
                                        <>
                                            <Save size={24} /> Salvar Perfil
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Subcomponent for each opening hour row
const OpeningHourRow: React.FC<{ dayName: string, hour: OpeningHour, onUpdate: (hour: OpeningHour) => void }> = ({ dayName, hour, onUpdate }) => {
    const [openTime, setOpenTime] = useState(hour.open_time?.substring(0, 5) || '');
    const [closeTime, setCloseTime] = useState(hour.close_time?.substring(0, 5) || '');

    useEffect(() => {
        setOpenTime(hour.open_time?.substring(0, 5) || '');
        setCloseTime(hour.close_time?.substring(0, 5) || '');
    }, [hour.open_time, hour.close_time]);

    return (
        <div className={`py-4 flex items-center justify-between border-b border-slate-800/40 last:border-0 transition-opacity duration-300 ${hour.is_closed ? 'opacity-40' : 'opacity-100'}`}>
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => onUpdate({ ...hour, is_closed: !hour.is_closed })}
                    className={`relative w-11 h-6 rounded-full transition-all duration-300 ${hour.is_closed ? 'bg-slate-800' : 'bg-orange-600'}`}
                >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${hour.is_closed ? '' : 'translate-x-5'}`} />
                </button>
                <span className="font-black text-slate-100 text-sm w-20 uppercase tracking-tighter">{dayName}</span>
            </div>

            <div className={`flex items-center gap-2 bg-slate-950/50 border border-slate-800/50 rounded-xl px-2 py-1.5 transition-all ${hour.is_closed ? 'pointer-events-none' : 'hover:border-orange-500/20'}`}>
                <input
                    type="time"
                    className="bg-transparent text-slate-100 text-xs font-black outline-none focus:text-orange-500 transition-colors w-16 text-center"
                    value={openTime}
                    onChange={e => {
                        const newTime = e.target.value;
                        setOpenTime(newTime);
                        onUpdate({ ...hour, open_time: newTime });
                    }}
                />
                <span className="text-slate-700 text-[10px] font-black">/</span>
                <input
                    type="time"
                    className="bg-transparent text-slate-100 text-xs font-black outline-none focus:text-orange-500 transition-colors w-16 text-center"
                    value={closeTime}
                    onChange={e => {
                        const newTime = e.target.value;
                        setCloseTime(newTime);
                        onUpdate({ ...hour, close_time: newTime });
                    }}
                />
            </div>
        </div>
    );
};

// Subcomponent for each delivery fee row
const DeliveryFeeRow: React.FC<{ df: DeliveryFee, onUpdate: (fee: DeliveryFee) => void, onDelete: (id: string) => Promise<void> }> = ({ df, onUpdate, onDelete }) => {
    const [localNeighborhood, setLocalNeighborhood] = useState(df.neighborhood);
    const [localFee, setLocalFee] = useState(df.fee.toFixed(2).replace('.', ','));

    useEffect(() => {
        setLocalNeighborhood(df.neighborhood);
        setLocalFee(df.fee.toFixed(2).replace('.', ','));
    }, [df.neighborhood, df.fee]);

    return (
        <div className={`bg-slate-950/60 border border-slate-800/60 p-4 rounded-2xl group flex items-center justify-between hover:border-blue-500/40 transition-all ${!df.is_active ? 'opacity-40 grayscale' : 'opacity-100'}`}>
            <div className="flex items-center gap-4 flex-1">
                <button
                    type="button"
                    onClick={() => onUpdate({ ...df, is_active: !df.is_active })}
                    className={`relative w-9 h-5 rounded-full transition-all duration-300 outline-none shrink-0 ${df.is_active ? 'bg-blue-600' : 'bg-slate-800'}`}
                >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${df.is_active ? 'translate-x-4' : ''}`} />
                </button>

                <input
                    className="bg-transparent text-slate-100 font-black outline-none focus:text-blue-500 w-full text-sm py-1 transition-colors border-b border-transparent focus:border-blue-500/20"
                    value={localNeighborhood}
                    onChange={(e) => {
                        const newVal = e.target.value;
                        setLocalNeighborhood(newVal);
                        onUpdate({ ...df, neighborhood: newVal });
                    }}
                />
            </div>

            <div className="flex items-center gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-1.5 focus-within:border-blue-500/50 transition-all">
                    <span className="text-[10px] text-slate-700 font-black uppercase tracking-tighter">R$</span>
                    <input
                        className="bg-transparent text-slate-100 font-black text-xs w-14 text-center outline-none focus:text-blue-500"
                        value={localFee}
                        onChange={(e) => {
                            const newStr = e.target.value;
                            setLocalFee(newStr);
                            const val = parseFloat(newStr.replace(',', '.'));
                            if (!isNaN(val)) {
                                onUpdate({ ...df, fee: val });
                            }
                        }}
                    />
                </div>

                <button
                    type="button"
                    onClick={() => {
                        if (confirm(`Excluir taxa de ${df.neighborhood}?`)) {
                            onDelete(df.id);
                        }
                    }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-700 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
};
