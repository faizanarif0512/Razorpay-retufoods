'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus, ArrowRight, ShieldCheck, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotalPaise } = useCart();

  const FREE_SHIPPING_THRESHOLD_PAISE = 99900;
  const isFreeShipping = subtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE;
  const shippingPaise = items.length === 0 ? 0 : isFreeShipping ? 0 : 9900;
  const totalPaise = subtotalPaise + shippingPaise;

  return (
    <div className="bg-retu-warm-white/40 min-h-[80vh] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="mb-8">
          <Link
            href="/store/products"
            className="text-xs font-semibold text-gray-500 hover:text-retu-charcoal flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </Link>
          <h1 className="text-3xl font-black text-retu-charcoal tracking-tight">
            Your Cold-Chain Cart
          </h1>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-retu-border p-12 text-center max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-full bg-retu-warm-white flex items-center justify-center text-gray-400 mx-auto mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-retu-charcoal">Your cart is currently empty</h2>
            <p className="text-xs text-gray-500 mt-2">
              Browse our patented dairy-free fermented millet formulations and build your daily gut routine.
            </p>
            <Link
              href="/store/products"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-retu-charcoal text-white rounded-md text-xs font-bold hover:bg-black transition-colors"
            >
              <span>Browse Catalogue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Cart Items Table */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-retu-border p-6 shadow-sm">
              <div className="divide-y divide-retu-border">
                {items.map((item) => (
                  <div key={item.variantId} className="py-6 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-5 items-center">
                    
                    {/* Thumbnail */}
                    <div className="relative w-24 h-24 rounded-xl bg-retu-warm-white/80 shrink-0 overflow-hidden border border-retu-border p-2">
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        className="object-contain"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="font-bold text-base text-retu-charcoal">
                        {item.productName}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.variantName} · SKU: {item.sku}
                      </p>
                      <p className="text-xs font-bold text-retu-charcoal mt-2">
                        ₹{(item.unitPricePaise / 100).toFixed(0)} per pack
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center border border-retu-border rounded-lg bg-gray-50">
                      <button
                        onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                        className="p-2 text-gray-600 hover:text-black"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-bold text-retu-charcoal">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        className="p-2 text-gray-600 hover:text-black"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Total & Remove */}
                    <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                      <span className="text-base font-extrabold text-retu-charcoal">
                        ₹{((item.unitPricePaise * item.quantity) / 100).toFixed(0)}
                      </span>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="text-gray-400 hover:text-red-500 p-1 text-xs flex items-center gap-1 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sm:hidden text-xs">Remove</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary Box */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-retu-border p-6 shadow-sm space-y-5">
              <h2 className="font-bold text-lg text-retu-charcoal pb-3 border-b border-retu-border">
                Order Summary
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-retu-charcoal">₹{(subtotalPaise / 100).toFixed(0)}</span>
                </div>

                <div className="flex justify-between text-gray-600 items-center">
                  <span>Refrigerated Delivery (2-8°C)</span>
                  {isFreeShipping ? (
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      FREE
                    </span>
                  ) : (
                    <span className="font-bold text-retu-charcoal">₹{(shippingPaise / 100).toFixed(0)}</span>
                  )}
                </div>

                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span>GST & Applicable Taxes</span>
                  <span className="text-gray-600">Included in MRP</span>
                </div>

                <div className="pt-3 border-t border-retu-border flex justify-between text-base font-black text-retu-charcoal">
                  <span>Total Amount</span>
                  <span>₹{(totalPaise / 100).toFixed(0)}</span>
                </div>
              </div>

              {/* Free delivery callout */}
              {!isFreeShipping && (
                <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800 border border-amber-200">
                  Add ₹{((FREE_SHIPPING_THRESHOLD_PAISE - subtotalPaise) / 100).toFixed(0)} more to unlock <strong>FREE Cold-Chain Delivery</strong>!
                </div>
              )}

              {/* Checkout Action */}
              <Link
                href="/store/checkout"
                className="w-full py-4 bg-retu-charcoal text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md active:scale-98"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* Reassurance */}
              <div className="pt-4 border-t border-retu-border space-y-2 text-[11px] text-gray-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Razorpay 256-bit Secure Checkout (UPI, Cards, NetBanking)</span>
                </div>
                <p>
                  Orders dispatched in insulated thermo-boxes with active cold gel packs.
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
