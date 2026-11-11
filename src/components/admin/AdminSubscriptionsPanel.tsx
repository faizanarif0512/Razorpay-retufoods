'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

const inr = (paise?: number | null) => (paise ? `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—');
const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const STATUS_CLS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  authenticated: 'bg-blue-50 text-blue-700 border-blue-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  halted: 'bg-red-50 text-red-700 border-red-200',
  paused: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
  completed: 'bg-gray-50 text-gray-500 border-gray-200',
  expired: 'bg-gray-50 text-gray-500 border-gray-200',
};

// Admin view of every subscription, with failed payments surfaced first
export default function AdminSubscriptionsPanel() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/subscriptions');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSubs(data.subscriptions);
    } catch (err: any) {
      setError(err.message || 'Could not load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of subs) c[s.status] = (c[s.status] || 0) + 1;
    return c;
  }, [subs]);
  const failing = subs.filter((s) => s.status === 'pending' || s.status === 'halted');
  const shown = filter === 'all' ? subs : filter === 'failing' ? failing : subs.filter((s) => s.status === filter);
  const monthlyRevenue = subs
    .filter((s) => s.status === 'active' && !s.cancel_at_cycle_end)
    .reduce((sum, s) => sum + ((s.cycle_total_paise || 0) * 4) / (s.plan?.interval_weeks || 4), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Active subscriptions" value={String(counts.active || 0)} />
        <Stat label="Payment problems" value={String(failing.length)} warn={failing.length > 0} />
        <Stat label="Paused" value={String(counts.paused || 0)} />
        <Stat label="Recurring revenue / 4 weeks" value={inr(Math.round(monthlyRevenue))} />
      </div>

      {failing.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>{failing.length} subscription{failing.length > 1 ? 's have' : ' has'} a failed payment.</strong> “Retrying” means Razorpay will try
            again automatically; “On hold” means all retries failed and no orders will be created until the customer fixes their payment. Customers
            have been emailed.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-retu-border bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-retu-border p-4">
          <div className="flex flex-wrap gap-2 text-xs">
            {['all', 'failing', 'active', 'paused', 'cancelled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3 py-1 font-semibold capitalize ${filter === f ? 'border-retu-charcoal bg-retu-charcoal text-white' : 'border-gray-200 text-gray-600'}`}
              >
                {f === 'failing' ? 'Payment problems' : f}
              </button>
            ))}
          </div>
          <button onClick={load} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-black">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : shown.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500">No subscriptions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Cycles paid</th>
                  <th className="px-4 py-3 font-semibold">Next charge</th>
                  <th className="px-4 py-3 font-semibold">Deliver to</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((s) => (
                  <tr key={s.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{s.customer_name}</p>
                      <p className="text-gray-500">{s.customer_email}</p>
                      <p className="text-gray-500">{s.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{s.plan?.name}</p>
                      <p className="text-gray-500">{inr(s.cycle_total_paise)} / {s.plan?.interval_weeks} wks</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2 py-0.5 font-semibold ${STATUS_CLS[s.status] || ''}`}>
                        {s.status === 'pending' ? 'Retrying' : s.status === 'halted' ? 'On hold' : s.status}
                      </span>
                      {s.cancel_at_cycle_end && <p className="mt-1 text-gray-500">Ends after this cycle</p>}
                      {s.last_failure_reason && <p className="mt-1 max-w-[200px] text-red-600">{s.last_failure_reason}</p>}
                    </td>
                    <td className="px-4 py-3">{s.paid_count}</td>
                    <td className="px-4 py-3">{['active', 'pending'].includes(s.status) && !s.cancel_at_cycle_end ? date(s.next_charge_at) : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.shipping_address_line1}, {s.shipping_city} {s.shipping_postal_code}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-[11px] text-gray-500">
        Each successful charge creates a normal order (marked “Subscription”) in Orders Management for packing and dispatch. Plan prices live in the
        subscription_plans table; changing a price creates a new Razorpay plan for new subscribers.
      </p>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 ${warn ? 'border-amber-300' : 'border-retu-border'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${warn ? 'text-amber-700' : 'text-retu-charcoal'}`}>{value}</p>
    </div>
  );
}
