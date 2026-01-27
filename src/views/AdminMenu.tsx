import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Search, Edit2, Trash2, X, Image, Check, ShoppingBag, UtensilsCrossed, Settings, LayoutGrid, Palette, Save, Minus, Phone, Clock, Truck, MapPin, Sandwich, Beer, Utensils, Pizza, IceCream, Package, CupSoda, Loader2, Upload, CloudLightning } from 'lucide-react';
import { BurgerIcon, FriesIcon, SodaCanIcon, ComboIcon } from '../components/CategoryIcons';
import { Product, Category, OpeningHour, DeliveryFee } from '../types';
import { useImageUpload } from '../hooks/useImageUpload';

export const AdminMenu: React.FC = () => {
    const {
        products, addProduct, updateProduct, deleteProduct,
        categories, addCategory, updateCategory, deleteCategory,
        storeConfig, updateStoreConfig,
        extrasGroups, addExtrasGroup, updateExtrasGroup, deleteExtrasGroup,
        addExtraOption, updateExtraOption, deleteExtraOption,
        productExtras, toggleProductExtra
    } = useApp();

    const { uploadImage, uploading, error: uploadError } = useImageUpload();

    const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'extras' | 'stock'>('products');
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // --- Products Tab Logic ---
    const [productForm, setProductForm] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        image: '',
        inStock: true,
        highlighted: false,
        trackStock: false,
        stockQuantity: 0 as number | string,
        costPrice: '' as string | number
    });

    const handleOpenProductModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setProductForm({
                name: product.name,
                description: product.description,
                price: product.price.toString().replace('.', ','),
                category: product.category,
                image: product.image,
                inStock: product.inStock,
                highlighted: product.highlighted,
                trackStock: product.trackStock || false,
                stockQuantity: product.stockQuantity || 0,
                costPrice: product.costPrice ? product.costPrice.toString().replace('.', ',') : ''
            });
        } else {
            setEditingProduct(null);
            setProductForm({
                name: '',
                description: '',
                price: '',
                category: categories[0]?.name || '',
                image: '',
                inStock: true,
                highlighted: false,
                trackStock: false,
                stockQuantity: 0,
                costPrice: ''
            });
        }
        setShowProductModal(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const publicUrl = await uploadImage(file, 'products');
            if (publicUrl) {
                setProductForm(prev => ({ ...prev, image: publicUrl }));
            }
        }
    };

    const handleProductSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const productData = {
            name: productForm.name,
            description: productForm.description,
            price: parseFloat(productForm.price.replace(',', '.')),
            category: productForm.category,
            image: productForm.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
            inStock: productForm.inStock,
            highlighted: productForm.highlighted,
            trackStock: productForm.trackStock,
            stockQuantity: productForm.trackStock ? (parseInt(productForm.stockQuantity.toString()) || 0) : 0,
            costPrice: productForm.costPrice ? parseFloat(productForm.costPrice.toString().replace(',', '.')) : null
        };

        try {
            if (editingProduct) {
                await updateProduct({ ...productData, id: editingProduct.id });
            } else {
                await addProduct(productData);
            }
            setShowProductModal(false);
        } catch (error) { console.error(error); }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.category.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // --- Categories Tab Logic ---
    const [newCategory, setNewCategory] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('Sandwich');
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newCategory.trim()) {
            await addCategory(newCategory.trim(), newCategoryIcon);
            setNewCategory('');
            setNewCategoryIcon('Sandwich');
        }
    };

    const handleUpdateCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCategory && editingCategory.name.trim()) {
            await updateCategory(editingCategory.id, editingCategory.name, editingCategory.icon);
            setEditingCategory(null);
        }
    };

    const iconOptions = [
        { id: 'Sandwich', icon: <BurgerIcon size={20} />, label: 'Hambúrguer' },
        { id: 'UtensilsCrossed', icon: <FriesIcon size={20} />, label: 'Batata Frita' },
        { id: 'CupSoda', icon: <SodaCanIcon size={20} />, label: 'Refri Lata' },
        { id: 'ShoppingBag', icon: <ComboIcon size={20} />, label: 'Combo' },
        { id: 'IceCream', icon: <IceCream size={20} />, label: 'Sobremesa' },
        { id: 'Utensils', icon: <Utensils size={20} />, label: 'Porções' },
        { id: 'Package', icon: <Package size={20} />, label: 'Outros' },
    ];

    // --- Store Config Tab Logic ---
    const [storeForm, setStoreForm] = useState({
        coverUrl: '',
        logoUrl: ''
    });

    useEffect(() => {
        if (storeConfig) {
            setStoreForm({
                coverUrl: storeConfig.coverUrl || '',
                logoUrl: storeConfig.logoUrl || ''
            });
        }
    }, [storeConfig]);

    const handleStoreFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'coverUrl' | 'logoUrl') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const publicUrl = await uploadImage(file, 'store-assets');
            if (publicUrl) {
                setStoreForm(prev => ({ ...prev, [field]: publicUrl }));
            }
        }
    };

    const handleStoreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await updateStoreConfig(storeForm);
        alert('Configurações da loja salvas com sucesso!');
    };

    // --- Extras Tab Logic ---
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupMin, setNewGroupMin] = useState(0);
    const [newGroupMax, setNewGroupMax] = useState(1);
    const [newOptionName, setNewOptionName] = useState('');
    const [newOptionPrice, setNewOptionPrice] = useState('');
    const [newOptionMaxQuantity, setNewOptionMaxQuantity] = useState(1);
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editingGroupForm, setEditingGroupForm] = useState({ name: '', min: 0, max: 1 });
    const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
    const [editingOptionForm, setEditingOptionForm] = useState({ name: '', price: '', maxQuantity: 1 });

    const handleAddGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newGroupName.trim()) {
            await addExtrasGroup(newGroupName, newGroupMin, newGroupMax);
            setNewGroupName('');
            setNewGroupMin(0);
            setNewGroupMax(1);
        }
    };

    const handleAddOption = async (e: React.FormEvent, groupId: string) => {
        e.preventDefault();
        if (newOptionName.trim()) {
            const price = parseFloat(newOptionPrice.replace(',', '.')) || 0;
            await addExtraOption(groupId, newOptionName, price, newOptionMaxQuantity);
            setNewOptionName('');
            setNewOptionPrice('');
            setNewOptionMaxQuantity(1);
        }
    };

    const handleUpdateGroup = async (id: string) => {
        await updateExtrasGroup(id, editingGroupForm.name, editingGroupForm.min, editingGroupForm.max);
        setEditingGroupId(null);
    };

    const handleUpdateOption = async (id: string) => {
        await updateExtraOption(id, editingOptionForm.name, parseFloat(editingOptionForm.price.replace(',', '.')) || 0, editingOptionForm.maxQuantity);
        setEditingOptionId(null);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-100 mb-1">Gestão de Cardápio</h2>
                    <p className="text-slate-500 text-sm">Gerencie produtos, categorias e visual da loja</p>
                </div>

                <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-xl overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'products' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Produtos
                    </button>
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'categories' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Categorias
                    </button>
                    <button
                        onClick={() => setActiveTab('extras')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'extras' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Adicionais
                    </button>
                    <button
                        onClick={() => setActiveTab('stock')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'stock' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Estoque
                    </button>
                </div>
            </div>

            {/* --- PRODUCTS VIEW --- */}
            {activeTab === 'products' && (
                <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                        {/* Search and Add Button Row */}
                        <div className="flex gap-3">
                            <div className="relative group flex-1 md:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar lanche..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-slate-200 placeholder:text-slate-600 transition-all"
                                />
                            </div>
                            <button
                                onClick={() => handleOpenProductModal()}
                                className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transform active:scale-95 transition-all shadow-lg shadow-orange-900/20"
                            >
                                <Plus size={20} /> <span className="hidden md:inline">Novo Produto</span>
                            </button>
                        </div>

                        {/* Category Filter Row */}
                        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Categoria:</span>
                            <button
                                onClick={() => setSelectedCategory('Todas')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${selectedCategory === 'Todas'
                                    ? 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-900/20'
                                    : 'text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-300'
                                    }`}
                            >
                                Todas ({products.length})
                            </button>
                            {categories.map(cat => {
                                const count = products.filter(p => p.category === cat.name).length;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.name)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${selectedCategory === cat.name
                                            ? 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-900/20'
                                            : 'text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-300'
                                            }`}
                                    >
                                        {cat.name} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Products Count */}
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Mostrando <span className="font-bold text-slate-300">{filteredProducts.length}</span> produto{filteredProducts.length !== 1 ? 's' : ''}
                            {selectedCategory !== 'Todas' && <span> em <span className="font-bold text-orange-500">{selectedCategory}</span></span>}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredProducts.map(product => (
                            <div key={product.id} className={`bg-slate-900/40 border ${product.inStock ? 'border-slate-800' : 'border-red-900/30 bg-red-900/5'} p-4 rounded-2xl group flex gap-4 hover:border-slate-700 transition-all relative overflow-hidden`}>
                                <div className="w-24 h-24 rounded-xl bg-slate-800 overflow-hidden shrink-0 relative">
                                    <img src={product.image} alt={product.name} className={`w-full h-full object-cover transition-opacity ${product.inStock ? 'opacity-100' : 'opacity-50 grayscale'}`} />
                                    {!product.inStock && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                            <UtensilsCrossed className="text-red-400" size={24} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col justify-between py-0.5">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1 block">{product.category}</span>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleOpenProductModal(product)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => { if (confirm('Excluir?')) deleteProduct(product.id) }} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-slate-200 leading-tight">{product.name}</h3>
                                        <p className="text-slate-500 text-xs mt-1 line-clamp-2">{product.description}</p>
                                    </div>

                                    <div className="flex items-center justify-between mt-3">
                                        <span className="font-black text-slate-100">R$ {product.price.toFixed(2).replace('.', ',')}</span>
                                        {product.highlighted && (
                                            <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full font-bold uppercase border border-yellow-500/20">Destaque</span>
                                        )}
                                        {product.trackStock && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${product.stockQuantity && product.stockQuantity > 0 ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                {product.stockQuantity} un.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- STOCK VIEW --- */}
            {activeTab === 'stock' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500">
                                <Package size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight">Controle de Estoque</h3>
                                <p className="text-slate-500 text-sm">Gerencie a quantidade disponível dos seus produtos.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {products.filter(p => p.trackStock).length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Package size={48} className="mx-auto mb-4 opacity-20" />
                                    <p className="text-sm">Nenhum produto com controle de estoque ativado.</p>
                                    <p className="text-xs mt-2 opacity-60">Ative o "Controlar Estoque" na edição do produto.</p>
                                </div>
                            ) : (
                                products.filter(p => p.trackStock).map(product => (
                                    <StockRow
                                        key={product.id}
                                        product={product}
                                        onUpdate={updateProduct}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- CATEGORIES VIEW --- */}
            {activeTab === 'categories' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2"><LayoutGrid size={20} className="text-orange-500" /> Categorias Atuais</h3>
                        <div className="space-y-3">
                            {categories.map((cat) => (
                                <div key={cat.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-orange-500">
                                            {(() => {
                                                const foundIcon = iconOptions.find(i => i.id === cat.icon);
                                                return foundIcon?.icon || <Utensils size={20} />;
                                            })()}
                                        </div>
                                        {editingCategory?.id === cat.id ? (
                                            <input
                                                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-sm text-white focus:border-orange-500 outline-none"
                                                value={editingCategory.name}
                                                onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                            />
                                        ) : (
                                            <span className="font-medium text-slate-200">{cat.name}</span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {editingCategory?.id === cat.id ? (
                                            <>
                                                <button onClick={handleUpdateCategorySubmit} className="text-emerald-500 hover:text-emerald-400">
                                                    <Save size={18} />
                                                </button>
                                                <button onClick={() => setEditingCategory(null)} className="text-slate-500 hover:text-white">
                                                    <X size={18} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => setEditingCategory(cat)} className="text-slate-600 hover:text-white transition-colors">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => { if (confirm('Excluir?')) deleteCategory(cat.id) }} className="text-slate-600 hover:text-red-500 transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {categories.length === 0 && <p className="text-slate-500 text-sm">Nenhuma categoria cadastrada.</p>}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl h-fit">
                        <h3 className="text-lg font-bold text-slate-200 mb-4">{editingCategory ? 'Editando Categoria' : 'Nova Categoria'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Ícone</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {iconOptions.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => editingCategory ? setEditingCategory({ ...editingCategory, icon: opt.id }) : setNewCategoryIcon(opt.id)}
                                            className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${(editingCategory ? editingCategory.icon === opt.id : newCategoryIcon === opt.id)
                                                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40'
                                                : 'bg-slate-950 text-slate-500 border border-slate-800 hover:border-slate-600'
                                                }`}
                                            title={opt.label}
                                        >
                                            {opt.icon}
                                            <span className="text-[8px] font-bold uppercase tracking-wider">{opt.label.split(' ')[0]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {!editingCategory && (
                                <form onSubmit={handleAddCategory} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nome da Categoria</label>
                                        <input
                                            type="text"
                                            value={newCategory}
                                            onChange={e => setNewCategory(e.target.value)}
                                            placeholder="Ex: Combos Especiais"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!newCategory.trim()}
                                        className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Plus size={18} /> Adicionar Categoria
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- EXTRAS VIEW --- */}
            {activeTab === 'extras' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2"><LayoutGrid size={20} className="text-orange-500" /> Grupos de Adicionais</h3>
                        <div className="space-y-4">
                            {extrasGroups?.map((group) => (
                                <div key={group.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                                    <div className="p-4 flex items-center justify-between bg-slate-800/50">
                                        <div className="flex-1">
                                            {editingGroupId === group.id ? (
                                                <div className="space-y-2">
                                                    <input
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-sm text-white focus:border-orange-500 outline-none"
                                                        value={editingGroupForm.name}
                                                        onChange={e => setEditingGroupForm({ ...editingGroupForm, name: e.target.value })}
                                                    />
                                                    <div className="flex gap-2">
                                                        <div className="flex flex-col">
                                                            <label className="text-[8px] text-slate-500 uppercase font-bold">Min</label>
                                                            <input
                                                                type="number"
                                                                className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:border-orange-500 outline-none"
                                                                value={editingGroupForm.min}
                                                                onChange={e => setEditingGroupForm({ ...editingGroupForm, min: parseInt(e.target.value) || 0 })}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="text-[8px] text-slate-500 uppercase font-bold">Max</label>
                                                            <input
                                                                type="number"
                                                                className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:border-orange-500 outline-none"
                                                                value={editingGroupForm.max}
                                                                onChange={e => setEditingGroupForm({ ...editingGroupForm, max: parseInt(e.target.value) || 1 })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="font-bold text-slate-200 block">{group.name}</span>
                                                    <span className="text-xs text-slate-500">Min: {group.minSelection} | Max: {group.maxSelection}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex gap-2 h-fit">
                                            {editingGroupId === group.id ? (
                                                <button onClick={() => handleUpdateGroup(group.id)} className="text-emerald-500 hover:text-emerald-400">
                                                    <Save size={18} />
                                                </button>
                                            ) : (
                                                <button onClick={() => {
                                                    setEditingGroupId(group.id);
                                                    setEditingGroupForm({ name: group.name, min: group.minSelection, max: group.maxSelection });
                                                }} className="text-slate-400 hover:text-white transition-colors">
                                                    <Edit2 size={18} />
                                                </button>
                                            )}
                                            <button onClick={() => setActiveGroupId(activeGroupId === group.id ? null : group.id)} className="text-slate-400 hover:text-white transition-colors">
                                                {activeGroupId === group.id ? <X size={18} /> : <Plus size={18} />}
                                            </button>
                                            <button onClick={() => deleteExtrasGroup(group.id)} className="text-slate-600 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {activeGroupId === group.id && (
                                        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
                                            <div className="space-y-2 mb-4">
                                                {group.options.map(opt => (
                                                    <div key={opt.id} className="flex justify-between items-center text-sm group/opt">
                                                        {editingOptionId === opt.id ? (
                                                            <div className="flex gap-2 flex-1 mr-4">
                                                                <input
                                                                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:border-orange-500"
                                                                    value={editingOptionForm.name}
                                                                    onChange={e => setEditingOptionForm({ ...editingOptionForm, name: e.target.value })}
                                                                />
                                                                <input
                                                                    className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:border-orange-500"
                                                                    value={editingOptionForm.price}
                                                                    onChange={e => setEditingOptionForm({ ...editingOptionForm, price: e.target.value })}
                                                                />
                                                                <div className="flex flex-col w-12">
                                                                    <label className="text-[8px] text-slate-500 uppercase font-bold text-center">Max</label>
                                                                    <input
                                                                        type="number"
                                                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:border-orange-500 text-center"
                                                                        value={editingOptionForm.maxQuantity}
                                                                        onChange={e => setEditingOptionForm({ ...editingOptionForm, maxQuantity: parseInt(e.target.value) || 1 })}
                                                                    />
                                                                </div>
                                                                <button onClick={() => handleUpdateOption(opt.id)} className="text-emerald-500">
                                                                    <Save size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span className="text-slate-300">{opt.name}</span>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-slate-400 font-bold">R$ {opt.price.toFixed(2).replace('.', ',')}</span>
                                                                    <span className="text-[10px] text-slate-500 border border-slate-800 rounded px-1" title="Quantidade Máxima">x{opt.maxQuantity || 1}</span>
                                                                    <div className="flex gap-2 opacity-0 group-hover/opt:opacity-100 transition-opacity">
                                                                        <button onClick={() => {
                                                                            setEditingOptionId(opt.id);
                                                                            setEditingOptionForm({ name: opt.name, price: opt.price.toString().replace('.', ','), maxQuantity: opt.maxQuantity || 1 });
                                                                        }} className="text-slate-600 hover:text-white"><Edit2 size={14} /></button>
                                                                        <button onClick={() => deleteExtraOption(opt.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={14} /></button>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                                {group.options.length === 0 && <p className="text-xs text-slate-600 italic">Nenhuma opção cadastrada.</p>}
                                            </div>

                                            <form onSubmit={(e) => handleAddOption(e, group.id)} className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={newOptionName}
                                                    onChange={e => setNewOptionName(e.target.value)}
                                                    placeholder="Nova Opção..."
                                                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    value={newOptionPrice}
                                                    onChange={e => setNewOptionPrice(e.target.value)}
                                                    placeholder="R$ 0,00"
                                                    className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                                                />
                                                <input
                                                    type="number"
                                                    value={newOptionMaxQuantity}
                                                    min="1"
                                                    onChange={e => setNewOptionMaxQuantity(parseInt(e.target.value) || 1)}
                                                    placeholder="Max"
                                                    title="Máximo por item"
                                                    className="w-14 bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white focus:border-orange-500 outline-none text-center"
                                                />
                                                <button type="submit" className="bg-orange-600 text-white p-2 rounded-lg hover:bg-orange-500"><Plus size={14} /></button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {useApp().extrasGroups?.length === 0 && <p className="text-slate-500 text-sm">Nenhum grupo de adicionais cadastrado.</p>}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl h-fit">
                        <h3 className="text-lg font-bold text-slate-200 mb-4">Novo Grupo de Adicionais</h3>
                        <form onSubmit={handleAddGroup} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nome do Grupo</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                    placeholder="Ex: Molhos Especiais"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Mínimo</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newGroupMin}
                                        onChange={e => setNewGroupMin(parseInt(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Máximo</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newGroupMax}
                                        onChange={e => setNewGroupMax(parseInt(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!newGroupName.trim()}
                                className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                <Plus size={18} /> Criar Grupo
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- STORE CONFIG VIEW --- */}







            {/* --- ADD/EDIT PRODUCT MODAL --- */}
            {
                showProductModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                            <button
                                onClick={() => setShowProductModal(false)}
                                className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <h3 className="text-2xl font-black text-white mb-6">
                                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                            </h3>

                            <form onSubmit={handleProductSubmit} className="space-y-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Nome do Produto</label>
                                        <input
                                            required
                                            type="text"
                                            value={productForm.name}
                                            onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all"
                                            placeholder="Ex: X-Bacon Real"
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Descrição</label>
                                        <textarea
                                            required
                                            value={productForm.description}
                                            onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all h-24 resize-none"
                                            placeholder="Detalhes do item..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Preço Venda (R$)</label>
                                        <input
                                            required
                                            type="text"
                                            value={productForm.price}
                                            onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all"
                                            placeholder="0,00"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Preço Custo (R$)</label>
                                        <input
                                            type="text"
                                            value={productForm.costPrice}
                                            onChange={e => setProductForm({ ...productForm, costPrice: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all"
                                            placeholder="0,00"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Categoria</label>
                                        <select
                                            value={productForm.category}
                                            onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-all appearance-none"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Imagem do Produto</label>
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-24 h-24 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shrink-0 flex items-center justify-center group">
                                                {productForm.image ? (
                                                    <>
                                                        <img src={productForm.image} alt="Preview" className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setProductForm({ ...productForm, image: '' })}
                                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <Image className="text-slate-700" size={32} />
                                                )}
                                                {uploading && (
                                                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                                        <Loader2 className="animate-spin text-orange-500" size={24} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 space-y-2">
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleFileUpload}
                                                        disabled={uploading}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    <div className={`border-2 border-dashed ${uploadError ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-orange-500/50 hover:bg-slate-800/50'} rounded-xl p-4 transition-all text-center`}>
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Upload className={uploadError ? "text-red-400" : "text-slate-400"} size={20} />
                                                            <span className="text-xs font-bold text-slate-400 uppercase">
                                                                {uploading ? 'Enviando...' : 'Clique para enviar foto'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {uploadError && <p className="text-[10px] text-red-400 font-bold">{uploadError}</p>}
                                                <div className="relative">
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">Ou cole o link</span>
                                                    <input
                                                        type="text"
                                                        value={productForm.image}
                                                        onChange={e => setProductForm({ ...productForm, image: e.target.value })}
                                                        placeholder="https://..."
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                <hr className="border-slate-800" />

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-blue-500">
                                            <Package size={18} />
                                            <h4 className="text-xs font-bold uppercase tracking-wider">Estoque</h4>
                                        </div>
                                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setProductForm({ ...productForm, trackStock: !productForm.trackStock })}>
                                            <div className={`w-12 h-6 rounded-full p-1 transition-all ${productForm.trackStock ? 'bg-blue-600' : 'bg-slate-800'}`}>
                                                <div className={`w-4 h-4 rounded-full bg-white transition-all ${productForm.trackStock ? 'translate-x-6' : ''}`} />
                                            </div>
                                            <span className="text-sm font-bold text-slate-400">Controlar Estoque</span>
                                        </div>

                                        {productForm.trackStock && (
                                            <div className="animate-in slide-in-from-top-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Quantidade Atual</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={productForm.stockQuantity}
                                                    onChange={e => setProductForm({ ...productForm, stockQuantity: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-emerald-500">
                                            <Settings size={18} />
                                            <h4 className="text-xs font-bold uppercase tracking-wider">Opções</h4>
                                        </div>
                                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setProductForm({ ...productForm, inStock: !productForm.inStock })}>
                                            <div className={`w-12 h-6 rounded-full p-1 transition-all ${productForm.inStock ? 'bg-emerald-500' : 'bg-slate-800'}`}>
                                                <div className={`w-4 h-4 rounded-full bg-white transition-all ${productForm.inStock ? 'translate-x-6' : ''}`} />
                                            </div>
                                            <span className="text-sm font-bold text-slate-400">Disponível</span>
                                        </div>

                                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setProductForm({ ...productForm, highlighted: !productForm.highlighted })}>
                                            <div className={`w-12 h-6 rounded-full p-1 transition-all ${productForm.highlighted ? 'bg-orange-600' : 'bg-slate-800'}`}>
                                                <div className={`w-4 h-4 rounded-full bg-white transition-all ${productForm.highlighted ? 'translate-x-6' : ''}`} />
                                            </div>
                                            <span className="text-sm font-bold text-slate-400">Destaque</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-orange-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={20} /> Salvar Produto
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

const StockRow: React.FC<{ product: Product, onUpdate: (p: Product) => Promise<void> }> = ({ product, onUpdate }) => {
    const [localStock, setLocalStock] = useState<number | string>(product.stockQuantity || 0);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setLocalStock(product.stockQuantity || 0);
    }, [product.stockQuantity]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const newQuantity = localStock === '' ? 0 : parseInt(localStock.toString());
            await onUpdate({ ...product, stockQuantity: newQuantity });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const isLowStock = (typeof localStock === 'number' && localStock < 5);

    return (
        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 hover:border-blue-500/30 transition-all group">
            <div className="w-16 h-16 rounded-xl bg-slate-900 overflow-hidden shrink-0">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{product.category}</span>
                    {isLowStock && (
                        <span className="bg-red-500/10 text-red-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                            Baixo Estoque
                        </span>
                    )}
                </div>
                <h4 className="font-bold text-slate-200 truncate">{product.name}</h4>
            </div>

            <div className="flex items-center gap-3">
                <div className="relative">
                    <input
                        type="number"
                        min="0"
                        value={localStock}
                        onChange={(e) => setLocalStock(e.target.value === '' ? '' : parseInt(e.target.value))}
                        className={`w-24 bg-slate-900 border ${isLowStock ? 'border-red-500/30 text-red-400' : 'border-slate-800 text-white'} rounded-xl px-3 py-3 font-mono text-center font-bold focus:border-blue-600 outline-none transition-all`}
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                        <button
                            onClick={() => setLocalStock(prev => (prev === '' ? 0 : parseInt(prev.toString())) + 1)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 w-6 h-3.5 rounded-sm flex items-center justify-center transition-colors"
                        >
                            <Plus size={10} />
                        </button>
                        <button
                            onClick={() => setLocalStock(prev => Math.max(0, (prev === '' ? 0 : parseInt(prev.toString())) - 1))}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 w-6 h-3.5 rounded-sm flex items-center justify-center transition-colors"
                        >
                            <Minus size={10} />
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving || saved || localStock === product.stockQuantity}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${saved
                        ? 'bg-emerald-500 text-white'
                        : localStock !== product.stockQuantity
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                            : 'bg-slate-800 text-slate-600'
                        }`}
                >
                    {saving ? <Loader2 size={20} className="animate-spin" /> : saved ? <Check size={24} /> : <Save size={20} />}
                </button>
            </div>
        </div>
    );
};
