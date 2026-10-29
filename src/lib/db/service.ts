import crypto from 'crypto';
import { getSupabase } from './supabase';
import { hashPassword, verifyPassword } from './password';
import type { Product, ProductVariant, Order, OrderItem, Customer, Refund, CartValidationResult } from '@/types';

export type { Product, ProductVariant, Order, OrderItem, Customer, Refund, CartValidationResult } from '@/types';

const CUSTOMER_COLUMNS = 'id, email, name, phone, address_line1, address_line2, city, state, postal_code, country, is_active, created_at, updated_at';
const ORDER_WITH_RELATIONS = '*, items:order_items(*), refunds(*)';

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

// Throw on Supabase errors so routes surface a 500 instead of silently returning empty data.
function check<T>(res: { data: T; error: any }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// jsonb columns come back as objects; the frontend expects JSON strings.
function normalizeProduct(raw: any): Product {
  const variants = (raw.variants || []) as ProductVariant[];
  return {
    ...raw,
    gallery_json: typeof raw.gallery_json === 'string' ? raw.gallery_json : JSON.stringify(raw.gallery_json ?? []),
    nutrition_json: typeof raw.nutrition_json === 'string' ? raw.nutrition_json : JSON.stringify(raw.nutrition_json ?? {}),
    variants: variants.sort((a, b) => a.pack_size - b.pack_size),
  };
}

function normalizeOrder(raw: any): Order {
  const refunds = (raw.refunds || []) as Refund[];
  return {
    ...raw,
    items: raw.items || [],
    refunds: refunds.sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

async function audit(actorType: string, actorId: string | null, action: string, entityId: string, details: any) {
  await getSupabase().from('audit_logs').insert({
    id: newId('log'),
    actor_type: actorType,
    actor_id: actorId,
    action,
    entity_type: 'order',
    entity_id: entityId,
    details_json: details,
  });
}

export function generateOrderReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  const bytes = crypto.randomBytes(5);
  for (let i = 0; i < 5; i++) {
    rand += chars[bytes[i] % chars.length];
  }
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  return `RETU-${yearSuffix}-${rand}`;
}

export function toPlain<T>(obj: T): T {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
}

// --- PRODUCT SERVICE ---
export async function getAllProducts(includeInactive = false): Promise<Product[]> {
  let query = getSupabase().from('products').select('*, variants:product_variants(*)').order('created_at');
  if (!includeInactive) query = query.eq('is_active', true);
  const rows = check(await query) as any[];
  return rows.map((p) => {
    const prod = normalizeProduct(p);
    if (!includeInactive) prod.variants = prod.variants!.filter((v) => v.is_active);
    return prod;
  });
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const raw = check(await getSupabase().from('products').select('*, variants:product_variants(*)').eq('slug', slug).maybeSingle());
  if (!raw) return null;
  const prod = normalizeProduct(raw);
  prod.variants = prod.variants!.filter((v) => v.is_active);
  return prod;
}

export async function getProductById(id: string): Promise<Product | null> {
  const raw = check(await getSupabase().from('products').select('*, variants:product_variants(*)').eq('id', id).maybeSingle());
  return raw ? normalizeProduct(raw) : null;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  const { id: _id, variants: _v, created_at: _c, ...fields } = data as any;
  check(await getSupabase().from('products').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id));
}

export async function getVariantById(id: string): Promise<ProductVariant | null> {
  return check(await getSupabase().from('product_variants').select('*').eq('id', id).maybeSingle());
}

export async function updateVariant(id: string, data: Partial<ProductVariant>): Promise<void> {
  const { id: _id, product_id: _p, created_at: _c, ...fields } = data as any;
  check(await getSupabase().from('product_variants').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id));
}

// --- SERVER-SIDE CART & PRICING VALIDATOR ---
export async function validateCartItems(clientItems: { variant_id: string; quantity: number }[]): Promise<CartValidationResult> {
  const result: CartValidationResult = {
    valid: true,
    subtotal_paise: 0,
    shipping_paise: 0,
    tax_paise: 0,
    discount_paise: 0,
    total_paise: 0,
    items: [],
    errors: [],
  };

  if (!clientItems || clientItems.length === 0) {
    result.valid = false;
    result.errors.push('Cart is empty');
    return result;
  }

  const ids = clientItems.map((i) => i.variant_id).filter(Boolean);
  const rows = check(
    await getSupabase().from('product_variants').select('*, product:products(name, image_url, is_active)').in('id', ids)
  ) as any[];
  const byId = new Map(rows.map((r) => [r.id, r]));

  for (const item of clientItems) {
    if (!item.variant_id || typeof item.quantity !== 'number' || item.quantity <= 0) {
      result.valid = false;
      result.errors.push('Invalid item quantity');
      continue;
    }

    const row = byId.get(item.variant_id);
    if (!row || !row.is_active || !row.product?.is_active) {
      result.valid = false;
      result.errors.push(`Item '${item.variant_id}' is no longer available`);
      continue;
    }

    if (row.stock_quantity < item.quantity) {
      result.valid = false;
      result.errors.push(`Insufficient stock for '${row.product.name} - ${row.name}' (Available: ${row.stock_quantity})`);
      continue;
    }

    const itemTotalPaise = row.price_paise * item.quantity;
    result.subtotal_paise += itemTotalPaise;

    result.items.push({
      product_id: row.product_id,
      variant_id: row.id,
      product_name: row.product.name,
      variant_name: row.name,
      sku: row.sku,
      quantity: item.quantity,
      unit_price_paise: row.price_paise,
      total_price_paise: itemTotalPaise,
      image_url: row.product.image_url,
    });
  }

  // Free cold-chain express shipping above ₹999 (99900 paise); otherwise ₹99 flat.
  result.shipping_paise = result.subtotal_paise >= 99900 ? 0 : 9900;
  result.tax_paise = 0;
  result.total_paise = result.subtotal_paise + result.shipping_paise - result.discount_paise;

  return result;
}

// --- ATOMIC ORDER CREATION ---
export interface CreateOrderInput {
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address_line1: string;
  shipping_address_line2?: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country?: string;
  items: { variant_id: string; quantity: number }[];
  notes?: string;
}

export async function createOrderWithReservation(input: CreateOrderInput): Promise<{ order: Order; razorpayAmountPaise: number }> {
  const validation = await validateCartItems(input.items);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  const now = new Date().toISOString();
  const orderId = newId('ord');

  const orderRow = {
    id: orderId,
    order_reference: generateOrderReference(),
    customer_id: input.customer_id || null,
    customer_name: input.customer_name.trim(),
    customer_email: input.customer_email.trim().toLowerCase(),
    customer_phone: input.customer_phone.trim(),
    shipping_address_line1: input.shipping_address_line1.trim(),
    shipping_address_line2: input.shipping_address_line2?.trim() || null,
    shipping_city: input.shipping_city.trim(),
    shipping_state: input.shipping_state.trim(),
    shipping_postal_code: input.shipping_postal_code.trim(),
    shipping_country: input.shipping_country?.trim() || 'India',
    subtotal_paise: validation.subtotal_paise,
    discount_paise: validation.discount_paise,
    tax_paise: validation.tax_paise,
    shipping_paise: validation.shipping_paise,
    total_paise: validation.total_paise,
    currency: 'INR',
    payment_status: 'pending',
    fulfilment_status: 'pending',
    notes: input.notes?.trim() || null,
    stock_restored: false,
    created_at: now,
    updated_at: now,
  };

  const itemRows = validation.items.map((item) => ({
    id: newId('item'),
    order_id: orderId,
    ...item,
    created_at: now,
  }));

  check(await getSupabase().rpc('create_order_with_reservation', { p_order: orderRow, p_items: itemRows }));

  const order = await getOrderById(orderId);
  if (!order) throw new Error('Order creation failed to retrieve saved record');
  return { order, razorpayAmountPaise: validation.total_paise };
}

export async function attachRazorpayOrderId(orderId: string, razorpayOrderId: string): Promise<void> {
  const sb = getSupabase();
  const order = check(
    await sb.from('orders').update({ razorpay_order_id: razorpayOrderId, updated_at: new Date().toISOString() }).eq('id', orderId).select('total_paise').maybeSingle()
  ) as any;
  if (order) {
    check(await sb.from('payment_attempts').insert({
      id: newId('att'),
      order_id: orderId,
      razorpay_order_id: razorpayOrderId,
      amount_paise: order.total_paise,
      currency: 'INR',
      status: 'created',
    }));
  }
}

async function getOrderBy(column: string, value: string): Promise<Order | null> {
  const raw = check(await getSupabase().from('orders').select(ORDER_WITH_RELATIONS).eq(column, value).maybeSingle());
  return raw ? normalizeOrder(raw) : null;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  return getOrderBy('id', orderId);
}

export async function getOrderByReference(reference: string): Promise<Order | null> {
  return getOrderBy('order_reference', reference);
}

export async function getOrderByRazorpayOrderId(rpOrderId: string): Promise<Order | null> {
  return getOrderBy('razorpay_order_id', rpOrderId);
}

export async function getOrderByRazorpayPaymentId(paymentId: string): Promise<Order | null> {
  return getOrderBy('razorpay_payment_id', paymentId);
}

export async function getOrdersByCustomerEmail(email: string): Promise<Order[]> {
  const rows = check(
    await getSupabase().from('orders').select(ORDER_WITH_RELATIONS).eq('customer_email', email.toLowerCase().trim()).order('created_at', { ascending: false })
  ) as any[];
  return rows.map(normalizeOrder);
}

// --- CUSTOMER ACCOUNT SERVICES ---
export async function createCustomer(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}): Promise<Customer> {
  const normalizedEmail = data.email.trim().toLowerCase();

  const existing = await getCustomerByEmail(normalizedEmail);
  if (existing) {
    throw new Error('An account with this email address already exists. Please log in.');
  }

  const { hash, salt } = hashPassword(data.password);
  return check(
    await getSupabase().from('customers').insert({
      id: newId('cust'),
      email: normalizedEmail,
      password_hash: hash,
      password_salt: salt,
      name: data.name.trim(),
      phone: data.phone.trim(),
      address_line1: data.address_line1?.trim() || null,
      address_line2: data.address_line2?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      postal_code: data.postal_code?.trim() || null,
      country: data.country?.trim() || 'India',
    }).select(CUSTOMER_COLUMNS).single()
  ) as Customer;
}

export async function authenticateCustomer(email: string, password: string): Promise<Customer | null> {
  const raw = check(
    await getSupabase().from('customers').select(`${CUSTOMER_COLUMNS}, password_hash, password_salt`).eq('email', email.trim().toLowerCase()).maybeSingle()
  ) as any;
  if (!raw || !verifyPassword(password, raw.password_hash, raw.password_salt)) return null;
  const { password_hash: _h, password_salt: _s, ...customer } = raw;
  return customer;
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  return check(await getSupabase().from('customers').select(CUSTOMER_COLUMNS).eq('id', id).maybeSingle()) as Customer | null;
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  return check(
    await getSupabase().from('customers').select(CUSTOMER_COLUMNS).eq('email', email.trim().toLowerCase()).maybeSingle()
  ) as Customer | null;
}

export async function getCustomerByPhone(phone: string): Promise<Customer | null> {
  const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '');
  if (!cleanPhone) return null;
  const rows = check(
    await getSupabase().from('customers').select(CUSTOMER_COLUMNS).or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone}`).limit(1)
  ) as any[];
  return rows[0] || null;
}

export async function findOrCreateCustomerOAuth(params: {
  email: string;
  name: string;
  phone?: string;
}): Promise<Customer> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const customer = await getCustomerByEmail(normalizedEmail);

  if (customer) {
    if (params.phone && (!customer.phone || customer.phone === '9999999999')) {
      return (await updateCustomerProfile(customer.id, { phone: params.phone }))!;
    }
    return customer;
  }

  // OAuth accounts get a random password they never use.
  return createCustomer({
    name: params.name || 'Customer',
    email: normalizedEmail,
    phone: params.phone || '9999999999',
    password: `OAuth_${crypto.randomBytes(16).toString('hex')}!`,
  });
}

export async function findOrCreateCustomerPhone(params: {
  phone: string;
  name?: string;
  email?: string;
}): Promise<Customer> {
  const cleanPhone = params.phone.replace(/^\+91/, '').replace(/\D/g, '');
  const customer = await getCustomerByPhone(cleanPhone);

  if (customer) {
    if (params.name && customer.name.startsWith('Customer')) {
      return (await updateCustomerProfile(customer.id, { name: params.name }))!;
    }
    return customer;
  }

  return createCustomer({
    name: params.name || `Customer (${cleanPhone.slice(-4)})`,
    email: params.email ? params.email.trim().toLowerCase() : `customer_${cleanPhone}@phone.retufoods.com`,
    phone: cleanPhone,
    password: `Phone_${crypto.randomBytes(16).toString('hex')}!`,
  });
}

export async function updateCustomerProfile(id: string, data: Partial<Customer>): Promise<Customer | null> {
  const allowed = ['name', 'phone', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country'];
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k) && v !== undefined) fields[k] = v;
  }
  if (Object.keys(fields).length > 0) {
    check(await getSupabase().from('customers').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id));
  }
  return getCustomerById(id);
}

export async function getOrdersByCustomerId(customerId: string): Promise<Order[]> {
  const customer = await getCustomerById(customerId);
  if (!customer) return [];
  const rows = check(
    await getSupabase()
      .from('orders')
      .select(ORDER_WITH_RELATIONS)
      .or(`customer_id.eq.${customerId},customer_email.eq."${customer.email.toLowerCase().trim()}"`)
      .order('created_at', { ascending: false })
  ) as any[];
  return rows.map(normalizeOrder);
}

// --- ORDER MUTATION & FULFILMENT SERVICES ---
export async function markOrderPaid(
  orderId: string,
  razorpayPaymentId: string,
  razorpaySignature?: string
): Promise<Order> {
  const sb = getSupabase();
  const now = new Date().toISOString();

  const update: Record<string, any> = {
    payment_status: 'paid',
    fulfilment_status: 'confirmed',
    razorpay_payment_id: razorpayPaymentId,
    updated_at: now,
  };
  if (razorpaySignature) update.razorpay_signature = razorpaySignature;
  check(await sb.from('orders').update(update).eq('id', orderId));

  check(await sb.from('payment_attempts')
    .update({ razorpay_payment_id: razorpayPaymentId, status: 'captured', updated_at: now })
    .eq('order_id', orderId)
    .neq('status', 'captured'));

  // Generate the tax invoice once payment is confirmed.
  await generateInvoiceRecord(orderId);

  const updated = await getOrderById(orderId);
  if (!updated) throw new Error('Order not found after update');
  return updated;
}

export async function markOrderPaymentFailed(
  orderId: string,
  errorCode?: string,
  errorDesc?: string
): Promise<Order | null> {
  const sb = getSupabase();
  const order = await getOrderById(orderId);
  if (!order) return null;

  if (order.payment_status !== 'paid') {
    check(await sb.rpc('restock_order', { p_order_id: orderId }));
    check(await sb.from('orders')
      .update({ payment_status: 'failed', fulfilment_status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .neq('payment_status', 'paid'));
  }

  check(await sb.from('payment_attempts')
    .update({ status: 'failed', error_code: errorCode || null, error_description: errorDesc || null, updated_at: new Date().toISOString() })
    .eq('order_id', orderId));

  return getOrderById(orderId);
}

export async function updateOrderFulfilment(
  orderId: string,
  status: Order['fulfilment_status'],
  carrier?: string,
  trackingNumber?: string
): Promise<void> {
  const update: Record<string, any> = { fulfilment_status: status, updated_at: new Date().toISOString() };
  if (carrier) update.tracking_carrier = carrier;
  if (trackingNumber) update.tracking_number = trackingNumber;
  check(await getSupabase().from('orders').update(update).eq('id', orderId));
}

export async function adminCancelOrder(
  orderId: string,
  params: {
    reason?: string;
    restock?: boolean;
    adminEmail?: string;
  }
): Promise<Order> {
  const sb = getSupabase();
  const shouldRestock = params.restock !== false;

  const existing = await getOrderById(orderId);
  if (!existing) throw new Error('Order not found');

  if (shouldRestock) {
    check(await sb.rpc('restock_order', { p_order_id: orderId }));
  }

  check(await sb.from('orders').update({
    fulfilment_status: 'cancelled',
    cancellation_status: 'approved',
    cancellation_admin_notes: params.reason || 'Cancelled by store administrator',
    updated_at: new Date().toISOString(),
  }).eq('id', orderId));

  await audit('admin', params.adminEmail || 'admin', 'order_cancelled', orderId, { reason: params.reason, restocked: shouldRestock });

  const updated = await getOrderById(orderId);
  if (!updated) throw new Error('Order not found after cancellation');
  return updated;
}

export async function requestOrderCancellation(orderId: string, reason: string): Promise<Order> {
  const now = new Date().toISOString();
  check(await getSupabase().from('orders').update({
    cancellation_status: 'requested',
    cancellation_reason: reason,
    cancellation_requested_at: now,
    updated_at: now,
  }).eq('id', orderId));

  const updated = await getOrderById(orderId);
  if (!updated) throw new Error('Order not found after cancellation request');
  return updated;
}

export async function rejectOrderCancellation(orderId: string, adminNotes: string, adminEmail: string): Promise<Order> {
  check(await getSupabase().from('orders').update({
    cancellation_status: 'rejected',
    cancellation_admin_notes: adminNotes,
    updated_at: new Date().toISOString(),
  }).eq('id', orderId));

  await audit('admin', adminEmail, 'cancellation_rejected', orderId, { adminNotes });

  const updated = await getOrderById(orderId);
  if (!updated) throw new Error('Order not found after rejection update');
  return updated;
}

// --- WEBHOOK IDEMPOTENCY ---
export async function isWebhookProcessed(eventId: string): Promise<boolean> {
  const row = check(await getSupabase().from('webhook_events').select('id').eq('id', eventId).eq('status', 'processed').maybeSingle());
  return !!row;
}

export async function recordWebhookEvent(eventId: string, eventType: string, payload: any): Promise<void> {
  check(await getSupabase().from('webhook_events').upsert(
    { id: eventId, event_type: eventType, payload_json: payload, status: 'received' },
    { onConflict: 'id', ignoreDuplicates: true }
  ));
}

export async function markWebhookProcessed(eventId: string, error?: string): Promise<void> {
  check(await getSupabase().from('webhook_events').update({
    status: error ? 'error' : 'processed',
    processed_at: new Date().toISOString(),
    error_message: error || null,
  }).eq('id', eventId));
}

// --- INVOICE GENERATOR ---
export async function generateInvoiceRecord(orderId: string): Promise<any> {
  const sb = getSupabase();
  const existing = await getInvoiceByOrderId(orderId);
  if (existing) return existing;

  const order = await getOrderById(orderId);
  if (!order) return null;

  const seq = check(await sb.rpc('next_invoice_number')) as number;
  const now = new Date().toISOString();
  const prefix = process.env.INVOICE_SERIES_PREFIX || `RETU-INV-${now.slice(0, 4)}-`;
  const customerAddress = `${order.shipping_address_line1}, ${order.shipping_address_line2 ? order.shipping_address_line2 + ', ' : ''}${order.shipping_city}, ${order.shipping_state} - ${order.shipping_postal_code}`;

  const res = await sb.from('invoices').insert({
    id: newId('inv'),
    order_id: orderId,
    invoice_number: `${prefix}${String(seq).padStart(4, '0')}`,
    invoice_date: now.slice(0, 10),
    company_name: process.env.INVOICE_COMPANY_NAME || 'DancingEarth Food Private Limited',
    company_address: [process.env.INVOICE_ADDRESS_LINE1, process.env.INVOICE_ADDRESS_LINE2].filter(Boolean).join(', ')
      || '2nd Floor, 235 Binnamangala, 13th Cross Road, Indiranagar, Bengaluru 560038, Karnataka, India',
    gstin: process.env.INVOICE_GSTIN || 'UNREGISTERED/CONSUMER',
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_address: customerAddress,
    subtotal_paise: order.subtotal_paise,
    tax_paise: order.tax_paise,
    shipping_paise: order.shipping_paise,
    total_paise: order.total_paise,
  }).select('*').single();

  // A concurrent webhook may have created the invoice first.
  if (res.error) return getInvoiceByOrderId(orderId);
  return res.data;
}

export async function getInvoiceByOrderId(orderId: string): Promise<any> {
  return check(await getSupabase().from('invoices').select('*').eq('order_id', orderId).maybeSingle());
}

// --- REFUND AND CANCELLATION METHODS ---
export async function createOrderRefund(params: {
  orderId: string;
  razorpayRefundId?: string | null;
  razorpayPaymentId?: string | null;
  amountPaise: number;
  reason?: string;
  initiatedBy: 'customer' | 'admin' | 'webhook';
  restock?: boolean;
  notes?: string;
}): Promise<Refund> {
  const sb = getSupabase();
  const order = await getOrderById(params.orderId);
  if (!order) {
    throw new Error(`Order ${params.orderId} not found`);
  }

  const shouldRestock = params.restock !== false;
  const alreadyRefunded = (order.refunds || [])
    .filter((r) => r.status === 'processed')
    .reduce((sum, r) => sum + Number(r.amount_paise), 0);
  const isFullRefund = alreadyRefunded + params.amountPaise >= order.total_paise;
  const newFulfilmentStatus = isFullRefund && ['pending', 'confirmed', 'processing'].includes(order.fulfilment_status)
    ? 'cancelled'
    : order.fulfilment_status;

  const refundId = newId('ref');
  const refund = check(await sb.from('refunds').insert({
    id: refundId,
    order_id: params.orderId,
    razorpay_refund_id: params.razorpayRefundId || null,
    razorpay_payment_id: params.razorpayPaymentId || order.razorpay_payment_id || null,
    amount_paise: params.amountPaise,
    currency: order.currency || 'INR',
    reason: params.reason || 'Requested refund',
    status: 'processed',
    restocked: shouldRestock,
    initiated_by: params.initiatedBy,
    notes: params.notes || null,
  }).select('*').single()) as Refund;

  if (shouldRestock) {
    check(await sb.rpc('restock_order', { p_order_id: params.orderId }));
  }

  const update: Record<string, any> = {
    payment_status: isFullRefund ? 'refunded' : 'partially_refunded',
    fulfilment_status: newFulfilmentStatus,
    updated_at: new Date().toISOString(),
  };
  if (newFulfilmentStatus === 'cancelled') update.cancellation_status = 'approved';
  check(await sb.from('orders').update(update).eq('id', params.orderId));

  await audit(params.initiatedBy, params.initiatedBy, 'order_refunded', params.orderId, {
    refund_id: refundId,
    razorpay_refund_id: params.razorpayRefundId,
    amount_paise: params.amountPaise,
    restocked: shouldRestock,
    reason: params.reason,
  });

  return refund;
}

export async function getRefundsByOrderId(orderId: string): Promise<Refund[]> {
  return check(await getSupabase().from('refunds').select('*').eq('order_id', orderId).order('created_at', { ascending: false })) as Refund[];
}

export async function getRefundByRazorpayRefundId(razorpayRefundId: string): Promise<Refund | null> {
  return check(await getSupabase().from('refunds').select('*').eq('razorpay_refund_id', razorpayRefundId).maybeSingle()) as Refund | null;
}

// --- ADMIN DASHBOARD QUERIES ---
export async function getAdminStats(): Promise<any> {
  const sb = getSupabase();
  const countOf = async (build: (q: any) => any) => {
    const res = await build(sb.from('orders').select('id', { count: 'exact', head: true }));
    if (res.error) throw new Error(res.error.message);
    return res.count ?? 0;
  };
  const [totalOrders, pendingOrders, failedOrders, awaitingFulfilment, cancellationRequestsCount] = await Promise.all([
    countOf((q) => q),
    countOf((q) => q.eq('payment_status', 'pending')),
    countOf((q) => q.eq('payment_status', 'failed')),
    countOf((q) => q.eq('payment_status', 'paid').in('fulfilment_status', ['confirmed', 'processing'])),
    countOf((q) => q.eq('cancellation_status', 'requested')),
  ]);

  const paid = check(await sb.from('orders').select('total_paise').eq('payment_status', 'paid')) as any[];
  const grossSalesPaise = paid.reduce((sum, o) => sum + Number(o.total_paise), 0);

  const lowStock = check(
    await sb.from('product_variants').select('id, name, stock_quantity, sku, product:products(name)').lte('stock_quantity', 15).order('stock_quantity')
  ) as any[];
  const lowStockVariants = lowStock.map((v) => ({
    id: v.id,
    variant_name: v.name,
    stock_quantity: v.stock_quantity,
    sku: v.sku,
    product_name: v.product?.name,
  }));

  const recentOrders = check(await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(10));

  return {
    totalOrders,
    grossSalesPaise,
    pendingOrders,
    failedOrders,
    awaitingFulfilment,
    cancellationRequestsCount,
    lowStockVariants,
    recentOrders,
  };
}

export async function getAllOrdersAdmin(status?: string, search?: string): Promise<Order[]> {
  let query = getSupabase().from('orders').select(ORDER_WITH_RELATIONS);

  if (status && status !== 'all') {
    if (status === 'cancellation_requested') {
      query = query.eq('cancellation_status', 'requested');
    } else if (/^[a-z_]+$/.test(status)) {
      query = query.or(`payment_status.eq.${status},fulfilment_status.eq.${status}`);
    }
  }

  if (search && search.trim()) {
    // Strip characters that have meaning in PostgREST filter syntax.
    const term = search.trim().replace(/[,()*%]/g, '');
    if (term) {
      query = query.or(
        ['order_reference', 'customer_email', 'customer_name', 'customer_phone', 'razorpay_payment_id']
          .map((c) => `${c}.ilike.%${term}%`)
          .join(',')
      );
    }
  }

  const rows = check(await query.order('created_at', { ascending: false })) as any[];
  return rows.map(normalizeOrder);
}
