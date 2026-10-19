'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-retu-warm-white/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-retu-border p-8 sm:p-10 shadow-xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="relative w-40 h-10 mx-auto">
            <Image
              src="/images/brand/retu-logo.png"
              alt="Retü Foods"
              fill
              className="object-contain"
            />
          </div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold text-retu-pink bg-retu-pink/10 border border-retu-pink/20 uppercase tracking-wider">
            Seller Administration
          </span>
          <h1 className="text-2xl font-black text-retu-charcoal">Admin Portal</h1>
          <p className="text-xs text-gray-500">Sign in to manage products, orders, inventory and payments</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Admin Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="admin@retufoods.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-retu-charcoal text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Dashboard</span>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-retu-border text-center text-[11px] text-gray-400">
          <p>Default credentials (local setup):</p>
          <code className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 mt-1 inline-block">
            admin@retufoods.com / ChangeMeInProduction2026!
          </code>
        </div>

      </div>
    </div>
  );
}
