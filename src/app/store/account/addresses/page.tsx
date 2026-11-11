'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, MapPin, Plus, Star, Trash2, Pencil } from 'lucide-react';
import AddressForm, { AddressFields, EMPTY_ADDRESS, formatAddress } from '@/components/store/AddressForm';

type Saved = AddressFields & { id: string; is_default: boolean; serviceable?: boolean };

export default function SavedAddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Saved[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<AddressFields>(EMPTY_ADDRESS);
  const [makeDefault, setMakeDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/customer/addresses');
    if (res.status === 401) return router.push('/store/account/login?redirect=/store/account/addresses');
    const data = await res.json();
    setAddresses(data.addresses || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  function start(a?: Saved) {
    setError(null);
    setEditing(a ? a.id : 'new');
    setDraft(a ? { ...a } : { ...EMPTY_ADDRESS });
    setMakeDefault(a ? a.is_default : addresses.length === 0);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(editing === 'new' ? '/api/customer/addresses' : `/api/customer/addresses/${editing}`, {
        method: editing === 'new' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, is_default: makeDefault }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not save the address');
    } finally {
      setSaving(false);
    }
  }

  async function remove(a: Saved) {
    if (!window.confirm(`Delete “${a.label}” address?`)) return;
    await fetch(`/api/customer/addresses/${a.id}`, { method: 'DELETE' });
    await load();
  }

  async function setDefault(a: Saved) {
    await fetch(`/api/customer/addresses/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true }),
    });
    await load();
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-pink" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <Link href="/store/account" className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
        <ArrowLeft className="h-4 w-4" /> My Account
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Saved Addresses</h1>
        {editing === null && addresses.length < 10 && (
          <button onClick={() => start()} className="inline-flex items-center gap-1.5 rounded-md bg-brand-pink px-4 py-2.5 font-button text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> Add address
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-neutral-600">Pick any of these at checkout or for your subscription. We check each PIN code for chilled delivery.</p>

      {editing !== null && (
        <form onSubmit={save} className="mt-6 rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <p className="mb-4 font-bold">{editing === 'new' ? 'New address' : 'Edit address'}</p>
          <AddressForm value={draft} onChange={setDraft} showLabel />
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="accent-[#EE1745]" />
            Make this my default address
          </label>
          {error && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="mt-5 flex gap-3">
            <button disabled={saving} className="rounded-md bg-black px-5 py-2.5 font-button text-sm font-medium text-white disabled:opacity-60">
              {saving ? 'Saving…' : 'Save address'}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="px-3 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {addresses.length === 0 && editing === null && (
          <div className="rounded-2xl bg-white p-10 text-center text-sm text-neutral-600 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">No saved addresses yet.</div>
        )}
        {addresses.map((a) => (
          <div key={a.id} className="rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-pink" />
                <div>
                  <p className="font-bold">
                    {a.label}
                    {a.is_default && <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold">Default</span>}
                  </p>
                  <p className="mt-1 text-sm">{a.name} · {a.phone}</p>
                  <p className="text-sm text-neutral-600">{formatAddress(a)}</p>
                  <p className={`mt-1 text-xs font-semibold ${a.serviceable ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {a.serviceable ? '✓ We deliver here' : 'We don’t deliver to this PIN code yet'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {!a.is_default && (
                  <button onClick={() => setDefault(a)} title="Make default" className="rounded-md p-2 hover:bg-neutral-100">
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => start(a)} title="Edit" className="rounded-md p-2 hover:bg-neutral-100">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => remove(a)} title="Delete" className="rounded-md p-2 text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
