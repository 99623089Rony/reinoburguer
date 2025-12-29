import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Utensils, IceCream, UtensilsCrossed, ShoppingBag, Package, Info, X } from 'lucide-react';
import { BurgerIcon, FriesIcon, SodaCanIcon, ComboIcon } from '../components/CategoryIcons';
import { useApp } from '../context/AppContext';
import { Product } from '../types';

export const CustomerHome: React.FC = () => {
  const { products, addToCart, cart, categories, storeConfig, isStoreOpen, openingHours } = useApp();
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Set initial category when loaded
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].name);
    }
  }, [categories, activeCategory]);

  const filteredProducts = products.filter(p =>
    (activeCategory ? p.category === activeCategory : true) &&
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInCartQty = (id: string) => cart.filter(i => i.id === id).reduce((acc, i) => acc + i.quantity, 0);

  // Helper to get icon - using custom icons to match admin panel
  const getCategoryIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      'Sandwich': <BurgerIcon size={24} />,
      'UtensilsCrossed': <FriesIcon size={24} />,
      'CupSoda': <SodaCanIcon size={24} />,
      'ShoppingBag': <ComboIcon size={24} />,
      'IceCream': <IceCream size={24} />,
      'Utensils': <UtensilsCrossed size={24} />,
      'Package': <Package size={24} />,
      // Legacy fallbacks
      'Burger': <BurgerIcon size={24} />,
      'Beer': <SodaCanIcon size={24} />,
      'FrenchFries': <FriesIcon size={24} />,
      'Cake': <IceCream size={24} />,
    };

    return icons[iconName] || <Utensils size={24} />;
  };

  // Get today's opening hours
  const getTodayHours = () => {
    const dayOfWeek = new Date().getDay();
    const todayConfig = openingHours.find(h => h.day_of_week === dayOfWeek);
    if (!todayConfig || todayConfig.is_closed || !todayConfig.open_time || !todayConfig.close_time) {
      return null;
    }
    return {
      open: todayConfig.open_time.slice(0, 5),
      close: todayConfig.close_time.slice(0, 5)
    };
  };

  const todayHours = getTodayHours();

  return (
    <div className="p-5 space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{storeConfig?.name || 'Reino Burguer'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isStoreOpen ? 'text-emerald-500' : 'text-red-500'}`}>
              {isStoreOpen ? 'Aberto' : 'Fechado'}
            </span>
            {todayHours && (
              <span className="text-[10px] text-slate-500 font-medium">
                • {todayHours.open} às {todayHours.close}
              </span>
            )}
            {!todayHours && !isStoreOpen && (
              <span className="text-[10px] text-slate-400 font-medium">
                • Não abre hoje
              </span>
            )}
          </div>
        </div>
        {storeConfig?.logoUrl ? (
          <img src={storeConfig.logoUrl} alt="Logo" className="w-10 h-10 rounded-full object-cover border-2 border-orange-500 shadow-sm" />
        ) : (
          <div className="bg-orange-500 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs">RB</div>
        )}
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Buscar pratos e ingredientes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-orange-500 transition-all placeholder:text-gray-400 text-sm"
        />
      </div>

      {/* Hero Banner */}
      <div className="relative h-48 rounded-3xl overflow-hidden group shadow-xl bg-gray-200">
        <img
          src={storeConfig?.coverUrl || "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&q=80"}
          alt="Capa da Loja"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
          <p className="text-white/80 text-xs font-medium">Bem-vindo ao</p>
          <h2 className="text-white text-3xl font-bold leading-tight">{storeConfig?.name || 'Reino Burguer'}</h2>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.name)}
            className={`flex flex-col items-center gap-2 min-w-[80px] transition-all transform active:scale-95 ${activeCategory === cat.name ? 'opacity-100' : 'opacity-60'}`}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-orange-600 shadow-sm transition-all ${activeCategory === cat.name ? 'bg-orange-500 text-white shadow-orange-200' : 'bg-white'}`}>
              {getCategoryIcon(cat.icon)}
            </div>
            <span className="text-xs font-bold text-gray-600 tracking-tight whitespace-nowrap">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Product List */}
      <div className="space-y-4">
        <h3 className="text-xl font-black text-gray-900 tracking-tight">
          {activeCategory ? activeCategory : 'Todos os Produtos'}
        </h3>
        <div className="space-y-4">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <div key={product.id} className={`bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex gap-4 transition-all hover:shadow-md relative overflow-hidden group ${!product.inStock ? 'opacity-60 grayscale' : ''}`}>
                <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100 relative">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  {!product.inStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold uppercase border border-white px-1 rounded">Esgotado</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">{product.name}</h4>
                    <p className="text-slate-500 text-[10px] leading-relaxed line-clamp-2">{product.description}</p>
                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="flex items-center gap-1 text-[10px] font-bold text-orange-500 mt-2 hover:underline"
                    >
                      <Info size={12} /> Ver detalhes
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-orange-600 font-extrabold text-sm">R$ {product.price.toFixed(2).replace('.', ',')}</span>

                    {product.inStock ? (
                      getInCartQty(product.id) > 0 ? (
                        <div className="flex items-center bg-orange-100 rounded-full px-1 py-1 gap-3">
                          <button onClick={() => addToCart(product, -1)} disabled={!isStoreOpen} className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-orange-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"><Minus size={14} /></button>
                          <span className="text-xs font-bold text-orange-600">{getInCartQty(product.id)}</span>
                          <button onClick={() => addToCart(product, 1)} disabled={!isStoreOpen} className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"><Plus size={14} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => isStoreOpen ? addToCart(product) : alert('A loja está fechada no momento.')}
                          disabled={!isStoreOpen}
                          className={`px-5 py-2 rounded-xl text-[10px] font-bold shadow-lg transition-all active:scale-95 ${isStoreOpen
                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-100'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
                            }`}
                        >
                          {isStoreOpen ? 'Adicionar' : 'Fechado'}
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
            <div className="text-center py-10 text-gray-400 text-sm">
              Nenhum item nesta categoria.
            </div>
          )}
        </div>
      </div>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300"
            onClick={() => setSelectedProduct(null)}
          />

          {/* Modal Content */}
          <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl pointer-events-auto relative shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">

            {/* Close Button */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all"
            >
              <X size={18} />
            </button>

            {/* Image */}
            <div className="h-64 relative bg-gray-100">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
              {!selectedProduct.inStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-sm font-bold uppercase border-2 border-white px-3 py-1 rounded-lg">Esgotado</span>
                </div>
              )}
            </div>

            <div className="p-6 pb-24 sm:pb-6 space-y-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">{selectedProduct.name}</h3>
                <span className="text-orange-600 font-extrabold text-xl block mt-1">
                  R$ {selectedProduct.price.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição & Ingredientes</h4>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {selectedProduct.description}
                </p>
              </div>

              {/* Action Bar */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                {selectedProduct.inStock ? (
                  getInCartQty(selectedProduct.id) > 0 ? (
                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl">
                      <span className="font-bold text-orange-700 text-sm">Já no carrinho:</span>
                      <div className="flex items-center gap-4 bg-white rounded-xl px-2 py-1 shadow-sm">
                        <button onClick={() => addToCart(selectedProduct, -1)} className="w-8 h-8 flex items-center justify-center text-orange-500 font-bold hover:bg-orange-50 rounded-lg"><Minus size={16} /></button>
                        <span className="text-lg font-black text-slate-800 w-4 text-center">{getInCartQty(selectedProduct.id)}</span>
                        <button onClick={() => addToCart(selectedProduct, 1)} className="w-8 h-8 flex items-center justify-center text-orange-500 font-bold hover:bg-orange-50 rounded-lg"><Plus size={16} /></button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (isStoreOpen) {
                          addToCart(selectedProduct);
                          setSelectedProduct(null); // Close modal after adding (optional UX choice)
                        } else {
                          alert('A loja está fechada.');
                        }
                      }}
                      disabled={!isStoreOpen}
                      className={`w-full py-4 rounded-xl font-black text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${isStoreOpen ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-gray-300 cursor-not-allowed'
                        }`}
                    >
                      <Plus size={20} /> {isStoreOpen ? 'Adicionar ao Carrinho' : 'Loja Fechada'}
                    </button>
                  )
                ) : (
                  <div className="w-full py-4 bg-gray-100 rounded-xl text-center font-bold text-gray-400">
                    Produto Indisponível
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
