'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Snowflake, Truck, CalendarClock, CreditCard, AlertCircle } from 'lucide-react';
import PincodeNotice from '@/components/store/PincodeNotice';
import { INDIAN_STATES, usePincodeLookup } from '@/lib/pincodeClient';

declare global {
  interface Window {
    Razorpay: any;
  }
}

type Plan = {
  id: string;
  name: string;
  description: string | null;
  interval_weeks: number;
  packs_per_cycle: number;
  price_paise: number;
  shipping_paise: number;
  cycle_total_paise: number;
  per_pack_paise: number;
  variant_name?: string;
  image_url?: string;
  in_stock: boolean;
};

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function SubscribeClient() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [trial, setTrial] = useState<{ price_paise: number } | null>(null);
  const [eligibility, setEligibility] = useState<{ signedIn: boolean; firstTimeBuyer: boolean | null; hasSubscription: boolean }>({
    signedIn: false,
    firstTimeBuyer: null,
    hasSubscription: false,
  });
  const [selected, setSelected] = useState<string>('plan_2wk');
  const [form, setForm] = useState({ name: '', phone: '', address_line1: '', address_line2: '', city: 'Bengaluru', state: 'Karnataka', postal_code: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ orderReference: string } | null>(null);

  useEffect(() => {
    fetch('/api/subscriptions/plans')
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error);
        setPlans(data.plans);
        setTrial(data.trial);
        setEligibility(data.eligibility);
        if (data.plans[0]) setSelected(data.plans[0].id);
        if (data.customer) {
          setForm((f) => ({
            name: data.customer.name || f.name,
            phone: data.customer.phone || f.phone,
            address_line1: data.customer.address_line1 || f.address_line1,
            address_line2: data.customer.address_line2 || f.address_line2,
            city: data.customer.city || f.city,
            state: data.customer.state || f.state,
            postal_code: data.customer.postal_code || f.postal_code,
          }));
        }
      })
      .catch(() => setError('Could not load subscription plans. Please refresh the page.'))
      .finally(() => setLoading(false));
  }, []);

  const plan = plans.find((p) => p.id === selected);
  const pinStatus = usePincodeLookup(form.postal_code);
  useEffect(() => {
    if (pinStatus.state === 'ok' || pinStatus.state === 'unavailable') {
      setForm((f) => ({ ...f, city: pinStatus.city, state: pinStatus.region }));
    }
  }, [pinStatus]);
  const pinBlocked = pinStatus.state === 'unavailable' || pinStatus.state === 'invalid';
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id, ...form }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not start the subscription');
      if (data.isSimulator) throw new Error('Payments are not configured on this environment.');

      if (!(await loadRazorpay())) throw new Error('Could not load Razorpay. Please check your connection and try again.');

      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.razorpaySubscriptionId,
        name: 'Retü Foods',
        description: `mi-biotics™ ${data.planName}`,
        image: '/img/retu_logo-da9f748d.png',
        prefill: { name: data.customer.name, email: data.customer.email, contact: data.customer.phone },
        theme: { color: '#EE1745' },
        handler: async (response: any) => {
          try {
            const verify = await fetch('/api/subscriptions/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscriptionId: data.subscriptionId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySubscriptionId: response.razorpay_subscription_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const v = await verify.json();
            if (!v.success) throw new Error(v.error || 'Verification failed');
            setDone({ orderReference: v.orderReference });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (err: any) {
            setError(
              `${err.message}. If you were charged, your subscription will still be confirmed automatically within a few minutes — check My Account → Subscriptions.`
            );
          } finally {
            setSubmitting(false);
          }
        },
        modal: { ondismiss: () => setSubmitting(false) },
      });
      rzp.on('payment.failed', (resp: any) => {
        setError(resp?.error?.description || 'The payment did not go through. Please try again or use another method.');
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-pink" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        <h1 className="mt-6 text-3xl font-bold">Welcome to the Culture!</h1>
        <p className="mt-4 text-neutral-700">
          Your subscription is active and your first box (order <strong>{done.orderReference}</strong>) is being prepared. We’ve emailed you the
          details and your invoice.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/store/account/subscriptions" className="rounded-md bg-brand-pink px-6 py-3 font-button text-sm font-medium text-white">
            Manage my subscription
          </Link>
          <Link href={`/store/order-confirmation/${done.orderReference}`} className="rounded-md border border-black px-6 py-3 font-button text-sm font-medium">
            View first order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-pink">Subscribe</p>
        <h1 className="mt-3 text-[30px] font-bold leading-tight sm:text-[40px]">
          Your gut. <span className="text-brand-pink">Your schedule.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] text-neutral-700">
          One chilled delivery every billing cycle — all your six-packs arrive together. Pause, change your address or cancel any time.
        </p>
      </div>

      {eligibility.firstTimeBuyer !== false && trial && !eligibility.hasSubscription && (
        <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center justify-between gap-3 rounded-2xl border border-brand-pink/30 bg-brand-blush px-6 py-4 sm:flex-row">
          <p className="text-sm">
            <strong>New to mi-biotics™?</strong> Try a single Lychee + Mango six-pack for {inr(trial.price_paise)} first — available once per customer.
          </p>
          <Link href="/store/products/mibiotics-discovery-duo" className="shrink-0 rounded-md bg-black px-5 py-2.5 font-button text-sm font-medium text-white">
            Try one six-pack
          </Link>
        </div>
      )}

      {eligibility.hasSubscription ? (
        <div className="mx-auto mt-10 max-w-xl rounded-2xl bg-white p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <p className="font-semibold">You already have a mi-biotics™ subscription.</p>
          <Link href="/store/account/subscriptions" className="mt-5 inline-block rounded-md bg-brand-pink px-6 py-3 font-button text-sm font-medium text-white">
            Manage my subscription
          </Link>
        </div>
      ) : (
        <form onSubmit={subscribe} className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="text-xl font-bold">1. Choose your plan</h2>
            <div className="mt-4 grid gap-4">
              {plans.map((p) => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer gap-4 rounded-2xl border-2 bg-white p-5 transition ${
                    selected === p.id ? 'border-brand-pink shadow-[0_4px_24px_rgba(238,23,69,0.12)]' : 'border-neutral-200 hover:border-neutral-300'
                  } ${!p.in_stock ? 'opacity-60' : ''}`}
                >
                  <input type="radio" name="plan" value={p.id} checked={selected === p.id} onChange={() => setSelected(p.id)} disabled={!p.in_stock} className="mt-1 accent-[#EE1745]" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-lg font-bold">{p.name}</p>
                      <p className="text-lg font-bold">
                        {inr(p.cycle_total_paise)} <span className="text-sm font-normal text-neutral-500">/ {p.interval_weeks} weeks</span>
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-neutral-700">
                      {p.packs_per_cycle} × Lychee + Mango six-packs ({p.packs_per_cycle * 6} bottles) delivered together · {inr(p.per_pack_paise)} per pack
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">{p.shipping_paise === 0 ? 'Free chilled shipping' : `+ ${inr(p.shipping_paise)} chilled shipping`}</p>
                    {!p.in_stock && <p className="mt-1 text-sm text-red-600">Temporarily out of stock</p>}
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-6 space-y-3 rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-700">
              <p className="flex gap-2"><Snowflake className="h-4 w-4 shrink-0 text-brand-pink" /> A 4-week box is 24 chilled bottles — about one fridge shelf. Short on space? The 2-week plan might suit you better.</p>
              <p className="flex gap-2"><Truck className="h-4 w-4 shrink-0 text-brand-pink" /> One shipment per billing cycle, kept at 2–8 °C. Please make sure someone is home to refrigerate it.</p>
              <p className="flex gap-2"><CalendarClock className="h-4 w-4 shrink-0 text-brand-pink" /> Charged automatically each cycle. Pause, change address or cancel any time from My Account.</p>
              <p className="flex gap-2"><CreditCard className="h-4 w-4 shrink-0 text-brand-pink" /> Subscriptions need UPI AutoPay or an Indian card. Internationally issued cards can be used for the one-time trial pack only.</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold">2. Delivery details</h2>
            {!eligibility.signedIn ? (
              <div className="mt-4 rounded-2xl bg-white p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                <p className="font-semibold">Sign in to subscribe</p>
                <p className="mt-2 text-sm text-neutral-600">Your subscription is tied to your account so you can manage it any time.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Link href="/store/account/login?redirect=/store/subscribe" className="rounded-md bg-brand-pink px-6 py-3 font-button text-sm font-medium text-white">
                    Sign in
                  </Link>
                  <Link href="/store/account/register?redirect=/store/subscribe" className="rounded-md border border-black px-6 py-3 font-button text-sm font-medium">
                    Create account
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4 rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                <Field label="Full name" value={form.name} onChange={set('name')} required />
                <Field label="Mobile number" type="tel" value={form.phone} onChange={set('phone')} required />
                <Field label="Address line 1" value={form.address_line1} onChange={set('address_line1')} required />
                <Field label="Address line 2 (optional)" value={form.address_line2} onChange={set('address_line2')} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="City" value={form.city} onChange={set('city')} required />
                  <div>
                    <Field label="PIN code" value={form.postal_code} onChange={set('postal_code')} required inputMode="numeric" maxLength={6} />
                    <PincodeNotice status={pinStatus} />
                  </div>
                </div>
                <label className="block">
                  <span className="text-sm font-semibold">State</span>
                  <select value={form.state} onChange={set('state')} required className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-pink">
                    {INDIAN_STATES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>

                {plan && (
                  <div className="flex items-baseline justify-between border-t border-neutral-200 pt-4">
                    <span className="text-sm text-neutral-600">Charged today, then every {plan.interval_weeks} weeks</span>
                    <span className="text-xl font-bold">{inr(plan.cycle_total_paise)}</span>
                  </div>
                )}

                {error && (
                  <p className="flex gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !plan?.in_stock || pinBlocked}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-pink py-3.5 font-button text-sm font-medium text-white hover:bg-[#d01039] disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? 'Opening secure payment…' : `Subscribe — ${plan ? inr(plan.cycle_total_paise) : ''}`}
                </button>
                <p className="text-center text-xs text-neutral-500">
                  Secure payment by Razorpay. By subscribing you agree to our{' '}
                  <Link href="/refund-policy" className="underline">refund &amp; cancellation policy</Link>.
                </p>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input {...props} className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-pink" />
    </label>
  );
}
