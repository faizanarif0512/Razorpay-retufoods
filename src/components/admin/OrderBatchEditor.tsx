'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Wand2 } from 'lucide-react';

type Item = { id: string; variant_id: string; name: string; quantity: number };
type Alloc = { order_item_id: string; batch_id: string; batch_code: string; best_before: string | null; quantity: number };
type Batch = { id: string; variant_id: string; batch_code: string; best_before: string | null; quantity_remaining: number; is_active: boolean };

// Per-order batch allocation, editable until the order leaves the warehouse.
// A line can be split across batches ("cross-batch"), e.g. 3 packs from one batch and 1 from another.
export default function OrderBatchEditor({ orderId, locked }: { orderId: string; locked: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [allocs, setAllocs] = useState<Alloc[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { batch_id: string; quantity: number }[]>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch(`/api/admin/orders/${orderId}/batches`);
    const data = await res.json();
    if (data.success) {
      setItems(data.items);
      setAllocs(data.allocations);
      setBatches(data.batches);
    }
    setLoading(false);
  };
  useEffect(() => {
    setLoading(true);
    setEditing(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  function startEdit(item: Item) {
    setError(null);
    setEditing(item.id);
    const current = allocs.filter((a) => a.order_item_id === item.id).map((a) => ({ batch_id: a.batch_id, quantity: a.quantity }));
    setDrafts((d) => ({ ...d, [item.id]: current.length ? current : [{ batch_id: '', quantity: item.quantity }] }));
  }

  async function save(item: Item) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_item_id: item.id, allocations: (drafts[item.id] || []).filter((r) => r.batch_id) }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  async function autoFill() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/batches`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auto: true }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (data.unallocated > 0) setError(`${data.unallocated} unit(s) still have no batch — receive more stock in the Batches tab.`);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;

  const anyShort = items.some((i) => allocs.filter((a) => a.order_item_id === i.id).reduce((n, a) => n + a.quantity, 0) < i.quantity);

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <p className="font-bold text-retu-charcoal">Batch numbers</p>
        {!locked && anyShort && (
          <button onClick={autoFill} disabled={busy} className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 font-semibold">
            <Wand2 className="h-3 w-3" /> Auto-assign
          </button>
        )}
      </div>
      {items.map((item) => {
        const mine = allocs.filter((a) => a.order_item_id === item.id);
        const assigned = mine.reduce((n, a) => n + a.quantity, 0);
        const options = batches.filter((b) => b.variant_id === item.variant_id);
        const draft = drafts[item.id] || [];
        const draftTotal = draft.reduce((n, r) => n + (Number(r.quantity) || 0), 0);
        return (
          <div key={item.id} className="rounded-lg border border-gray-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {item.name} <span className="font-normal text-gray-500">× {item.quantity}</span>
              </p>
              {editing !== item.id && !locked && (
                <button onClick={() => startEdit(item)} className="font-semibold text-retu-charcoal underline">
                  Edit batches
                </button>
              )}
            </div>

            {editing !== item.id ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {mine.map((a) => (
                  <span key={a.batch_id} className="rounded-full bg-gray-100 px-2.5 py-1 font-mono">
                    {a.batch_code} ×{a.quantity}
                    {a.best_before && <span className="font-sans text-gray-500"> · BB {a.best_before}</span>}
                  </span>
                ))}
                {assigned < item.quantity && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">{item.quantity - assigned} unit(s) without a batch</span>
                )}
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {draft.map((row, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select
                      value={row.batch_id}
                      onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: draft.map((r, i) => (i === idx ? { ...r, batch_id: e.target.value } : r)) }))}
                      className="flex-1 rounded border border-gray-200 px-2 py-1"
                    >
                      <option value="">Choose batch…</option>
                      {options.map((b) => {
                        const mineNow = mine.find((a) => a.batch_id === b.id)?.quantity || 0;
                        return (
                          <option key={b.id} value={b.id} disabled={!b.is_active && !mineNow}>
                            {b.batch_code} · {b.quantity_remaining + mineNow} available{b.best_before ? ` · BB ${b.best_before}` : ''}
                          </option>
                        );
                      })}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: draft.map((r, i) => (i === idx ? { ...r, quantity: Number(e.target.value) } : r)) }))}
                      className="w-16 rounded border border-gray-200 px-2 py-1"
                    />
                    <button onClick={() => setDrafts((d) => ({ ...d, [item.id]: draft.filter((_, i) => i !== idx) }))} className="p-1 text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => setDrafts((d) => ({ ...d, [item.id]: [...draft, { batch_id: '', quantity: Math.max(1, item.quantity - draftTotal) }] }))}
                    className="inline-flex items-center gap-1 font-semibold"
                  >
                    <Plus className="h-3 w-3" /> Split across another batch
                  </button>
                  <span className={draftTotal === item.quantity ? 'text-emerald-700' : 'text-amber-700'}>
                    {draftTotal} of {item.quantity} units assigned
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => save(item)} disabled={busy || draftTotal > item.quantity} className="rounded-md bg-retu-charcoal px-3 py-1.5 font-semibold text-white disabled:opacity-40">
                    {busy ? 'Saving…' : 'Save batches'}
                  </button>
                  <button onClick={() => setEditing(null)} className="px-2">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {error && <p className="rounded-md bg-red-50 p-2 text-red-700">{error}</p>}
      {locked && <p className="text-[11px] text-gray-500">This order has been dispatched, so its batches are final.</p>}
    </div>
  );
}
