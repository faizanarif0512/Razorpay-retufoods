'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, X, MapPin } from 'lucide-react';
import AddressForm, { AddressFields, EMPTY_ADDRESS, formatAddress } from './AddressForm';

type Saved = AddressFields & { id: string; is_default: boolean; serviceable?: boolean };

// Re-addresses an order. A subscription box is changed through its subscription, so the new
// address also applies to every future delivery.
export default function ChangeAddressModal({
  order,
  onClose,
  onChanged,
}: {
  order: any;
  onClose: () => void;
  onChanged: (message: string) => void;
}) {
  const isSubscription = order.order_type === 'subscription' && order.subscription_id;
  const [saved, setSaved] = useState<Saved[]>([]);
  const [choice, setChoice] = useState<string>('new');
  const [draft, setDraft] = useState<AddressFields>({ ...EMPTY_ADDRESS, name: order.customer_name, phone: order.customer_phone });
  const [deliverable, setDeliverable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/customer/addresses')
      .then((r) => (r.ok ? r.json() : { addresses: [] }))
      .then((d) => {
        const list: Saved[] = (d.addresses || []).filter((a: Saved) => a.serviceable);
        setSaved(list);
        if (list[0]) setChoice(list[0].id);
      })
      .catch(() => {});
  }, []);

  const deadline = order.address_change?.deadline ? new Date(order.address_change.deadline) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = choice === 'new' ? { address: draft } : { addressId: choice };
      const res = isSubscription
        ? await fetch('/api/customer/subscriptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionId: order.subscription_id, action: 'address', ...payload }),
          })
        : await fetch(`/api/customer/orders/${order.id}/address`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onChanged(
        isSubscription
          ? 'Address updated for this box and all your future subscription deliveries.'
          : `Delivery address for ${order.order_reference} updated.`
      );
    } catch (err: any) {
      setError(err.message || 'Could not change the address');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-bold">Change delivery address</p>
            <p className="text-xs text-gray-500">{order.order_reference}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 rounded-md bg-neutral-50 p-3 text-xs text-gray-700">
          {isSubscription
            ? 'This is a subscription box. The new address applies to this box (until it’s packed) and to every future delivery.'
            : deadline
            ? `You can change this address until ${deadline.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} (2 hours after ordering), as long as the box hasn’t been packed.`
            : 'You can change this address until your box is packed.'}
        </p>

        <p className="mt-4 text-xs font-semibold text-gray-500">Currently: {formatAddress({ address_line1: order.shipping_address_line1, address_line2: order.shipping_address_line2, city: order.shipping_city, state: order.shipping_state, postal_code: order.shipping_postal_code })}</p>

        <div className="mt-4 space-y-2">
          {saved.map((a) => (
            <label key={a.id} className={`flex cursor-pointer gap-3 rounded-lg border-2 p-3 text-xs ${choice === a.id ? 'border-black' : 'border-gray-200'}`}>
              <input type="radio" checked={choice === a.id} onChange={() => setChoice(a.id)} className="mt-0.5 accent-black" />
              <span>
                <span className="flex items-center gap-1 font-bold">
                  <MapPin className="h-3 w-3" /> {a.label}
                </span>
                <span className="text-gray-600">
                  {a.name} · {formatAddress(a)}
                </span>
              </span>
            </label>
          ))}
          <label className={`flex cursor-pointer gap-3 rounded-lg border-2 p-3 text-xs ${choice === 'new' ? 'border-black' : 'border-gray-200'}`}>
            <input type="radio" checked={choice === 'new'} onChange={() => setChoice('new')} className="mt-0.5 accent-black" />
            <span className="font-bold">Use a new address</span>
          </label>
        </div>

        {choice === 'new' && (
          <div className="mt-4">
            <AddressForm value={draft} onChange={setDraft} onPinStatus={setDeliverable} />
          </div>
        )}

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-xs text-red-700">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            disabled={saving || (choice === 'new' && deliverable === false)}
            className="flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Update address
          </button>
          <button type="button" onClick={onClose} className="px-3 text-sm">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
