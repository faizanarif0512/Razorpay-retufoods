'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, PauseCircle, PlayCircle, XCircle, MapPin, ArrowLeft } from 'lucide-react';

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const STATUS: Record<string, { label: string; cls: string }> = {
  authenticated: { label: 'Starting', cls: 'bg-blue-50 text-blue-700' },
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700' },
  pending: { label: 'Payment failed — retrying', cls: 'bg-amber-50 text-amber-800' },
  halted: { label: 'On hold — payment failed', cls: 'bg-red-50 text-red-700' },
  paused: { label: 'Paused', cls: 'bg-neutral-100 text-neutral-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-neutral-100 text-neutral-500' },
  completed: { label: 'Completed', cls: 'bg-neutral-100 text-neutral-500' },
  expired: { label: 'Expired', cls: 'bg-neutral-100 text-neutral-500' },
};

export default function CustomerSubscriptionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [address, setAddress] = useState<any>({});

  const load = useCallback(async () => {
    const res = await fetch('/api/customer/subscriptions');
    if (res.status === 401) {
      router.push('/store/account/login?redirect=/store/account/subscriptions');
      return;
    }
    const data = await res.json();
    setSubs(data.subscriptions || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(sub: any, action: string, extra: Record<string, any> = {}) {
    if (action === 'cancel' && !window.confirm('Cancel your subscription? You won’t be charged again.')) return;
    setBusy(sub.id + action);
    setMessage(null);
    try {
      const res = await fetch('/api/customer/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: sub.id, action, ...extra }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setMessage(
        action === 'cancel'
          ? 'Your subscription has been cancelled.'
          : action === 'pause'
          ? 'Your subscription is paused. No charges or deliveries until you resume.'
          : action === 'resume'
          ? 'Welcome back! Your subscription is active again.'
          : 'Delivery address updated for your next boxes.'
      );
      setEditing(null);
      await load();
    } catch (err: any) {
      setMessage(err.message || 'Something went wrong');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-pink" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
      <Link href="/store/account" className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
        <ArrowLeft className="h-4 w-4" /> My Account
      </Link>
      <h1 className="mt-4 text-3xl font-bold">My Subscriptions</h1>
      {message && <p className="mt-4 rounded-md bg-neutral-100 p-3 text-sm">{message}</p>}

      {subs.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <p className="font-semibold">You don’t have a subscription yet.</p>
          <Link href="/store/subscribe" className="mt-5 inline-block rounded-md bg-brand-pink px-6 py-3 font-button text-sm font-medium text-white">
            See subscription plans
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {subs.map((s) => {
            const st = STATUS[s.status] || { label: s.status, cls: 'bg-neutral-100' };
            const ended = ['cancelled', 'completed', 'expired'].includes(s.status);
            return (
              <div key={s.id} className="rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-bold">{s.plan?.name}</p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {s.plan?.packs_per_cycle} six-packs every {s.plan?.interval_weeks} weeks · {s.cycle_total_paise ? inr(s.cycle_total_paise) : ''} per delivery
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                </div>

                {(s.status === 'pending' || s.status === 'halted') && (
                  <p className="mt-4 flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {s.status === 'halted'
                      ? 'All payment retries failed, so deliveries are on hold. Please check your UPI AutoPay mandate or card, or cancel and subscribe again.'
                      : 'Your last payment didn’t go through. Razorpay is retrying automatically — please make sure your UPI mandate or card has enough balance.'}
                    {s.last_failure_reason ? ` (${s.last_failure_reason})` : ''}
                  </p>
                )}
                {s.cancel_at_cycle_end && !ended && (
                  <p className="mt-4 rounded-md bg-neutral-100 p-3 text-sm">Cancelled — ends after your current cycle. You won’t be charged again.</p>
                )}

                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                  <Info label="Started" value={date(s.created_at)} />
                  <Info label="Next charge" value={ended || s.cancel_at_cycle_end || s.status === 'paused' ? '—' : date(s.next_charge_at)} />
                  <Info label="Deliveries so far" value={String(s.orders?.length || 0)} />
                </div>

                <div className="mt-5 rounded-md bg-neutral-50 p-4 text-sm">
                  <p className="flex items-center gap-1.5 font-semibold"><MapPin className="h-4 w-4" /> Delivering to</p>
                  {editing === s.id ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[
                        ['name', 'Full name'],
                        ['phone', 'Mobile number'],
                        ['address_line1', 'Address line 1'],
                        ['address_line2', 'Address line 2'],
                        ['city', 'City'],
                        ['state', 'State'],
                        ['postal_code', 'PIN code'],
                      ].map(([k, label]) => (
                        <input
                          key={k}
                          placeholder={label}
                          value={address[k] || ''}
                          onChange={(e) => setAddress((a: any) => ({ ...a, [k]: e.target.value }))}
                          className="rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-brand-pink"
                        />
                      ))}
                      <div className="flex gap-2 sm:col-span-2">
                        <button
                          type="button"
                          onClick={() => act(s, 'address', { address })}
                          disabled={busy === s.id + 'address'}
                          className="rounded-md bg-black px-4 py-2 font-button text-sm text-white disabled:opacity-60"
                        >
                          Save address
                        </button>
                        <button type="button" onClick={() => setEditing(null)} className="rounded-md px-4 py-2 text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-neutral-700">
                      {s.customer_name}, {s.shipping_address_line1}
                      {s.shipping_address_line2 ? `, ${s.shipping_address_line2}` : ''}, {s.shipping_city}, {s.shipping_state} {s.shipping_postal_code} · {s.customer_phone}
                    </p>
                  )}
                </div>

                {!ended && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    {editing !== s.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(s.id);
                          setAddress({
                            name: s.customer_name,
                            phone: s.customer_phone,
                            address_line1: s.shipping_address_line1,
                            address_line2: s.shipping_address_line2,
                            city: s.shipping_city,
                            state: s.shipping_state,
                            postal_code: s.shipping_postal_code,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-4 py-2 text-sm"
                      >
                        <MapPin className="h-4 w-4" /> Change address
                      </button>
                    )}
                    {s.status === 'active' && !s.cancel_at_cycle_end && (
                      <button type="button" onClick={() => act(s, 'pause')} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-4 py-2 text-sm disabled:opacity-60">
                        <PauseCircle className="h-4 w-4" /> Pause
                      </button>
                    )}
                    {s.status === 'paused' && (
                      <button type="button" onClick={() => act(s, 'resume')} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60">
                        <PlayCircle className="h-4 w-4" /> Resume
                      </button>
                    )}
                    {!s.cancel_at_cycle_end && (
                      <button type="button" onClick={() => act(s, 'cancel')} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
                        <XCircle className="h-4 w-4" /> Cancel subscription
                      </button>
                    )}
                  </div>
                )}

                {s.orders?.length > 0 && (
                  <div className="mt-6 border-t border-neutral-200 pt-4">
                    <p className="text-sm font-semibold">Deliveries</p>
                    <ul className="mt-2 divide-y divide-neutral-100 text-sm">
                      {s.orders.map((o: any) => (
                        <li key={o.id} className="flex flex-wrap justify-between gap-2 py-2">
                          <Link href={`/store/order-confirmation/${o.order_reference}`} className="font-medium underline">
                            {o.order_reference}
                          </Link>
                          <span className="text-neutral-600">
                            {date(o.created_at)} · {inr(o.total_paise)} · <span className="capitalize">{o.fulfilment_status}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-neutral-50 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}
