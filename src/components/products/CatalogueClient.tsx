'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, ShieldCheck } from 'lucide-react';
import { Product } from '@/types';
import StoreProductCard from '@/components/products/StoreProductCard';

export default function CatalogueClient({ initialProducts }: { initialProducts: Product[] }) {
  const [search, setSearch] = useState('');
  const [flavorFilter, setFlavorFilter] = useState('ALL');

  const flavors = ['ALL', 'Mango', 'Lychee', 'Variety'];

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) => {
      const pName = (p?.name || '').toLowerCase();
      const pFlavor = (p?.flavor || '').toLowerCase();
      const pDesc = (p?.description || '').toLowerCase();
      const q = search.toLowerCase();

      const matchesSearch =
        pName.includes(q) ||
        pFlavor.includes(q) ||
        pDesc.includes(q);

      const matchesFlavor =
        flavorFilter === 'ALL' ||
        (flavorFilter === 'Mango' && pFlavor.includes('mango')) ||
        (flavorFilter === 'Lychee' && pFlavor.includes('lychee')) ||
        (flavorFilter === 'Variety' && pFlavor.includes('variety'));

      return matchesSearch && matchesFlavor;
    });
  }, [initialProducts, search, flavorFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-retu-border">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-retu-pink">Product Catalogue</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-retu-charcoal tracking-tight mt-1">
            mi-biotics™ Daily Protocols
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-xl">
            Clean-label fermented multi-millet shots. Delivered chilled in insulated temperature-controlled packaging with active cold gel packs.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search flavour or pack..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-retu-warm-white/60 border border-retu-border rounded-lg text-xs text-retu-charcoal placeholder-gray-400 focus:outline-none focus:border-retu-charcoal focus:bg-white transition-colors"
            />
          </div>

          {/* Flavour Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {flavors.map((flv) => (
              <button
                key={flv}
                onClick={() => setFlavorFilter(flv)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  flavorFilter === flv
                    ? 'bg-retu-charcoal text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-retu-border hover:bg-gray-50'
                }`}
              >
                {flv === 'ALL' ? 'All Flavours' : flv}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid or Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-24 bg-retu-warm-white/40 rounded-2xl border border-dashed border-gray-300 my-8">
          <Filter className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-700">No matching products found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or reset filter to view all available mi-biotics formulations.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setFlavorFilter('ALL');
            }}
            className="mt-4 px-4 py-2 bg-retu-charcoal text-white rounded text-xs font-semibold hover:bg-black"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-10">
          {filteredProducts.map((product) => (
            <StoreProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Reassurance banner */}
      <div className="mt-16 p-6 rounded-2xl bg-retu-warm-white border border-retu-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            <strong>Refrigeration Promise:</strong> All mi-biotics™ bottles are fresh live cultures. Shipped directly from our dedicated facility in Coimbatore and fulfilment hub in Bengaluru.
          </span>
        </div>
        <span className="font-semibold text-retu-charcoal shrink-0">
          Refrigerate between 2°C – 8°C upon arrival
        </span>
      </div>
    </div>
  );
}
