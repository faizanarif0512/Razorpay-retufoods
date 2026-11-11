'use client';

import React, { useEffect } from 'react';
import { INDIAN_STATES, usePincodeLookup } from '@/lib/pincodeClient';
import PincodeNotice from './PincodeNotice';

export type AddressFields = {
  label?: string;
  name: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
};

export const EMPTY_ADDRESS: AddressFields = {
  label: 'Home',
  name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: 'Karnataka',
  postal_code: '',
};

// Address fields with live PIN check; city and state fill in from the PIN directory
export default function AddressForm({
  value,
  onChange,
  showLabel = false,
  onPinStatus,
}: {
  value: AddressFields;
  onChange: (next: AddressFields) => void;
  showLabel?: boolean;
  onPinStatus?: (deliverable: boolean | null) => void;
}) {
  const pin = usePincodeLookup(value.postal_code);

  useEffect(() => {
    if (pin.state === 'ok' || pin.state === 'unavailable') {
      if (value.city !== pin.city || value.state !== pin.region) onChange({ ...value, city: value.city || pin.city, state: pin.region });
    }
    onPinStatus?.(pin.state === 'ok' ? true : pin.state === 'unavailable' || pin.state === 'invalid' ? false : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const set = (k: keyof AddressFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: k === 'postal_code' ? e.target.value.replace(/\D/g, '') : e.target.value });

  const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black';
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {showLabel && (
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold">Label</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {['Home', 'Work', 'Other'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onChange({ ...value, label: l })}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${value.label === l ? 'border-black bg-black text-white' : 'border-gray-300'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </label>
      )}
      <label className="block">
        <span className="text-xs font-semibold">Recipient name *</span>
        <input required value={value.name} onChange={set('name')} className={input} />
      </label>
      <label className="block">
        <span className="text-xs font-semibold">Mobile number *</span>
        <input required type="tel" value={value.phone} onChange={set('phone')} className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs font-semibold">Flat / house, street *</span>
        <input required value={value.address_line1} onChange={set('address_line1')} className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs font-semibold">Area / landmark (optional)</span>
        <input value={value.address_line2 || ''} onChange={set('address_line2')} className={input} />
      </label>
      <label className="block">
        <span className="text-xs font-semibold">PIN code *</span>
        <input required inputMode="numeric" maxLength={6} value={value.postal_code} onChange={set('postal_code')} className={input} />
        <PincodeNotice status={pin} />
      </label>
      <label className="block">
        <span className="text-xs font-semibold">City *</span>
        <input required value={value.city} onChange={set('city')} className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs font-semibold">State *</span>
        <select value={value.state} onChange={set('state')} className={input}>
          {INDIAN_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function formatAddress(a: Partial<AddressFields>) {
  return [a.address_line1, a.address_line2, a.city, `${a.state || ''} ${a.postal_code || ''}`.trim()].filter(Boolean).join(', ');
}
