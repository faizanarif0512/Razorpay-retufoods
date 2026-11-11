'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { usePincodeLookup } from '@/lib/pincodeClient';
import PincodeNotice from './PincodeNotice';

// "Check delivery" box on product pages, so out-of-area customers find out before adding to cart
export default function DeliveryChecker() {
  const [pin, setPin] = useState('');
  const status = usePincodeLookup(pin);
  return (
    <div className="rounded-xl border border-retu-border bg-white p-4">
      <label className="flex items-center gap-1.5 text-xs font-bold text-retu-charcoal">
        <MapPin className="h-3.5 w-3.5" /> Check chilled delivery to your PIN code
      </label>
      <input
        inputMode="numeric"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        placeholder="e.g. 560038"
        className="mt-2 w-full rounded-lg border border-retu-border bg-gray-50 px-3 py-2 text-sm outline-none focus:border-retu-charcoal focus:bg-white"
      />
      <PincodeNotice status={status} />
    </div>
  );
}
