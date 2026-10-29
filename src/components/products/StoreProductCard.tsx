'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, ArrowRight, Check } from 'lucide-react';
import { Product, ProductVariant } from '@/types';
import { useCart } from '@/context/CartContext';

export default function StoreProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const variants = product.variants || [];
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    variants[0] || ({} as ProductVariant)
  );
  const [addedAnimation, setAddedAnimation] = useState(false);

  const flavor = (product?.flavor || '').toLowerCase();
  const flavorColor =
    flavor.includes('mango')
      ? 'bg-retu-mango/20 text-yellow-800 border-retu-mango/40'
      : flavor.includes('lychee')
      ? 'bg-retu-pink/10 text-retu-pink border-retu-pink/20'
      : 'bg-retu-purple/10 text-retu-purple border-retu-purple/20';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedVariant || selectedVariant.stock_quantity <= 0) return;

    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      productName: product.name,
      variantName: selectedVariant.name,
      flavor: product.flavor,
      sku: selectedVariant.sku,
      packSize: selectedVariant.pack_size,
      unitPricePaise: selectedVariant.price_paise,
      quantity: 1,
      imageUrl: product.image_url,
    });

    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
  };

  return (
    <div className="group bg-white rounded-2xl border border-retu-border overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 hover:border-gray-300">
      
      {/* Product Image Stage */}
      <Link href={`/store/products/${product.slug}`} className="relative block aspect-[4/3] bg-retu-warm-white/70 overflow-hidden p-6">
        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${flavorColor}`}>
            {product.flavor}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 text-gray-700 border border-gray-200 shadow-xs">
            75ml Daily Shot
          </span>
        </div>

        <div className="w-full h-full relative">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-contain group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </Link>

      {/* Card Content */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <Link href={`/store/products/${product.slug}`}>
            <h3 className="font-bold text-lg text-retu-charcoal group-hover:text-retu-pink transition-colors">
              {product.name}
            </h3>
          </Link>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {product.tagline || product.description}
          </p>
        </div>

        {/* Variant Pack Selector */}
        {variants.length > 1 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Select Pack Size:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {variants.map((v) => {
                const isSelected = selectedVariant.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                      isSelected
                        ? 'bg-retu-charcoal text-white border-retu-charcoal shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {v.pack_size}-Pack
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price & Action Button */}
        <div className="pt-3 border-t border-retu-border flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-retu-charcoal">
                ₹{((selectedVariant?.price_paise || 0) / 100).toFixed(0)}
              </span>
              {selectedVariant?.compare_at_price_paise && (
                <span className="text-xs text-gray-400 line-through">
                  ₹{(selectedVariant.compare_at_price_paise / 100).toFixed(0)}
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-500">
              ₹{Math.round(((selectedVariant?.price_paise || 0) / 100) / (selectedVariant?.pack_size || 6))}/shot · Cold transit
            </p>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={selectedVariant.stock_quantity <= 0}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
              selectedVariant.stock_quantity <= 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : addedAnimation
                ? 'bg-emerald-600 text-white'
                : 'bg-retu-charcoal text-white hover:bg-black'
            }`}
          >
            {addedAnimation ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : selectedVariant.stock_quantity <= 0 ? (
              <span>Out of Stock</span>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>

        <div className="text-center">
          <Link
            href={`/store/products/${product.slug}`}
            className="text-[11px] font-semibold text-gray-500 hover:text-retu-charcoal transition-colors inline-flex items-center gap-1"
          >
            <span>View Nutrition & Science Details</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

    </div>
  );
}
