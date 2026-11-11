import crypto from 'crypto';
import { getSupabase } from './supabase';
import { getOrderById, getOrderByRazorpayPaymentId, generateOrderReference, markOrderPaid } from './service';
import type { Customer, Order } from '@/types';
import { createRazorpayPlan, createRazorpaySubscription } from '../payments/razorpay';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  interval_weeks: number;
  variant_id: string;
  packs_per_cycle: number;
  price_paise: number;
  shipping_paise: number;
  total_cycles: number;
  razorpay_plan_id: string | null;
  razorpay_plan_amount_paise: number | null;
  is_active: boolean;
  sort_order: number;
}

export type SubscriptionStatus =
  | 'created' | 'authenticated' | 'active' | 'pending' | 'halted' | 'paused' | 'cancelled' | 'completed' | 'expired';

export interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  razorpay_subscription_id: string | null;
  status: SubscriptionStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  paid_count: number;
  current_start: string | null;
  current_end: string | null;
  next_charge_at: string | null;
  last_payment_failed_at: string | null;
  last_failure_reason: string | null;
  cancel_at_cycle_end: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
}

// Statuses in which a subscription still counts as "the customer has a subscription"
export const LIVE_STATUSES: SubscriptionStatus[] = ['authenticated', 'active', 'pending', 'halted', 'paused'];

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

function check<T>(res: { data: T; error: any }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const SUB_WITH_PLAN = '*, plan:subscription_plans(*)';
const toIso = (unix?: number | null) => (unix ? new Date(unix * 1000).toISOString() : null);
export const cycleTotalPaise = (plan: SubscriptionPlan) => plan.price_paise + plan.shipping_paise;

// --- PLANS ---
export async function getActivePlans(): Promise<SubscriptionPlan[]> {
  return check(await getSupabase().from('subscription_plans').select('*').eq('is_active', true).order('sort_order')) as SubscriptionPlan[];
}

export async function getPlanById(id: string): Promise<SubscriptionPlan | null> {
  return check(await getSupabase().from('subscription_plans').select('*').eq('id', id).maybeSingle()) as SubscriptionPlan | null;
}

// Razorpay plans can't change price, so create a fresh one whenever our price no longer matches
async function ensureRazorpayPlan(plan: SubscriptionPlan): Promise<string> {
  const amount = cycleTotalPaise(plan);
  if (plan.razorpay_plan_id && plan.razorpay_plan_amount_paise === amount) return plan.razorpay_plan_id;
  const razorpayPlanId = await createRazorpayPlan({
    intervalWeeks: plan.interval_weeks,
    amountPaise: amount,
    name: `mi-biotics ${plan.name}`,
    description: plan.description || plan.name,
  });
  check(await getSupabase().from('subscription_plans').update({
    razorpay_plan_id: razorpayPlanId,
    razorpay_plan_amount_paise: amount,
    updated_at: new Date().toISOString(),
  }).eq('id', plan.id));
  return razorpayPlanId;
}

// --- FIRST-TIME BUYER RULE ---
const phoneKey = (phone: string) => phone.replace(/\D/g, '').slice(-10);

// A customer is a first-time buyer only if no completed purchase or live subscription matches
// their account, email or phone number (so a new account can't reuse an old number for the trial)
export async function isFirstTimeBuyer(params: { customerId?: string | null; email: string; phone: string }): Promise<boolean> {
  const sb = getSupabase();
  const email = params.email.trim().toLowerCase();
  const phone = phoneKey(params.phone);

  const filters = [`customer_email.eq."${email}"`];
  if (params.customerId) filters.push(`customer_id.eq.${params.customerId}`);
  if (phone.length === 10) filters.push(`customer_phone.like.%${phone}`);

  const purchased = check(
    await sb.from('orders').select('id').in('payment_status', ['paid', 'partially_refunded', 'refunded']).or(filters.join(',')).limit(1)
  ) as any[];
  if (purchased.length > 0) return false;

  const subs = check(
    await sb.from('subscriptions').select('id').in('status', LIVE_STATUSES).or(filters.join(',')).limit(1)
  ) as any[];
  return subs.length === 0;
}

// --- SUBSCRIPTION LIFECYCLE ---
export async function getSubscriptionById(id: string): Promise<Subscription | null> {
  return check(await getSupabase().from('subscriptions').select(SUB_WITH_PLAN).eq('id', id).maybeSingle()) as Subscription | null;
}

export async function getSubscriptionByRazorpayId(razorpaySubscriptionId: string): Promise<Subscription | null> {
  return check(
    await getSupabase().from('subscriptions').select(SUB_WITH_PLAN).eq('razorpay_subscription_id', razorpaySubscriptionId).maybeSingle()
  ) as Subscription | null;
}

// Hides checkouts the customer opened but never completed
export async function getSubscriptionsByCustomer(customerId: string): Promise<Subscription[]> {
  return check(
    await getSupabase().from('subscriptions').select(SUB_WITH_PLAN).eq('customer_id', customerId).neq('status', 'created').order('created_at', { ascending: false })
  ) as Subscription[];
}

export async function getAllSubscriptionsAdmin(): Promise<Subscription[]> {
  return check(
    await getSupabase().from('subscriptions').select(SUB_WITH_PLAN).neq('status', 'created').order('created_at', { ascending: false })
  ) as Subscription[];
}

export async function hasLiveSubscription(customerId: string): Promise<boolean> {
  const rows = check(
    await getSupabase().from('subscriptions').select('id').eq('customer_id', customerId).in('status', LIVE_STATUSES).limit(1)
  ) as any[];
  return rows.length > 0;
}

export async function createPendingSubscription(
  customer: Customer,
  plan: SubscriptionPlan,
  address: ShippingAddress
): Promise<{ subscription: Subscription; isSimulator: boolean }> {
  const razorpayPlanId = await ensureRazorpayPlan(plan);
  const id = newId('sub');
  const now = new Date().toISOString();

  check(await getSupabase().from('subscriptions').insert({
    id,
    customer_id: customer.id,
    plan_id: plan.id,
    status: 'created',
    customer_name: address.name.trim(),
    customer_email: customer.email.toLowerCase(),
    customer_phone: address.phone.trim(),
    shipping_address_line1: address.address_line1.trim(),
    shipping_address_line2: address.address_line2?.trim() || null,
    shipping_city: address.city.trim(),
    shipping_state: address.state.trim(),
    shipping_postal_code: address.postal_code.trim(),
    created_at: now,
    updated_at: now,
  }));

  const razorpay = await createRazorpaySubscription({
    planId: razorpayPlanId,
    totalCount: plan.total_cycles,
    notes: { internal_subscription_id: id, customer_id: customer.id, plan: plan.name },
  });

  check(await getSupabase().from('subscriptions').update({ razorpay_subscription_id: razorpay.id }).eq('id', id));
  const subscription = await getSubscriptionById(id);
  if (!subscription) throw new Error('Subscription could not be saved');
  return { subscription, isSimulator: razorpay.isSimulator };
}

// Mirrors Razorpay's view of the subscription (status, cycle dates, charges so far)
export async function syncSubscriptionFromRazorpay(sub: Subscription, entity: any, statusOverride?: SubscriptionStatus): Promise<Subscription> {
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  const status = statusOverride || entity?.status;
  if (status) update.status = status;
  if (entity) {
    if (typeof entity.paid_count === 'number') update.paid_count = entity.paid_count;
    if (entity.current_start) update.current_start = toIso(entity.current_start);
    if (entity.current_end) update.current_end = toIso(entity.current_end);
    update.next_charge_at = toIso(entity.charge_at);
  }
  if (status === 'active') {
    update.last_payment_failed_at = null;
    update.last_failure_reason = null;
  }
  if (status === 'cancelled' || status === 'completed' || status === 'expired') {
    update.cancelled_at = sub.cancelled_at || new Date().toISOString();
    update.next_charge_at = null;
  }
  check(await getSupabase().from('subscriptions').update(update).eq('id', sub.id));
  return (await getSubscriptionById(sub.id))!;
}

export async function markSubscriptionPaymentFailed(sub: Subscription, status: SubscriptionStatus, reason: string): Promise<Subscription> {
  check(await getSupabase().from('subscriptions').update({
    status,
    last_payment_failed_at: new Date().toISOString(),
    last_failure_reason: reason,
    updated_at: new Date().toISOString(),
  }).eq('id', sub.id));
  return (await getSubscriptionById(sub.id))!;
}

export async function updateSubscriptionAddress(subId: string, address: ShippingAddress): Promise<Subscription> {
  check(await getSupabase().from('subscriptions').update({
    customer_name: address.name.trim(),
    customer_phone: address.phone.trim(),
    shipping_address_line1: address.address_line1.trim(),
    shipping_address_line2: address.address_line2?.trim() || null,
    shipping_city: address.city.trim(),
    shipping_state: address.state.trim(),
    shipping_postal_code: address.postal_code.trim(),
    updated_at: new Date().toISOString(),
  }).eq('id', subId));
  return (await getSubscriptionById(subId))!;
}

export async function setSubscriptionFlags(subId: string, fields: Partial<Pick<Subscription, 'status' | 'cancel_at_cycle_end'>>): Promise<Subscription> {
  check(await getSupabase().from('subscriptions').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', subId));
  return (await getSubscriptionById(subId))!;
}

// One paid order per successful charge. Keyed on the Razorpay payment id, so the checkout
// callback and webhook retries for the same charge always resolve to the same order.
export async function createSubscriptionCycleOrder(
  sub: Subscription,
  razorpayPaymentId: string,
  amountPaise?: number
): Promise<{ order: Order; created: boolean }> {
  const existing = await getOrderByRazorpayPaymentId(razorpayPaymentId);
  if (existing) return { order: existing, created: false };

  const sb = getSupabase();
  const plan = sub.plan || (await getPlanById(sub.plan_id));
  if (!plan) throw new Error(`Plan ${sub.plan_id} not found`);
  const variant = check(
    await sb.from('product_variants').select('*, product:products(id, name, image_url)').eq('id', plan.variant_id).single()
  ) as any;

  const total = amountPaise || cycleTotalPaise(plan);
  const now = new Date().toISOString();
  const orderId = newId('ord');
  const unitPrice = Math.round(plan.price_paise / plan.packs_per_cycle);

  const orderRow = {
    id: orderId,
    order_reference: generateOrderReference(),
    customer_id: sub.customer_id,
    customer_name: sub.customer_name,
    customer_email: sub.customer_email,
    customer_phone: sub.customer_phone,
    shipping_address_line1: sub.shipping_address_line1,
    shipping_address_line2: sub.shipping_address_line2,
    shipping_city: sub.shipping_city,
    shipping_state: sub.shipping_state,
    shipping_postal_code: sub.shipping_postal_code,
    shipping_country: sub.shipping_country,
    subtotal_paise: plan.price_paise,
    discount_paise: 0,
    tax_paise: 0,
    shipping_paise: total - plan.price_paise,
    total_paise: total,
    currency: 'INR',
    payment_status: 'pending',
    fulfilment_status: 'pending',
    razorpay_order_id: null,
    razorpay_payment_id: razorpayPaymentId,
    // paid_count is synced from Razorpay before this runs, so it already includes this charge
    notes: `${plan.name} — cycle ${Math.max(sub.paid_count, 1)}`,
    stock_restored: false,
    order_type: 'subscription',
    subscription_id: sub.id,
    created_at: now,
    updated_at: now,
  };
  const itemRows = [{
    id: newId('item'),
    order_id: orderId,
    product_id: variant.product_id,
    variant_id: variant.id,
    product_name: variant.product.name,
    variant_name: variant.name,
    sku: variant.sku,
    quantity: plan.packs_per_cycle,
    unit_price_paise: unitPrice,
    total_price_paise: unitPrice * plan.packs_per_cycle,
    image_url: variant.product.image_url,
    created_at: now,
  }];

  const reserved = await sb.rpc('create_order_with_reservation', { p_order: orderRow, p_items: itemRows });
  if (reserved.error) {
    if (/duplicate key/i.test(reserved.error.message)) {
      const raced = await getOrderByRazorpayPaymentId(razorpayPaymentId);
      if (raced) return { order: raced, created: false };
    }
    // The customer has already been charged, so never drop the order: save it without
    // reserving stock and flag it for the team to source the packs.
    console.error('[SUBSCRIPTION ORDER] stock reservation failed, saving flagged order:', reserved.error.message);
    check(await sb.from('orders').insert({ ...orderRow, notes: `${orderRow.notes} — STOCK SHORTFALL: ${reserved.error.message}` }));
    check(await sb.from('order_items').insert(itemRows));
  }

  const order = await markOrderPaid(orderId, razorpayPaymentId);
  return { order, created: true };
}

export async function getOrdersForSubscription(subId: string): Promise<Order[]> {
  const rows = check(
    await getSupabase().from('orders').select('id').eq('subscription_id', subId).order('created_at', { ascending: false })
  ) as any[];
  const orders = await Promise.all(rows.map((r) => getOrderById(r.id)));
  return orders.filter(Boolean) as Order[];
}
