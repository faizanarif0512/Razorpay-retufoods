'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function CartDrawer() {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeItem, subtotalPaise } = useCart();

  if (!isCartOpen) return null;

  const FREE_SHIPPING_THRESHOLD_PAISE = 99900;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD_PAISE - subtotalPaise);
  const progressPercent = Math.min(100, Math.round((subtotalPaise / FREE_SHIPPING_THRESHOLD_PAISE) * 100));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-retu-border flex items-center justify-between bg-retu-warm-white/50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-retu-charcoal" />
            <h2 className="font-bold text-lg text-retu-charcoal">Your Cold-Chain Cart</h2>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1 rounded-full text-gray-500 hover:text-retu-charcoal hover:bg-gray-200 transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress Indicator */}
        <div className="p-4 bg-gray-50 border-b border-retu-border text-xs">
          {remainingForFreeShipping > 0 ? (
            <p className="text-gray-700">
              Add <strong className="text-retu-pink">₹{(remainingForFreeShipping / 100).toFixed(0)}</strong> more to get <strong className="text-emerald-700">FREE Cold-Chain Delivery</strong>!
            </p>
          ) : (
            <p className="text-emerald-700 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              You unlocked FREE Refrigerated Cold-Chain Delivery!
            </p>
          )}
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-retu-warm-white flex items-center justify-center text-gray-400 mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-gray-800 text-base">Your cart is empty</h3>
              <p className="text-gray-500 text-xs mt-1 max-w-xs">
                Explore our clinically validated fermented millet gut shots and pick your daily routine.
              </p>
              <Link
                href="/store/products"
                onClick={() => setIsCartOpen(false)}
                className="mt-6 px-6 py-2.5 bg-retu-charcoal text-white rounded-md text-xs font-semibold hover:bg-black transition-colors"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.variantId}
                className="flex gap-4 p-3 bg-white border border-retu-border rounded-lg shadow-sm"
              >
                <div className="relative w-16 h-16 rounded bg-retu-warm-white shrink-0 overflow-hidden">
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-retu-charcoal truncate">
                    {item.productName}
                  </h4>
                  <p className="text-xs text-gray-500">{item.variantName}</p>
                  <p className="text-xs font-bold text-retu-charcoal mt-1">
                    ₹{(item.unitPricePaise / 100).toFixed(0)}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity Selector */}
                    <div className="flex items-center border border-retu-border rounded bg-gray-50">
                      <button
                        onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                        className="p-1 text-gray-600 hover:text-black"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 text-xs font-semibold text-retu-charcoal">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        className="p-1 text-gray-600 hover:text-black"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Delete Item */}
                    <button
                      onClick={() => removeItem(item.variantId)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Checkout */}
        {items.length > 0 && (
          <div className="p-5 border-t border-retu-border bg-retu-warm-white/50 space-y-3">
            <div className="flex justify-between items-center text-sm font-semibold text-retu-charcoal">
              <span>Subtotal</span>
              <span className="text-base font-bold">₹{(subtotalPaise / 100).toFixed(0)}</span>
            </div>
            <p className="text-[11px] text-gray-500">
              Tax included. Cold-chain delivery calculated at checkout.
            </p>

            <div className="space-y-2 pt-2">
              <Link
                href="/store/checkout"
                onClick={() => setIsCartOpen(false)}
                className="w-full py-3 bg-retu-charcoal text-white rounded-md text-sm font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md active:scale-[0.99]"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/store/cart"
                onClick={() => setIsCartOpen(false)}
                className="w-full py-2 bg-transparent text-gray-700 border border-gray-300 rounded-md text-xs font-semibold flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                View Full Cart
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
