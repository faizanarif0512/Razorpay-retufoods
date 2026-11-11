'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Save, AlertTriangle } from 'lucide-react';

type Batch = {
  id: string;
  variant_id: string;
  batch_code: string;
  manufactured_on: string | null;
  best_before: string | null;
  quantity_received: number;
  quantity_remaining: number;
  notes: string | null;
  is_active: boolean;
};
type Variant = { id: string; name: string; sku: string; stock_quantity: number; is_active: boolean; product: { name: string } | null };

const today = () => new Date().toISOString().slice(0, 10);
const daysUntil = (d: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null);

// Admin → Batches: every production batch per pack, editable in place
export default function AdminBatchesPanel() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [variantFilter, setVariantFilter] = useState('all');
  const [edits, setEdits] = useState<Record<string, Partial<Batch>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ variant_id: '', batch_code: '', manufactured_on: today(), best_before: '', quantity: '', notes: '' });

  const load = async () => {
    const res = await fetch('/api/admin/batches');
    const data = await res.json();
    if (data.success) {
      setBatches(data.batches);
      setVariants(data.variants);
      setDraft((d) => ({ ...d, variant_id: d.variant_id || data.variants.find((v: Variant) => v.is_active)?.id || '' }));
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const variantName = (id: string) => {
    const v = variants.find((x) => x.id === id);
    return v ? `${v.product?.name?.replace('mi-biotics™ Fermented Millet Gut Shot - ', '') || ''} · ${v.name}` : id;
  };
  const shown = useMemo(() => batches.filter((b) => variantFilter === 'all' || b.variant_id === variantFilter), [batches, variantFilter]);
  const placeholders = batches.filter((b) => b.batch_code === 'OPENING' && b.quantity_remaining > 0).length;

  const field = (b: Batch, k: keyof Batch) => (edits[b.id]?.[k] ?? b[k]) as any;
  const setField = (b: Batch, k: keyof Batch, v: any) => setEdits((e) => ({ ...e, [b.id]: { ...e[b.id], [k]: v } }));

  async function save(b: Batch) {
    const body = edits[b.id];
    if (!body) return;
    setBusy(b.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/batches/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setEdits((e) => {
        const { [b.id]: _, ...rest } = e;
        return rest;
      });
      setMessage({ ok: true, text: `Batch ${data.batch.batch_code} saved.` });
      await load();
    } catch (err: any) {
      setMessage({ ok: false, text: err.message || 'Could not save' });
    } finally {
      setBusy(null);
    }
  }

  async function addBatch(e: React.FormEvent) {
    e.preventDefault();
    setBusy('new');
    setMessage(null);
    try {
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, quantity: Number(draft.quantity) }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setMessage({ ok: true, text: `Batch ${data.batch.batch_code} received: ${data.batch.quantity_received} units added to stock.` });
      setAdding(false);
      setDraft((d) => ({ ...d, batch_code: '', best_before: '', quantity: '', notes: '' }));
      await load();
    } catch (err: any) {
      setMessage({ ok: false, text: err.message || 'Could not add batch' });
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const cell = 'w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-retu-charcoal';
  return (
    <div className="space-y-5">
      {placeholders > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>{placeholders} “OPENING” batch{placeholders > 1 ? 'es' : ''}</strong> hold your existing stock. Replace the code with the real batch
            number from the packs and add the best-before date, so invoices and customers see the correct batch.
          </p>
        </div>
      )}
      {message && (
        <div className={`rounded-xl border p-3 text-xs font-semibold ${message.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <select value={variantFilter} onChange={(e) => setVariantFilter(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs">
          <option value="all">All packs</option>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {variantName(v.id)}
            </option>
          ))}
        </select>
        <button onClick={() => setAdding((a) => !a)} className="inline-flex items-center gap-1.5 rounded-lg bg-retu-charcoal px-4 py-2 text-xs font-semibold text-white">
          <Plus className="h-3.5 w-3.5" /> Receive new batch
        </button>
      </div>

      {adding && (
        <form onSubmit={addBatch} className="grid gap-3 rounded-2xl border border-retu-border bg-white p-4 text-xs md:grid-cols-6">
          <label className="md:col-span-2">
            <span className="font-semibold">Pack</span>
            <select required value={draft.variant_id} onChange={(e) => setDraft({ ...draft, variant_id: e.target.value })} className={cell + ' mt-1'}>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {variantName(v.id)}
                  {!v.is_active ? ' (not on sale)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="font-semibold">Batch code</span>
            <input required value={draft.batch_code} onChange={(e) => setDraft({ ...draft, batch_code: e.target.value })} placeholder="e.g. RT-2611-A" className={cell + ' mt-1'} />
          </label>
          <label>
            <span className="font-semibold">Manufactured</span>
            <input type="date" value={draft.manufactured_on} onChange={(e) => setDraft({ ...draft, manufactured_on: e.target.value })} className={cell + ' mt-1'} />
          </label>
          <label>
            <span className="font-semibold">Best before</span>
            <input required type="date" value={draft.best_before} onChange={(e) => setDraft({ ...draft, best_before: e.target.value })} className={cell + ' mt-1'} />
          </label>
          <label>
            <span className="font-semibold">Units (packs)</span>
            <input required type="number" min={1} value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} className={cell + ' mt-1'} />
          </label>
          <label className="md:col-span-5">
            <span className="font-semibold">Notes (optional)</span>
            <input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Lab report no., warehouse, etc." className={cell + ' mt-1'} />
          </label>
          <div className="flex items-end">
            <button disabled={busy === 'new'} className="w-full rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white disabled:opacity-60">
              {busy === 'new' ? 'Saving…' : 'Add to stock'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-retu-border bg-white">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-3 font-semibold">Pack</th>
              <th className="px-3 py-3 font-semibold">Batch code</th>
              <th className="px-3 py-3 font-semibold">Manufactured</th>
              <th className="px-3 py-3 font-semibold">Best before</th>
              <th className="px-3 py-3 font-semibold">Received</th>
              <th className="px-3 py-3 font-semibold">Units left</th>
              <th className="px-3 py-3 font-semibold">On sale</th>
              <th className="px-3 py-3 font-semibold">Notes</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shown.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  No batches yet.
                </td>
              </tr>
            )}
            {shown.map((b) => {
              const dLeft = daysUntil(field(b, 'best_before'));
              const dirty = !!edits[b.id];
              return (
                <tr key={b.id} className={!b.is_active ? 'bg-gray-50 text-gray-400' : ''}>
                  <td className="px-3 py-2 font-semibold">{variantName(b.variant_id)}</td>
                  <td className="px-3 py-2">
                    <input value={field(b, 'batch_code')} onChange={(e) => setField(b, 'batch_code', e.target.value)} className={cell + ' font-mono font-bold'} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="date" value={field(b, 'manufactured_on') || ''} onChange={(e) => setField(b, 'manufactured_on', e.target.value)} className={cell} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="date" value={field(b, 'best_before') || ''} onChange={(e) => setField(b, 'best_before', e.target.value)} className={cell} />
                    {dLeft !== null && (
                      <span className={`mt-0.5 block text-[10px] font-semibold ${dLeft < 0 ? 'text-red-600' : dLeft <= 14 ? 'text-amber-700' : 'text-gray-500'}`}>
                        {dLeft < 0 ? 'Expired — not used for new orders' : `${dLeft} days left`}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{b.quantity_received}</td>
                  <td className="px-3 py-2">
                    <input type="number" min={0} value={field(b, 'quantity_remaining')} onChange={(e) => setField(b, 'quantity_remaining', e.target.value)} className={cell + ' w-20'} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={!!field(b, 'is_active')} onChange={(e) => setField(b, 'is_active', e.target.checked)} />
                  </td>
                  <td className="px-3 py-2">
                    <input value={field(b, 'notes') || ''} onChange={(e) => setField(b, 'notes', e.target.value)} className={cell} />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => save(b)}
                      disabled={!dirty || busy === b.id}
                      className="inline-flex items-center gap-1 rounded-md bg-retu-charcoal px-2.5 py-1 font-semibold text-white disabled:opacity-30"
                    >
                      {busy === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-500">
        Paid orders take units from the batch with the earliest best-before date first; an order can draw from several batches if one runs short.
        Changing “units left” (recount, breakage, write-off) or taking a batch off sale adjusts sellable stock by the same amount. Expired batches are
        never assigned to new orders.
      </p>
    </div>
  );
}
