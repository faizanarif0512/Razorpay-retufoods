'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/store/account/orders';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid credentials');
      }

      router.push(redirect);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-retu-warm-white/40 min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-retu-border shadow-sm">
        
        {/* Brand Header */}
        <div className="text-center">
          <Link href="/store" className="inline-block relative w-36 h-10 mb-2">
            <Image
              src="/images/brand/retu-logo.png"
              alt="Retü Foods"
              fill
              className="object-contain"
            />
          </Link>
          <h2 className="text-2xl font-extrabold text-retu-charcoal tracking-tight mt-2">
            Customer Account Login
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Access your order history, delivery tracking, and official GST tax invoices.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="Enter your account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-retu-charcoal text-white rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to My Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-retu-border text-center space-y-2 text-xs">
          <p className="text-gray-600">
            Don&apos;t have an account yet?{' '}
            <Link
              href={`/store/account/register?redirect=${encodeURIComponent(redirect)}`}
              className="text-retu-pink font-bold hover:underline"
            >
              Create Account
            </Link>
          </p>
          <p className="text-gray-400 text-[11px] flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Permanent, 256-bit encrypted customer records</span>
          </p>
        </div>

      </div>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[85vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-retu-pink" /></div>}>
      <CustomerLoginForm />
    </Suspense>
  );
}
