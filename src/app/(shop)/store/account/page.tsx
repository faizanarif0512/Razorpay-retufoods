'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Package, MapPin, LogOut, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

export default function CustomerAccountHub() {
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCustomer() {
      try {
        const res = await fetch('/api/customer/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.customer) {
            setCustomer(data.customer);
          } else {
            router.push('/store/account/login?redirect=/store/account');
          }
        } else {
          router.push('/store/account/login?redirect=/store/account');
        }
      } catch (err) {
        router.push('/store/account/login?redirect=/store/account');
      } finally {
        setLoading(false);
      }
    }
    loadCustomer();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/customer/logout', { method: 'POST' });
    router.push('/store');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-retu-pink" />
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="bg-retu-warm-white/40 min-h-[85vh] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-retu-border">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-retu-pink">Customer Account</span>
            <h1 className="text-3xl font-extrabold text-retu-charcoal tracking-tight mt-1">
              Welcome back, {customer?.name || customer?.email || 'Valued Customer'}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-600 font-semibold px-4 py-2 rounded-xl bg-white border border-retu-border hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Quick Nav: Orders */}
          <Link
            href="/store/account/orders"
            className="bg-white p-6 rounded-2xl border border-retu-border shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-retu-pink/10 text-retu-pink flex items-center justify-center mb-4">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-retu-charcoal group-hover:text-retu-pink transition-colors">
                Order History & Tracking
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Track refrigerated deliveries and download GST tax invoices.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-bold text-retu-charcoal group-hover:text-retu-pink transition-colors">
              <span>View Orders</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Quick Nav: Shop */}
          <Link
            href="/store/products"
            className="bg-white p-6 rounded-2xl border border-retu-border shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-retu-charcoal group-hover:text-emerald-700 transition-colors">
                Shop mi-biotics™
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Alphonso Mango, Lychee, and Discovery Duo packs.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-bold text-retu-charcoal group-hover:text-emerald-700 transition-colors">
              <span>Browse Catalogue</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Saved Details */}
          <div className="bg-white p-6 rounded-2xl border border-retu-border shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center mb-4">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-retu-charcoal">Saved Delivery Profile</h3>
            <div className="mt-2 text-xs text-gray-600 space-y-1">
              <p><strong>Email:</strong> {customer.email}</p>
              <p><strong>Phone:</strong> {customer.phone}</p>
              {customer.address_line1 && (
                <p>
                  <strong>Address:</strong> {customer.address_line1}, {customer.city}, {customer.state} - {customer.postal_code}
                </p>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
