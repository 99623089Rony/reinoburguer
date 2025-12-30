import React, { useState } from 'react';
import { Search, Plus, Minus, X, Utensils, Beer, IceCream, Sandwich, Pizza, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CustomerSearch: React.FC = () => {
    const { products, addToCart, cart, categories } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
        return matchesSearch && matchesCategory;
    });

    const getInCartQty = (id: string) => cart.filter(i => i.id === id).reduce((acc, i) => acc + i.quantity, 0);

    // Use category names for popular searches (dynamic from database)
    const popularTerms = categories.slice(0, 5).map(c => c.name);

    return (
        <div className="min-h-screen bg-gray-50/50 p-5 pb-24 space-y-6">
            <header className="pt-2">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Busca Inteligente</h1>
                <p className="text-slate-500 text-sm">O que você deseja saborear hoje?</p>
            </header>

            {/* Modern Search Bar */}
            <div className="sticky top-4 z-10">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 transition-colors group-focus-within:text-orange-600" size={20} />
                    <input
                        type="text"
                        placeholder="Produtos, ingredientes ou categorias..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-12 py-5 bg-white rounded-2xl border-none shadow-xl shadow-orange-900/5 focus:ring-2 focus:ring-orange-500 transition-all placeholder:text-gray-400 text-base font-medium"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Filters / Suggestions */}
            {!searchQuery && !selectedCategory && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Buscas Populares</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {popularTerms.map(term => (
                            <button
                                key={term}
                                onClick={() => setSearchQuery(term)}
                                className="px-4 py-2 bg-white rounded-full text-sm font-bold text-slate-600 border border-slate-100 shadow-sm hover:border-orange-200 hover:text-orange-600 transition-all active:scale-95"
                            >
                                {term}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Categories Horizontal Scroll */}
            <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Categorias</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-5 px-5">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${!selectedCategory ? 'bg-slate-900 text-white shadow-slate-200' : 'bg-white text-slate-600 border border-slate-100'}`}
                    >
                        Tudo
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.name)}
                            className={`px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${selectedCategory === cat.name ? 'bg-orange-500 text-white shadow-orange-200' : 'bg-white text-slate-600 border border-slate-100'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Content */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        {filteredProducts.length} {filteredProducts.length === 1 ? 'Resultado' : 'Resultados'}
                    </h3>
                    {(searchQuery || selectedCategory) && (
                        <button
                            onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                            className="text-xs font-bold text-orange-600"
                        >
                            Limpar Filtros
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {filteredProducts.length > 0 ? (
                        filteredProducts.map(product => (
                            <div key={product.id} className={`bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex gap-4 transition-all hover:shadow-md relative overflow-hidden group ${!product.inStock ? 'opacity-60 grayscale' : ''}`}>
                                <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100 relative">
                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    {!product.inStock && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <span className="text-white text-[10px] font-bold uppercase border border-white px-1 rounded">Esgotado</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">{product.name}</h4>
                                            <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">{product.category}</span>
                                        </div>
                                        <p className="text-slate-500 text-[10px] leading-relaxed line-clamp-2">{product.description}</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-orange-600 font-extrabold text-sm">R$ {product.price.toFixed(2).replace('.', ',')}</span>

                                        {product.inStock ? (
                                            getInCartQty(product.id) > 0 ? (
                                                <div className="flex items-center bg-orange-100 rounded-full px-1 py-1 gap-3">
                                                    <button onClick={() => addToCart(product, -1)} className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-orange-500 shadow-sm"><Minus size={14} /></button>
                                                    <span className="text-xs font-bold text-orange-600">{getInCartQty(product.id)}</span>
                                                    <button onClick={() => addToCart(product, 1)} className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-sm"><Plus size={14} /></button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => addToCart(product)}
                                                    className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-[10px] font-bold shadow-lg shadow-orange-100 transition-all active:scale-95"
                                                >
                                                    Adicionar
                                                </button>
                                            )
                                        ) : (
                                            <span className="text-red-400 text-xs font-bold">Indisponível</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 px-10 text-center space-y-4">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                                <Search size={40} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Ops! Nada encontrado</h4>
                                <p className="text-slate-500 text-sm">Tente buscar por outros termos ou explore as categorias acima.</p>
                            </div>
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                                className="px-6 py-2 bg-orange-100 text-orange-600 rounded-full text-xs font-bold hover:bg-orange-200 transition-colors"
                            >
                                Limpar Busca
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
