'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Zap,
  ShieldCheck,
  Check,
  Truck,
  Droplet,
  Info,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Product, ProductVariant } from '@/types';
import { useCart } from '@/context/CartContext';

export default function ProductDetailClient({
  product,
  relatedProducts,
}: {
  product: Product;
  relatedProducts: Product[];
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const variants = product.variants || [];

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    variants[0] || ({} as ProductVariant)
  );
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(product.image_url);
  const [added, setAdded] = useState(false);

  let gallery: string[] = [];
  try {
    gallery = JSON.parse(product.gallery_json || '[]');
  } catch {
    gallery = [product.image_url];
  }
  if (!gallery.includes(product.image_url)) {
    gallery.unshift(product.image_url);
  }

  let nutrition: Record<string, any> = {};
  try {
    nutrition = JSON.parse(product.nutrition_json || '{}');
  } catch {
    nutrition = {};
  }

  const handleAddToCart = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
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
      quantity,
      imageUrl: product.image_url,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/store/checkout');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumbs */}
      <nav className="text-xs text-gray-500 mb-8 flex items-center gap-2">
        <a href="/store" className="hover:text-retu-charcoal">Store</a>
        <span>/</span>
        <a href="/store/products" className="hover:text-retu-charcoal">Products</a>
        <span>/</span>
        <span className="text-retu-charcoal font-semibold">{product.name}</span>
      </nav>

      {/* Main Product Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left: Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-[4/3] sm:aspect-square bg-retu-warm-white/80 rounded-2xl overflow-hidden border border-retu-border p-8 flex items-center justify-center">
            <div className="relative w-full h-full">
              <Image
                src={activeImage}
                alt={product.name}
                fill
                priority
                className="object-contain drop-shadow-xl"
              />
            </div>
            {/* Tag badge */}
            <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-retu-charcoal border border-gray-200">
              {product.flavor} · 75ml Daily Shot
            </span>
          </div>

          {/* Thumbnails */}
          {gallery.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {gallery.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 bg-retu-warm-white/50 shrink-0 transition-all ${
                    activeImage === img ? 'border-retu-charcoal shadow-sm' : 'border-retu-border hover:border-gray-400'
                  }`}
                >
                  <Image src={img} alt={`${product.name} thumbnail ${idx}`} fill className="object-contain p-1.5" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Buy Box */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-retu-pink">
              Patented Formulation · mi-matrix™
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-retu-charcoal tracking-tight mt-1">
              {product.name}
            </h1>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Price Box */}
          <div className="p-4 bg-retu-warm-white/60 rounded-xl border border-retu-border flex items-baseline justify-between">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-retu-charcoal">
                  ₹{((selectedVariant?.price_paise || 0) / 100).toFixed(0)}
                </span>
                {selectedVariant?.compare_at_price_paise && (
                  <span className="text-base text-gray-400 line-through">
                    ₹{(selectedVariant.compare_at_price_paise / 100).toFixed(0)}
                  </span>
                )}
                {selectedVariant?.compare_at_price_paise && (
                  <span className="px-2 py-0.5 rounded bg-retu-pink/10 text-retu-pink font-bold text-xs">
                    Save ₹{((selectedVariant.compare_at_price_paise - selectedVariant.price_paise) / 100).toFixed(0)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                MRP inclusive of all taxes · ₹{Math.round(((selectedVariant?.price_paise || 0) / 100) / (selectedVariant?.pack_size || 6))}/shot
              </p>
            </div>

            <div className="text-right">
              {selectedVariant.stock_quantity > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  In Stock ({selectedVariant.stock_quantity} left)
                </span>
              ) : (
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                  Out of Stock
                </span>
              )}
            </div>
          </div>

          {/* Pack Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Select Protocol Pack Size:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {variants.map((v) => {
                const isSelected = selectedVariant.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-retu-charcoal bg-retu-charcoal text-white shadow-md'
                        : 'border-retu-border bg-white text-gray-800 hover:border-gray-400'
                    }`}
                  >
                    <p className="font-bold text-xs">{v.name}</p>
                    <p className={`text-[11px] mt-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                      ₹{(v.price_paise / 100).toFixed(0)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity and Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex gap-4">
              {/* Quantity */}
              <div className="flex items-center border border-retu-border rounded-lg bg-gray-50 px-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-2 py-2 text-gray-600 hover:text-black font-bold text-sm"
                >
                  -
                </button>
                <span className="px-3 text-sm font-bold text-retu-charcoal">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-2 py-2 text-gray-600 hover:text-black font-bold text-sm"
                >
                  +
                </button>
              </div>

              {/* Add to Cart */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={selectedVariant.stock_quantity <= 0}
                className={`flex-1 py-3.5 px-6 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 ${
                  selectedVariant.stock_quantity <= 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : added
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-retu-charcoal border-2 border-retu-charcoal hover:bg-retu-warm-white'
                }`}
              >
                {added ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Cart</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>
            </div>

            {/* Buy Now Button */}
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={selectedVariant.stock_quantity <= 0}
              className="w-full py-4 bg-retu-charcoal text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md active:scale-98 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-retu-mango fill-retu-mango" />
              <span>Buy Now - Instant Checkout</span>
            </button>
          </div>

          {/* Cold-Chain Dispatch Note */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-900">
            <Truck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Refrigerated Cold-Chain Transit</p>
              <p className="text-emerald-700 mt-0.5">
                Shipped in high-density insulated packaging with reusable ice gel packs to preserve live cultures. Dispatches Monday through Thursday.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ingredients, Nutrition & Usage Deep-Dive */}
      <div className="mt-20 pt-12 border-t border-retu-border">
        <h2 className="text-2xl font-extrabold text-retu-charcoal mb-8 tracking-tight">
          Verified Formulation & Ingredients
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Ingredients */}
          <div className="p-6 rounded-2xl bg-retu-warm-white border border-retu-border space-y-3">
            <div className="flex items-center gap-2 text-retu-charcoal font-bold text-base">
              <Droplet className="w-5 h-5 text-retu-pink" />
              <h3>Full Ingredients List</h3>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              {product.ingredients}
            </p>
            <div className="pt-2 text-[11px] text-gray-500 space-y-1">
              <p>✔ 0% Dairy, Lactose & Whey</p>
              <p>✔ 0% Added Refined Sugar</p>
              <p>✔ 0% Artificial Colors or Flavours</p>
              <p>✔ Zero Chemical Preservatives</p>
            </div>
          </div>

          {/* Usage Protocol */}
          <div className="p-6 rounded-2xl bg-retu-warm-white border border-retu-border space-y-3">
            <div className="flex items-center gap-2 text-retu-charcoal font-bold text-base">
              <Clock className="w-5 h-5 text-retu-purple" />
              <h3>How & When to Consume</h3>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              {product.usage_instructions}
            </p>
            <div className="mt-4 p-3 bg-white rounded-lg border border-retu-border text-xs text-gray-600">
              <p><strong>Storage:</strong> Keep refrigerated (2°C to 8°C). Do not freeze. Consume within 30 days of receipt.</p>
            </div>
          </div>

          {/* Nutrition Table */}
          <div className="p-6 rounded-2xl bg-white border border-retu-border space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-retu-charcoal font-bold text-base">
              <Info className="w-5 h-5 text-emerald-600" />
              <h3>Nutritional Panel (Per 75ml)</h3>
            </div>
            <div className="divide-y divide-gray-100 text-xs">
              <div className="py-1.5 flex justify-between">
                <span className="text-gray-600">Energy</span>
                <span className="font-bold">{nutrition.energy_kcal || 42} kcal</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-gray-600">Carbohydrates</span>
                <span className="font-bold">{nutrition.carbohydrates_g || 8.5} g</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-gray-600">Naturally Occurring Sugar</span>
                <span className="font-bold">{nutrition.naturally_occurring_sugars_g || 4.1} g</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-gray-600">Added Sugar</span>
                <span className="font-bold text-emerald-600">0.0 g (0%)</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-gray-600">Protein</span>
                <span className="font-bold">{nutrition.protein_g || 1.2} g</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-gray-600">Dietary Fiber</span>
                <span className="font-bold">{nutrition.dietary_fiber_g || 1.8} g</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-gray-600">Active Probiotics</span>
                <span className="font-bold text-retu-pink">{nutrition.lgg_probiotics || '10+ Billion CFU'}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-20 pt-12 border-t border-retu-border">
          <h2 className="text-xl font-bold text-retu-charcoal mb-6">Explore Other Formulations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedProducts.map((p) => (
              <a
                key={p.id}
                href={`/store/products/${p.slug}`}
                className="p-4 bg-retu-warm-white/60 border border-retu-border rounded-xl flex items-center gap-4 hover:border-retu-charcoal transition-colors group"
              >
                <div className="relative w-16 h-16 rounded-lg bg-white shrink-0 overflow-hidden">
                  <Image src={p.image_url} alt={p.name} fill className="object-contain p-1" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-retu-charcoal group-hover:text-retu-pink transition-colors">
                    {p.name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">{p.flavor} · 75ml Chilled Shot</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
