'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Mail, User, Phone, ArrowRight, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

function CustomerRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/store/account/orders';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    address_line1: '',
    city: '',
    state: 'Karnataka',
    postal_code: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          password: formData.password,
          address_line1: formData.address_line1.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          postal_code: formData.postal_code.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push(redirect);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check details.');
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
            Create Customer Account
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Your permanent account to track cold-chain deliveries and download official tax invoices.
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
            <div className="relative">
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Priyanshu Sharma"
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
              />
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
            <div className="relative">
              <input
                type="email"
                name="email"
                required
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number (10 Digits) *</label>
            <div className="relative">
              <input
                type="tel"
                name="phone"
                required
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
              />
              <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  placeholder="Min 6 chars"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm *</label>
              <div className="relative">
                <input
                  type="password"
                  name="confirm_password"
                  required
                  placeholder="Repeat pass"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Street Address (Optional default)</label>
            <input
              type="text"
              name="address_line1"
              placeholder="e.g. 13th Cross Road, Indiranagar"
              value={formData.address_line1}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                placeholder="Bengaluru"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-2.5 py-2 bg-gray-50 border border-retu-border rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">State</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-2 py-2 bg-gray-50 border border-retu-border rounded-lg text-xs"
              >
                <option value="Karnataka">Karnataka</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">PIN Code</label>
              <input
                type="text"
                name="postal_code"
                placeholder="560038"
                maxLength={6}
                value={formData.postal_code}
                onChange={handleChange}
                className="w-full px-2.5 py-2 bg-gray-50 border border-retu-border rounded-lg text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-retu-charcoal text-white rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating permanent account...</span>
              </>
            ) : (
              <>
                <span>Create Account & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-retu-border text-center space-y-2 text-xs">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link
              href={`/store/account/login?redirect=${encodeURIComponent(redirect)}`}
              className="text-retu-pink font-bold hover:underline"
            >
              Sign In
            </Link>
          </p>
          <p className="text-gray-400 text-[11px] flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Accounts are stored forever with encrypted passwords</span>
          </p>
        </div>

      </div>
    </div>
  );
}

export default function CustomerRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-[85vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-retu-pink" /></div>}>
      <CustomerRegisterForm />
    </Suspense>
  );
}
