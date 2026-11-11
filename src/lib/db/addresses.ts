import crypto from 'crypto';
import { getSupabase } from './supabase';
import { checkPincode, NOT_SERVICEABLE_MESSAGE } from './pincodes';
import type { Order } from '@/types';

export interface SavedAddress {
  id: string;
  customer_id: string;
  label: string;
  name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
  serviceable?: boolean;
}

export interface AddressInput {
  label?: string;
  name: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
}

export const MAX_SAVED_ADDRESSES = 10;
// One-off and trial orders can be re-addressed for this long after they are placed
export const ONE_OFF_CHANGE_WINDOW_MS = 2 * 60 * 60 * 1000;
// Once packing starts the box is with the warehouse, so the address is locked
const EDITABLE_FULFILMENT = ['pending', 'confirmed'];

function check<T>(res: { data: T; error: any }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// Validates an address and its PIN; deliverability is checked separately so customers can
// still save, say, an office in a city we'll reach later.
export async function validateAddress(a: Partial<AddressInput>, requireServiceable: boolean): Promise<AddressInput> {
  const clean = {
    label: (a.label || 'Home').trim().slice(0, 30) || 'Home',
    name: (a.name || '').trim(),
    phone: (a.phone || '').trim(),
    address_line1: (a.address_line1 || '').trim(),
    address_line2: (a.address_line2 || '').trim() || null,
    city: (a.city || '').trim(),
    state: (a.state || '').trim(),
    postal_code: (a.postal_code || '').trim(),
  };
  if (clean.name.length < 2) throw new Error('Please enter the recipient’s full name');
  if (clean.phone.replace(/\D/g, '').length < 10) throw new Error('Please enter a valid 10-digit mobile number');
  if (!clean.address_line1 || !clean.city || !clean.state) throw new Error('Please complete the address, city and state');
  const pin = await checkPincode(clean.postal_code);
  if (!pin.valid) throw new Error('This PIN code doesn’t look right. Please check it.');
  if (requireServiceable && !pin.serviceable) throw new Error(NOT_SERVICEABLE_MESSAGE);
  return clean;
}

async function withServiceability(rows: SavedAddress[]): Promise<SavedAddress[]> {
  const pins = [...new Set(rows.map((r) => r.postal_code))];
  if (!pins.length) return rows;
  const found = check(await getSupabase().from('pincodes').select('pincode, is_serviceable').in('pincode', pins)) as any[];
  const ok = new Map(found.map((p) => [p.pincode, p.is_serviceable]));
  return rows.map((r) => ({ ...r, serviceable: !!ok.get(r.postal_code) }));
}

export async function listAddresses(customerId: string): Promise<SavedAddress[]> {
  const sb = getSupabase();
  const query = () =>
    sb.from('customer_addresses').select('*').eq('customer_id', customerId).order('is_default', { ascending: false }).order('created_at');
  let rows = check(await query()) as SavedAddress[];

  // Accounts made at sign-up or checkout carry one address on the profile; start the book with it
  if (rows.length === 0) {
    const c = check(await sb.from('customers').select('name, phone, address_line1, address_line2, city, state, postal_code').eq('id', customerId).maybeSingle()) as any;
    if (c?.address_line1 && c.city && c.state && /^\d{6}$/.test(c.postal_code || '')) {
      await sb.from('customer_addresses').upsert(
        {
          id: `addr_${customerId}`,
          customer_id: customerId,
          label: 'Home',
          name: c.name,
          phone: c.phone || '',
          address_line1: c.address_line1,
          address_line2: c.address_line2,
          city: c.city,
          state: c.state,
          postal_code: c.postal_code,
          is_default: true,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );
      rows = check(await query()) as SavedAddress[];
    }
  }
  return withServiceability(rows);
}

// Keeps the profile's single address (used by older screens and emails) in step with the default
async function syncProfileDefault(customerId: string, a: AddressInput) {
  check(await getSupabase().from('customers').update({
    address_line1: a.address_line1,
    address_line2: a.address_line2,
    city: a.city,
    state: a.state,
    postal_code: a.postal_code,
    updated_at: new Date().toISOString(),
  }).eq('id', customerId));
}

async function clearDefault(customerId: string) {
  check(await getSupabase().from('customer_addresses').update({ is_default: false }).eq('customer_id', customerId).eq('is_default', true));
}

export async function createAddress(customerId: string, input: Partial<AddressInput> & { is_default?: boolean }): Promise<SavedAddress> {
  const existing = await listAddresses(customerId);
  if (existing.length >= MAX_SAVED_ADDRESSES) throw new Error(`You can save up to ${MAX_SAVED_ADDRESSES} addresses`);
  const a = await validateAddress(input, false);
  const makeDefault = input.is_default || existing.length === 0;
  if (makeDefault) await clearDefault(customerId);
  const id = `addr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  check(await getSupabase().from('customer_addresses').insert({ id, customer_id: customerId, ...a, is_default: makeDefault }));
  if (makeDefault) await syncProfileDefault(customerId, a);
  return (await listAddresses(customerId)).find((r) => r.id === id)!;
}

export async function updateAddress(customerId: string, id: string, input: Partial<AddressInput> & { is_default?: boolean }): Promise<SavedAddress> {
  const current = (await listAddresses(customerId)).find((r) => r.id === id);
  if (!current) throw new Error('Address not found');
  const a = await validateAddress({ ...current, ...input }, false);
  const makeDefault = input.is_default === true || current.is_default;
  if (input.is_default === true && !current.is_default) await clearDefault(customerId);
  check(await getSupabase().from('customer_addresses').update({ ...a, is_default: makeDefault, updated_at: new Date().toISOString() }).eq('id', id).eq('customer_id', customerId));
  if (makeDefault) await syncProfileDefault(customerId, a);
  return (await listAddresses(customerId)).find((r) => r.id === id)!;
}

export async function deleteAddress(customerId: string, id: string): Promise<void> {
  const all = await listAddresses(customerId);
  const target = all.find((r) => r.id === id);
  if (!target) throw new Error('Address not found');
  check(await getSupabase().from('customer_addresses').delete().eq('id', id).eq('customer_id', customerId));
  // Promote the next address so there's always a default while any remain
  if (target.is_default) {
    const next = all.find((r) => r.id !== id);
    if (next) {
      check(await getSupabase().from('customer_addresses').update({ is_default: true }).eq('id', next.id));
      await syncProfileDefault(customerId, next);
    }
  }
}

// Saves the address used at checkout into the address book unless it is already there
export async function rememberAddress(customerId: string, a: AddressInput): Promise<void> {
  const all = await listAddresses(customerId);
  const norm = (s?: string | null) => (s || '').trim().toLowerCase();
  const same = all.some((r) => norm(r.address_line1) === norm(a.address_line1) && r.postal_code === a.postal_code.trim() && norm(r.address_line2) === norm(a.address_line2));
  if (same || all.length >= MAX_SAVED_ADDRESSES) return;
  try {
    await createAddress(customerId, { ...a, label: all.length === 0 ? 'Home' : `Address ${all.length + 1}` });
  } catch (err) {
    console.error('[ADDRESS BOOK] could not remember checkout address:', err);
  }
}

// --- CHANGING THE ADDRESS ON AN ORDER ---
export interface AddressChangeRule {
  allowed: boolean;
  reason?: string;
  deadline?: string | null;
}

// One-off/trial: within 2 hours of ordering. Subscription boxes: any time.
// Both lock as soon as the box is packed or dispatched.
export function addressChangeRule(order: Pick<Order, 'created_at' | 'payment_status' | 'fulfilment_status'> & { order_type?: string | null }): AddressChangeRule {
  if (order.payment_status !== 'paid') return { allowed: false, reason: 'Only paid orders can be re-addressed' };
  if (!EDITABLE_FULFILMENT.includes(order.fulfilment_status)) {
    return {
      allowed: false,
      reason: order.fulfilment_status === 'cancelled' ? 'This order was cancelled' : 'Your box is already being packed or is on its way, so the address can’t be changed',
    };
  }
  if (order.order_type === 'subscription') return { allowed: true, deadline: null };
  const deadline = new Date(new Date(order.created_at).getTime() + ONE_OFF_CHANGE_WINDOW_MS);
  if (Date.now() > deadline.getTime()) return { allowed: false, reason: 'The 2-hour window to change this order’s address has passed' };
  return { allowed: true, deadline: deadline.toISOString() };
}

const addressOf = (o: any) => ({
  name: o.customer_name,
  phone: o.customer_phone,
  address_line1: o.shipping_address_line1,
  address_line2: o.shipping_address_line2,
  city: o.shipping_city,
  state: o.shipping_state,
  postal_code: o.shipping_postal_code,
});

// Applies a new delivery address to one order and records the change
export async function applyOrderAddress(order: Order, a: AddressInput, changedBy: string): Promise<void> {
  const sb = getSupabase();
  check(await sb.from('orders').update({
    customer_name: a.name,
    customer_phone: a.phone,
    shipping_address_line1: a.address_line1,
    shipping_address_line2: a.address_line2,
    shipping_city: a.city,
    shipping_state: a.state,
    shipping_postal_code: a.postal_code,
    updated_at: new Date().toISOString(),
  }).eq('id', order.id).in('fulfilment_status', EDITABLE_FULFILMENT));
  check(await sb.from('order_address_changes').insert({
    id: `adch_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    order_id: order.id,
    changed_by: changedBy,
    old_address: addressOf(order),
    new_address: a,
  }));
}

// Subscription boxes not yet packed, so a subscription address change also reaches them
export async function getEditableSubscriptionOrders(subscriptionId: string): Promise<Order[]> {
  const ids = check(
    await getSupabase().from('orders').select('id').eq('subscription_id', subscriptionId).eq('payment_status', 'paid').in('fulfilment_status', EDITABLE_FULFILMENT)
  ) as any[];
  const { getOrderById } = await import('./service');
  return (await Promise.all(ids.map((r) => getOrderById(r.id)))).filter(Boolean) as Order[];
}
