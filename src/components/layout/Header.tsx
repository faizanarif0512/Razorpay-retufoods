'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Menu, X, ShieldCheck, User } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function Header() {
  const { itemCount, setIsCartOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Top Brand Notification Bar */}
      <div className="bg-retu-charcoal text-white text-xs py-2 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>PATENTED MULTI-MILLET PROBIOTIC MATRIX · FREE COLD-CHAIN DELIVERY ON ORDERS OVER ₹999</span>
      </div>

      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-retu-border transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/store" className="flex items-center gap-3 group">
            <div className="relative w-36 h-10 sm:w-44 sm:h-12">
              <Image
                src="/images/brand/retu-logo.png"
                alt="Retü Foods"
                fill
                priority
                className="object-contain object-left"
              />
            </div>
            <span className="hidden md:inline-block px-2 py-0.5 text-[11px] font-semibold tracking-wider text-retu-pink border border-retu-pink/30 rounded uppercase bg-retu-pink/5">
              Store
            </span>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-retu-charcoal">
            <Link href="/store" className="hover:text-retu-pink transition-colors">
              Store Home
            </Link>
            <Link href="/store/products" className="hover:text-retu-pink transition-colors">
              Shop Catalogue
            </Link>
            <Link href="/store/science" className="hover:text-retu-pink transition-colors">
              The Science
            </Link>
            <Link href="/store/our-story" className="hover:text-retu-pink transition-colors">
              Our Story
            </Link>
            <Link href="/store/faq" className="hover:text-retu-pink transition-colors">
              FAQ
            </Link>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-4">
            {/* Account / My Orders */}
            <Link
              href="/store/account/orders"
              className="flex items-center gap-1.5 text-xs font-semibold text-retu-charcoal hover:text-retu-pink px-3 py-1.5 rounded-full hover:bg-retu-warm-white transition-colors"
              title="My Account & Orders"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">My Account</span>
            </Link>

            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-full text-retu-charcoal hover:bg-retu-warm-white transition-colors flex items-center justify-center group"
              aria-label="View Shopping Cart"
            >
              <ShoppingBag className="w-6 h-6 group-hover:scale-105 transition-transform" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-retu-pink text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-retu-charcoal hover:text-retu-pink focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-retu-border px-4 pt-3 pb-6 space-y-3">
            <Link
              href="/store"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-retu-charcoal hover:text-retu-pink"
            >
              Store Home
            </Link>
            <Link
              href="/store/products"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-retu-charcoal hover:text-retu-pink"
            >
              Shop Catalogue
            </Link>
            <Link
              href="/store/science"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-retu-charcoal hover:text-retu-pink"
            >
              The Science
            </Link>
            <Link
              href="/store/our-story"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-retu-charcoal hover:text-retu-pink"
            >
              Our Story
            </Link>
            <Link
              href="/store/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-retu-charcoal hover:text-retu-pink"
            >
              FAQ & Info
            </Link>
            <Link
              href="/store/account/orders"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-retu-charcoal hover:text-retu-pink"
            >
              My Account & Orders
            </Link>
            <div className="pt-3 border-t border-retu-border text-xs text-gray-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Official Retü Foods Webstore</span>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
