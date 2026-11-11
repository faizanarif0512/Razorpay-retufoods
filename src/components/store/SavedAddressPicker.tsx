'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { AddressFields } from './AddressForm';
import { formatAddress } from './AddressForm';

type Saved = AddressFields & { id: string; is_default: boolean; serviceable?: boolean };

// Lets a signed-in customer fill an address form from their address book
export default function SavedAddressPicker({ onPick, signedIn }: { onPick: (a: Saved) => void; signedIn: boolean }) {
  const [addresses, setAddresses] = useState<Saved[]>([]);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    fetch('/api/customer/addresses')
      .then((r) => (r.ok ? r.json() : { addresses: [] }))
      .then((d) => {
        const list: Saved[] = d.addresses || [];
        setAddresses(list);
        const def = list.find((a) => a.is_default && a.serviceable) || list.find((a) => a.serviceable);
        if (def) {
          setPicked(def.id);
          onPick(def);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  if (!signedIn || addresses.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold text-retu-charcoal">Deliver to a saved address</p>
        <Link href="/store/account/addresses" className="text-[11px] font-semibold underline">
          Manage
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {addresses.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={!a.serviceable}
            onClick={() => {
              setPicked(a.id);
              onPick(a);
            }}
            className={`rounded-lg border-2 p-3 text-left text-xs transition ${
              picked === a.id ? 'border-black bg-neutral-50' : 'border-gray-200 hover:border-gray-300'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <p className="flex items-center gap-1 font-bold">
              <MapPin className="h-3 w-3" /> {a.label}
              {a.is_default && <span className="font-normal text-gray-500">· default</span>}
            </p>
            <p className="mt-1 text-gray-700">{a.name}</p>
            <p className="text-gray-500">{formatAddress(a)}</p>
            {!a.serviceable && <p className="mt-1 font-semibold text-amber-700">Not deliverable yet</p>}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-gray-500">Or enter a different address below — it’ll be saved for next time.</p>
    </div>
  );
}
