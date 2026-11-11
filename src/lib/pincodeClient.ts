'use client';

import { useEffect, useState } from 'react';

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export type PincodeStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'invalid' }
  | { state: 'ok' | 'unavailable'; city: string; region: string };

// Checks a 6-digit PIN against the store's delivery areas as the customer types
export function usePincodeLookup(pin: string): PincodeStatus {
  const [status, setStatus] = useState<PincodeStatus>({ state: 'idle' });
  useEffect(() => {
    const p = (pin || '').trim();
    if (!/^\d{6}$/.test(p)) {
      setStatus({ state: 'idle' });
      return;
    }
    let cancelled = false;
    setStatus({ state: 'checking' });
    fetch(`/api/pincode/${p}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d.success || !d.valid) setStatus({ state: 'invalid' });
        else setStatus({ state: d.serviceable ? 'ok' : 'unavailable', city: d.city, region: d.state });
      })
      .catch(() => !cancelled && setStatus({ state: 'idle' }));
    return () => {
      cancelled = true;
    };
  }, [pin]);
  return status;
}
