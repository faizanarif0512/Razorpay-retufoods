'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from './client';

// Subscribes to the "store-orders" Realtime channel. A database trigger pings it whenever an
// order is created or changed; the ping carries no order data, so callers refetch through the API.
export function useOrderUpdates(onChange: () => void): boolean {
  const callback = useRef(onChange);
  callback.current = onChange;
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const channel = supabase
      .channel('store-orders')
      .on('broadcast', { event: 'order_changed' }, () => {
        // Checkout touches an order several times in a row; collapse bursts into one refetch.
        clearTimeout(timer);
        timer = setTimeout(() => callback.current(), 400);
      })
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));

    return () => {
      clearTimeout(timer);
      supabase?.removeChannel(channel);
    };
  }, []);

  return live;
}
