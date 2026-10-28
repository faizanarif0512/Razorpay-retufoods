import { getDb, hashPassword, verifyPassword } from './index.ts';
import {
  isNeonConfigured,
  persistOrderToNeon,
  persistCustomerToNeon,
  updateCustomerProfileInNeon,
  updateOrderPaymentInNeon,
  updateOrderPaymentFailedInNeon,
  attachRazorpayOrderIdToNeon,
  persistInvoiceToNeon,
  updateProductInNeon,
  updateVariantInNeon,
  updateOrderFulfilmentInNeon,
  updateOrderCancellationInNeon,
  persistRefundToNeon,
  recordWebhookEventInNeon,
  markWebhookProcessedInNeon,
  fetchOrderFromNeonById,
  fetchOrderFromNeonByReference,
  fetchOrderFromNeonByRazorpayOrderId,
  fetchOrdersFromNeonByCustomerId,
  fetchCustomerFromNeonByEmail,
  fetchCustomerFromNeonById,
  fetchCustomerFromNeonByPhone,
  fetchInvoiceFromNeonByOrderId,
  fetchAllOrdersFromNeon,
  fetchAdminStatsFromNeon,
} from './supabase.ts';
import crypto from 'crypto';

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  pack_size: number;
  price_paise: number;
  compare_at_price_paise: number | null;
  stock_quantity: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  flavor: string;
  category: string;
  image_url: string;
  gallery_json: string;
  ingredients: string;
  nutrition_json: string;
  usage_instructions: string;
  is_active: number;
  is_verified_price: number;
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  quantity: number;
  unit_price_paise: number;
  total_price_paise: number;
  image_url: string | null;
  created_at?: string;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_reference: string;
  customer_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  subtotal_paise: number;
  discount_paise: number;
  tax_paise: number;
  shipping_paise: number;
  total_paise: number;
  currency: string;
  payment_status: 'created' | 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  fulfilment_status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  notes: string | null;
  tracking_carrier: string | null;
  tracking_number: string | null;
  cancellation_status?: 'requested' | 'approved' | 'rejected' | null;
  cancellation_reason?: string | null;
  cancellation_requested_at?: string | null;
  cancellation_admin_notes?: string | null;
  stock_restored?: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  refunds?: Refund[];
}

export interface Refund {
  id: string;
  order_id: string;
  razorpay_refund_id: string | null;
  razorpay_payment_id: string | null;
  amount_paise: number;
  currency: string;
  reason: string | null;
  status: 'processed' | 'pending' | 'failed';
  restocked: number;
  initiated_by: 'customer' | 'admin' | 'webhook';
  notes: string | null;
  created_at: string;
}

export interface CartValidationResult {
  valid: boolean;
  subtotal_paise: number;
  shipping_paise: number;
  tax_paise: number;
  discount_paise: number;
  total_paise: number;
  items: {
    product_id: string;
    variant_id: string;
    product_name: string;
    variant_name: string;
    sku: string;
    quantity: number;
    unit_price_paise: number;
    total_price_paise: number;
    image_url: string;
  }[];
  errors: string[];
}

// Generates a human-friendly, cryptographically random order reference e.g. RETU-26-8XK4M
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

function cacheNeonOrderToSqlite(o: any) {
  if (!o) return;
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO orders (
        id, order_reference, customer_id, customer_name, customer_email, customer_phone,
        shipping_address_line1, shipping_address_line2, shipping_city, shipping_state,
        shipping_postal_code, shipping_country, subtotal_paise, discount_paise, tax_paise,
        shipping_paise, total_paise, currency, payment_status, fulfilment_status,
        razorpay_order_id, razorpay_payment_id, razorpay_signature, notes,
        tracking_carrier, tracking_number, cancellation_status, cancellation_reason,
        cancellation_requested_at, cancellation_admin_notes, stock_restored,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        payment_status = excluded.payment_status,
        fulfilment_status = excluded.fulfilment_status,
        razorpay_order_id = excluded.razorpay_order_id,
        razorpay_payment_id = excluded.razorpay_payment_id,
        razorpay_signature = excluded.razorpay_signature,
        cancellation_status = excluded.cancellation_status,
        updated_at = excluded.updated_at
    `).run(
      o.id, o.order_reference, o.customer_id || null, o.customer_name,
      o.customer_email, o.customer_phone, o.shipping_address_line1,
      o.shipping_address_line2 || null, o.shipping_city, o.shipping_state,
      o.shipping_postal_code, o.shipping_country || 'India', o.subtotal_paise,
      o.discount_paise || 0, o.tax_paise || 0, o.shipping_paise || 0,
      o.total_paise, o.currency || 'INR', o.payment_status || 'pending',
      o.fulfilment_status || 'pending', o.razorpay_order_id || null,
      o.razorpay_payment_id || null, o.razorpay_signature || null, o.notes || null,
      o.tracking_carrier || null, o.tracking_number || null,
      o.cancellation_status || null, o.cancellation_reason || null,
      o.cancellation_requested_at ? new Date(o.cancellation_requested_at).toISOString() : null,
      o.cancellation_admin_notes || null, o.stock_restored ? 1 : 0,
      o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString(),
      o.updated_at ? new Date(o.updated_at).toISOString() : new Date().toISOString()
    );

    if (o.items && Array.isArray(o.items)) {
      const insItem = db.prepare(`
        INSERT INTO order_items (
          id, order_id, product_id, variant_id, product_name, variant_name, sku,
          quantity, unit_price_paise, total_price_paise, image_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING
      `);
      for (const it of o.items) {
        insItem.run(
          it.id, it.order_id, it.product_id, it.variant_id, it.product_name,
          it.variant_name, it.sku, it.quantity, it.unit_price_paise,
          it.total_price_paise, it.image_url || null,
          it.created_at ? new Date(it.created_at).toISOString() : new Date().toISOString()
        );
      }
    }
  } catch (err) {
    // Ignore cache error
  }
}

function cacheNeonCustomerToSqlite(c: any) {
  if (!c) return;
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO customers (
        id, email, password_hash, password_salt, name, phone,
        address_line1, address_line2, city, state, postal_code, country,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        password_hash = excluded.password_hash,
        password_salt = excluded.password_salt,
        name = excluded.name,
        phone = excluded.phone,
        address_line1 = excluded.address_line1,
        address_line2 = excluded.address_line2,
        city = excluded.city,
        state = excluded.state,
        postal_code = excluded.postal_code,
        country = excluded.country,
        updated_at = excluded.updated_at
    `).run(
      c.id, c.email, c.password_hash, c.password_salt, c.name, c.phone,
      c.address_line1 || null, c.address_line2 || null, c.city || null,
      c.state || null, c.postal_code || null, c.country || 'India',
      c.is_active ? 1 : 0,
      c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
      c.updated_at ? new Date(c.updated_at).toISOString() : new Date().toISOString()
    );
  } catch (err) {
    // Ignore cache error
  }
}

function cacheNeonInvoiceToSqlite(inv: any) {
  if (!inv) return;
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO invoices (
        id, order_id, invoice_number, invoice_date, company_name, company_address,
        gstin, customer_name, customer_email, customer_address, subtotal_paise,
        tax_paise, shipping_paise, total_paise, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING
    `).run(
      inv.id, inv.order_id, inv.invoice_number,
      inv.invoice_date ? new Date(inv.invoice_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      inv.company_name, inv.company_address, inv.gstin || null,
      inv.customer_name, inv.customer_email, inv.customer_address,
      inv.subtotal_paise, inv.tax_paise, inv.shipping_paise, inv.total_paise,
      inv.created_at ? new Date(inv.created_at).toISOString() : new Date().toISOString()
    );
  } catch (err) {
    // Ignore cache error
  }
}

// --- PRODUCT SERVICE ---
export async function getAllProducts(includeInactive = false): Promise<Product[]> {
  const db = getDb();
  const query = includeInactive 
    ? 'SELECT * FROM products ORDER BY created_at ASC' 
    : 'SELECT * FROM products WHERE is_active = 1 ORDER BY created_at ASC';
  
  const rawProducts: any[] = db.prepare(query).all();
  const variantStmt = db.prepare(
    includeInactive
      ? 'SELECT * FROM product_variants WHERE product_id = ? ORDER BY pack_size ASC'
      : 'SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY pack_size ASC'
  );

  const products: Product[] = [];
  for (const raw of rawProducts) {
    const prod: Product = { ...raw };
    const rawVariants = variantStmt.all(prod.id);
    prod.variants = rawVariants.map((v: any) => ({ ...v }));
    products.push(prod);
  }
  return toPlain(products);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM products WHERE slug = ?').get(slug) as any;
  if (!raw) return null;
  const prod: Product = { ...raw };
  const rawVariants = db.prepare('SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY pack_size ASC').all(prod.id);
  prod.variants = rawVariants.map((v: any) => ({ ...v }));
  return toPlain(prod);
}

export async function getProductById(id: string): Promise<Product | null> {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!raw) return null;
  const prod: Product = { ...raw };
  const rawVariants = db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY pack_size ASC').all(prod.id);
  prod.variants = rawVariants.map((v: any) => ({ ...v }));
  return toPlain(prod);
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  const now = new Date().toISOString();

  for (const [key, val] of Object.entries(data)) {
    if (key !== 'id' && key !== 'variants' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  if (isNeonConfigured()) {
    await updateProductInNeon(id, data);
  }
}

export async function getVariantById(id: string): Promise<ProductVariant | null> {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(id) as any;
  if (!raw) return null;
  return toPlain({ ...raw });
}

export async function updateVariant(id: string, data: Partial<ProductVariant>): Promise<void> {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  const now = new Date().toISOString();

  for (const [key, val] of Object.entries(data)) {
    if (key !== 'id' && key !== 'product_id' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE product_variants SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  if (isNeonConfigured()) {
    await updateVariantInNeon(id, data);
  }
}

// --- SERVER-SIDE CART & PRICING VALIDATOR ---
export function validateCartItems(clientItems: { variant_id: string; quantity: number }[]): CartValidationResult {
  const db = getDb();
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

  const varStmt = db.prepare(`
    SELECT v.*, p.name as product_name, p.image_url as product_image, p.is_active as prod_active
    FROM product_variants v
    JOIN products p ON v.product_id = p.id
    WHERE v.id = ?
  `);

  for (const item of clientItems) {
    if (!item.variant_id || typeof item.quantity !== 'number' || item.quantity <= 0) {
      result.valid = false;
      result.errors.push('Invalid item quantity');
      continue;
    }

    const row = varStmt.get(item.variant_id);
    if (!row || !row.is_active || !row.prod_active) {
      result.valid = false;
      result.errors.push(`Item '${item.variant_id}' is no longer available`);
      continue;
    }

    if (row.stock_quantity < item.quantity) {
      result.valid = false;
      result.errors.push(`Insufficient stock for '${row.product_name} - ${row.name}' (Available: ${row.stock_quantity})`);
      continue;
    }

    const itemTotalPaise = row.price_paise * item.quantity;
    result.subtotal_paise += itemTotalPaise;

    result.items.push({
      product_id: row.product_id,
      variant_id: row.id,
      product_name: row.product_name,
      variant_name: row.name,
      sku: row.sku,
      quantity: item.quantity,
      unit_price_paise: row.price_paise,
      total_price_paise: itemTotalPaise,
      image_url: row.product_image,
    });
  }

  // Shipping Business Rule:
  // Free cold-chain express shipping above ₹999 (99900 paise); otherwise ₹99 flat cold-chain delivery.
  if (result.subtotal_paise >= 99900) {
    result.shipping_paise = 0;
  } else {
    result.shipping_paise = 9900;
  }

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
  const db = getDb();
  const validation = validateCartItems(input.items);

  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  const now = new Date().toISOString();
  const orderId = `ord_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const orderRef = generateOrderReference();

  // Atomically decrement stock and persist order in SQLite
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const decrementStock = db.prepare(`
      UPDATE product_variants
      SET stock_quantity = stock_quantity - ?, updated_at = ?
      WHERE id = ? AND stock_quantity >= ?
    `);

    for (const item of validation.items) {
      const res = decrementStock.run(item.quantity, now, item.variant_id, item.quantity);
      if (res.changes === 0) {
        throw new Error(`Item ${item.variant_name} became out of stock during checkout`);
      }
    }

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, order_reference, customer_id, customer_name, customer_email, customer_phone,
        shipping_address_line1, shipping_address_line2, shipping_city, shipping_state,
        shipping_postal_code, shipping_country, subtotal_paise, discount_paise,
        tax_paise, shipping_paise, total_paise, currency, payment_status,
        fulfilment_status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'pending', 'pending', ?, ?, ?)
    `);

    insertOrder.run(
      orderId,
      orderRef,
      input.customer_id || null,
      input.customer_name.trim(),
      input.customer_email.trim().toLowerCase(),
      input.customer_phone.trim(),
      input.shipping_address_line1.trim(),
      input.shipping_address_line2?.trim() || null,
      input.shipping_city.trim(),
      input.shipping_state.trim(),
      input.shipping_postal_code.trim(),
      input.shipping_country?.trim() || 'India',
      validation.subtotal_paise,
      validation.discount_paise,
      validation.tax_paise,
      validation.shipping_paise,
      validation.total_paise,
      input.notes?.trim() || null,
      now,
      now
    );

    const insertItem = db.prepare(`
      INSERT INTO order_items (
        id, order_id, product_id, variant_id, product_name, variant_name,
        sku, quantity, unit_price_paise, total_price_paise, image_url, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of validation.items) {
      const itemId = `item_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      insertItem.run(
        itemId,
        orderId,
        item.product_id,
        item.variant_id,
        item.product_name,
        item.variant_name,
        item.sku,
        item.quantity,
        item.unit_price_paise,
        item.total_price_paise,
        item.image_url,
        now
      );
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  const order = await getOrderById(orderId);
  if (!order) throw new Error('Order creation failed to retrieve saved record');

  if (isNeonConfigured()) {
    await persistOrderToNeon(order, order.items || []);
  }

  return { order, razorpayAmountPaise: validation.total_paise };
}

export async function attachRazorpayOrderId(orderId: string, razorpayOrderId: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE orders 
    SET razorpay_order_id = ?, updated_at = ?
    WHERE id = ?
  `).run(razorpayOrderId, now, orderId);

  const attemptId = `att_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const order = await getOrderById(orderId);
  if (order) {
    db.prepare(`
      INSERT INTO payment_attempts (
        id, order_id, razorpay_order_id, amount_paise, currency, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'INR', 'created', ?, ?)
    `).run(attemptId, orderId, razorpayOrderId, order.total_paise, now, now);
  }

  if (isNeonConfigured()) {
    await attachRazorpayOrderIdToNeon(orderId, razorpayOrderId, order?.total_paise);
  }
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const db = getDb();
  let raw = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;

  if (!raw && isNeonConfigured()) {
    const neonOrder = await fetchOrderFromNeonById(orderId);
    if (neonOrder) {
      cacheNeonOrderToSqlite(neonOrder);
      raw = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    }
  }

  if (!raw) return null;
  const order: Order = { ...raw };
  const rawItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  order.items = rawItems.map((i: any) => ({ ...i }));
  const rawRefunds = db.prepare('SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at DESC').all(orderId);
  order.refunds = rawRefunds.map((r: any) => ({ ...r }));
  return toPlain(order);
}

export async function getOrderByReference(reference: string): Promise<Order | null> {
  const db = getDb();
  let raw = db.prepare('SELECT * FROM orders WHERE order_reference = ?').get(reference) as any;

  if (!raw && isNeonConfigured()) {
    const neonOrder = await fetchOrderFromNeonByReference(reference);
    if (neonOrder) {
      cacheNeonOrderToSqlite(neonOrder);
      raw = db.prepare('SELECT * FROM orders WHERE order_reference = ?').get(reference) as any;
    }
  }

  if (!raw) return null;
  const order: Order = { ...raw };
  const rawItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  order.items = rawItems.map((i: any) => ({ ...i }));
  const rawRefunds = db.prepare('SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at DESC').all(order.id);
  order.refunds = rawRefunds.map((r: any) => ({ ...r }));
  return toPlain(order);
}

export async function getOrderByRazorpayOrderId(rpOrderId: string): Promise<Order | null> {
  const db = getDb();
  let raw = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').get(rpOrderId) as any;

  if (!raw && isNeonConfigured()) {
    const neonOrder = await fetchOrderFromNeonByRazorpayOrderId(rpOrderId);
    if (neonOrder) {
      cacheNeonOrderToSqlite(neonOrder);
      raw = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').get(rpOrderId) as any;
    }
  }

  if (!raw) return null;
  const order: Order = { ...raw };
  const rawItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  order.items = rawItems.map((i: any) => ({ ...i }));
  return toPlain(order);
}

export async function getOrderByRazorpayPaymentId(paymentId: string): Promise<Order | null> {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM orders WHERE razorpay_payment_id = ?').get(paymentId) as any;
  if (!raw) return null;
  const order: Order = { ...raw };
  const rawItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  order.items = rawItems.map((i: any) => ({ ...i }));
  return toPlain(order);
}

export async function getOrdersByCustomerEmail(email: string): Promise<Order[]> {
  const normalizedEmail = email.toLowerCase().trim();
  if (isNeonConfigured()) {
    const neonOrders = await fetchOrdersFromNeonByCustomerId('', normalizedEmail);
    if (neonOrders.length > 0) return toPlain(neonOrders);
  }

  const db = getDb();
  const rawOrders = db.prepare(
    'SELECT * FROM orders WHERE LOWER(customer_email) = ? ORDER BY created_at DESC'
  ).all(normalizedEmail) as any[];
  
  const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  const orders: Order[] = [];
  for (const raw of rawOrders) {
    const o: Order = { ...raw };
    const rawItems = itemStmt.all(o.id);
    o.items = rawItems.map((i: any) => ({ ...i }));
    orders.push(o);
  }
  return toPlain(orders);
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
  const db = getDb();
  const normalizedEmail = data.email.trim().toLowerCase();
  
  const existing = await getCustomerByEmail(normalizedEmail);
  if (existing) {
    throw new Error('An account with this email address already exists. Please log in.');
  }

  const { hash, salt } = hashPassword(data.password);
  const customerId = `cust_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO customers (
      id, email, password_hash, password_salt, name, phone,
      address_line1, address_line2, city, state, postal_code, country,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    customerId,
    normalizedEmail,
    hash,
    salt,
    data.name.trim(),
    data.phone.trim(),
    data.address_line1?.trim() || null,
    data.address_line2?.trim() || null,
    data.city?.trim() || null,
    data.state?.trim() || null,
    data.postal_code?.trim() || null,
    data.country?.trim() || 'India',
    now,
    now
  );

  const customer = (await getCustomerById(customerId))!;
  if (isNeonConfigured()) {
    await persistCustomerToNeon(customer, hash, salt);
  }
  return customer;
}

export async function authenticateCustomer(email: string, password: string): Promise<Customer | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const customer = await getCustomerByEmail(normalizedEmail);
  if (!customer) return null;

  const db = getDb();
  const raw = db.prepare('SELECT password_hash, password_salt FROM customers WHERE email = ?').get(normalizedEmail) as any;
  if (!raw) return null;

  const valid = verifyPassword(password, raw.password_hash, raw.password_salt);
  if (!valid) return null;

  return customer;
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const db = getDb();
  let raw = db.prepare('SELECT id, email, name, phone, address_line1, address_line2, city, state, postal_code, country, is_active, created_at, updated_at FROM customers WHERE id = ?').get(id) as any;

  if (!raw && isNeonConfigured()) {
    const neonCustomer = await fetchCustomerFromNeonById(id);
    if (neonCustomer) {
      cacheNeonCustomerToSqlite(neonCustomer);
      raw = db.prepare('SELECT id, email, name, phone, address_line1, address_line2, city, state, postal_code, country, is_active, created_at, updated_at FROM customers WHERE id = ?').get(id) as any;
    }
  }

  if (!raw) return null;
  return toPlain(raw);
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  let raw = db.prepare('SELECT id, email, name, phone, address_line1, address_line2, city, state, postal_code, country, is_active, created_at, updated_at FROM customers WHERE email = ?').get(normalizedEmail) as any;

  if (!raw && isNeonConfigured()) {
    const neonCustomer = await fetchCustomerFromNeonByEmail(normalizedEmail);
    if (neonCustomer) {
      cacheNeonCustomerToSqlite(neonCustomer);
      raw = db.prepare('SELECT id, email, name, phone, address_line1, address_line2, city, state, postal_code, country, is_active, created_at, updated_at FROM customers WHERE email = ?').get(normalizedEmail) as any;
    }
  }

  if (!raw) return null;
  return toPlain(raw);
}

export async function getCustomerByPhone(phone: string): Promise<Customer | null> {
  const db = getDb();
  const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '');
  if (!cleanPhone) return null;

  let raw = db.prepare('SELECT id, email, name, phone, address_line1, address_line2, city, state, postal_code, country, is_active, created_at, updated_at FROM customers WHERE phone = ? OR phone = ? OR phone LIKE ?').get(cleanPhone, `+91${cleanPhone}`, `%${cleanPhone}%`) as any;

  if (!raw && isNeonConfigured()) {
    const neonCustomer = await fetchCustomerFromNeonByPhone(cleanPhone);
    if (neonCustomer) {
      cacheNeonCustomerToSqlite(neonCustomer);
      raw = db.prepare('SELECT id, email, name, phone, address_line1, address_line2, city, state, postal_code, country, is_active, created_at, updated_at FROM customers WHERE id = ?').get(neonCustomer.id) as any;
    }
  }

  if (!raw) return null;
  return toPlain(raw);
}

export async function findOrCreateCustomerOAuth(params: {
  email: string;
  name: string;
  phone?: string;
}): Promise<Customer> {
  const normalizedEmail = params.email.trim().toLowerCase();
  let customer = await getCustomerByEmail(normalizedEmail);

  if (customer) {
    if (params.phone && (!customer.phone || customer.phone === '9999999999')) {
      await updateCustomerProfile(customer.id, { phone: params.phone });
      customer = await getCustomerById(customer.id);
    }
    return customer!;
  }

  // Create new customer with secure random password for OAuth accounts
  const randomPassword = `OAuth_${crypto.randomBytes(16).toString('hex')}!`;
  const newCustomer = await createCustomer({
    name: params.name || 'Customer',
    email: normalizedEmail,
    phone: params.phone || '9999999999',
    password: randomPassword,
  });

  return newCustomer;
}

export async function findOrCreateCustomerPhone(params: {
  phone: string;
  name?: string;
  email?: string;
}): Promise<Customer> {
  const cleanPhone = params.phone.replace(/^\+91/, '').replace(/\D/g, '');
  let customer = await getCustomerByPhone(cleanPhone);

  if (customer) {
    if (params.name && customer.name.startsWith('Customer')) {
      await updateCustomerProfile(customer.id, { name: params.name });
      customer = await getCustomerById(customer.id);
    }
    return customer!;
  }

  const generatedEmail = params.email ? params.email.trim().toLowerCase() : `customer_${cleanPhone}@phone.retufoods.com`;
  const randomPassword = `Phone_${crypto.randomBytes(16).toString('hex')}!`;
  const newCustomer = await createCustomer({
    name: params.name || `Customer (${cleanPhone.slice(-4)})`,
    email: generatedEmail,
    phone: cleanPhone,
    password: randomPassword,
  });

  return newCustomer;
}

export async function updateCustomerProfile(id: string, data: Partial<Customer>): Promise<Customer | null> {
  const db = getDb();
  const allowed = ['name', 'phone', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country'];
  const fields: string[] = [];
  const values: any[] = [];
  const now = new Date().toISOString();

  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k) && v !== undefined) {
      fields.push(`${k} = ?`);
      values.push(v);
    }
  }

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  if (isNeonConfigured()) {
    await updateCustomerProfileInNeon(id, data);
  }

  return await getCustomerById(id);
}

export async function getOrdersByCustomerId(customerId: string): Promise<Order[]> {
  const customer = await getCustomerById(customerId);
  if (!customer) return [];

  if (isNeonConfigured()) {
    const neonOrders = await fetchOrdersFromNeonByCustomerId(customerId, customer.email);
    if (neonOrders.length > 0) return toPlain(neonOrders);
  }

  const db = getDb();
  const rawOrders = db.prepare(`
    SELECT * FROM orders 
    WHERE customer_id = ? OR LOWER(customer_email) = ?
    ORDER BY created_at DESC
  `).all(customerId, customer.email.toLowerCase().trim()) as any[];

  const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  const refundStmt = db.prepare('SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at DESC');
  const orders: Order[] = [];
  for (const raw of rawOrders) {
    const o: Order = { ...raw };
    const rawItems = itemStmt.all(o.id);
    o.items = rawItems.map((i: any) => ({ ...i }));
    const rawRefunds = refundStmt.all(o.id);
    o.refunds = rawRefunds.map((r: any) => ({ ...r }));
    orders.push(o);
  }
  return toPlain(orders);
}

// --- ORDER MUTATION & FULFILMENT SERVICES ---
export async function markOrderPaid(
  orderId: string,
  razorpayPaymentId: string,
  razorpaySignature?: string
): Promise<Order> {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE orders 
    SET payment_status = 'paid',
        fulfilment_status = 'confirmed',
        razorpay_payment_id = ?,
        razorpay_signature = COALESCE(?, razorpay_signature),
        updated_at = ?
    WHERE id = ?
  `).run(razorpayPaymentId, razorpaySignature || null, now, orderId);

  db.prepare(`
    UPDATE payment_attempts
    SET razorpay_payment_id = ?, status = 'captured', updated_at = ?
    WHERE order_id = ? AND status != 'captured'
  `).run(razorpayPaymentId, now, orderId);

  // Automatically generate tax invoice upon confirmed payment
  await generateInvoiceRecord(orderId);

  if (isNeonConfigured()) {
    await updateOrderPaymentInNeon(orderId, razorpayPaymentId, razorpaySignature);
  }

  const updated = await getOrderById(orderId);
  if (!updated) throw new Error('Order not found after update');
  return updated;
}

export async function markOrderPaymentFailed(
  orderId: string,
  errorCode?: string,
  errorDesc?: string
): Promise<Order | null> {
  const db = getDb();
  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const rawOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!rawOrder) {
      db.exec('ROLLBACK;');
      return null;
    }

    if (rawOrder.payment_status !== 'paid' && (!rawOrder.stock_restored || rawOrder.stock_restored === 0)) {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as any[];
      for (const item of items) {
        db.prepare(`
          UPDATE product_variants
          SET stock_quantity = stock_quantity + ?, updated_at = ?
          WHERE id = ?
        `).run(item.quantity, now, item.variant_id);
      }
    }

    db.prepare(`
      UPDATE orders 
      SET payment_status = 'failed',
          fulfilment_status = 'cancelled',
          stock_restored = 1,
          updated_at = ?
      WHERE id = ? AND payment_status != 'paid'
    `).run(now, orderId);

    db.prepare(`
      UPDATE payment_attempts
      SET status = 'failed', error_code = ?, error_description = ?, updated_at = ?
      WHERE order_id = ?
    `).run(errorCode || null, errorDesc || null, now, orderId);

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  if (isNeonConfigured()) {
    await updateOrderPaymentFailedInNeon(orderId, errorCode, errorDesc);
  }

  return await getOrderById(orderId);
}

export async function updateOrderFulfilment(
  orderId: string,
  status: Order['fulfilment_status'],
  carrier?: string,
  trackingNumber?: string
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE orders 
    SET fulfilment_status = ?,
        tracking_carrier = COALESCE(?, tracking_carrier),
        tracking_number = COALESCE(?, tracking_number),
        updated_at = ?
    WHERE id = ?
  `).run(status, carrier || null, trackingNumber || null, now, orderId);

  if (isNeonConfigured()) {
    await updateOrderFulfilmentInNeon(orderId, status, carrier, trackingNumber);
  }
}

export async function adminCancelOrder(
  orderId: string,
  params: {
    reason?: string;
    restock?: boolean;
    adminEmail?: string;
  }
): Promise<Order> {
  const db = getDb();
  const now = new Date().toISOString();
  const shouldRestock = params.restock !== false;

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const rawOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!rawOrder) throw new Error('Order not found');

    if (shouldRestock && (!rawOrder.stock_restored || rawOrder.stock_restored === 0)) {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as any[];
      for (const item of items) {
        db.prepare(`
          UPDATE product_variants
          SET stock_quantity = stock_quantity + ?, updated_at = ?
          WHERE id = ?
        `).run(item.quantity, now, item.variant_id);
      }
    }

    db.prepare(`
      UPDATE orders
      SET fulfilment_status = 'cancelled',
          cancellation_status = 'approved',
          cancellation_admin_notes = ?,
          stock_restored = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      params.reason || 'Cancelled by store administrator',
      shouldRestock ? 1 : (rawOrder.stock_restored || 0),
      now,
      orderId
    );

    db.prepare(`
      INSERT INTO audit_logs (id, actor_type, actor_id, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, 'admin', ?, 'order_cancelled', 'order', ?, ?, ?)
    `).run(
      `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      params.adminEmail || 'admin',
      orderId,
      JSON.stringify({
        reason: params.reason,
        restocked: shouldRestock,
      }),
      now
    );

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  if (isNeonConfigured()) {
    await updateOrderCancellationInNeon(orderId, 'approved', params.reason, params.adminEmail, shouldRestock);
  }

  const updated = await getOrderById(orderId);
  if (!updated) throw new Error('Order not found after cancellation');
  return updated;
}

export async function requestOrderCancellation(
  orderId: string,
  reason: string
): Promise<Order> {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE orders
    SET cancellation_status = 'requested',
        cancellation_reason = ?,
        cancellation_requested_at = ?,
        updated_at = ?
    WHERE id = ?
  `).run(reason, now, now, orderId);

  if (isNeonConfigured()) {
    await updateOrderCancellationInNeon(orderId, 'requested', reason);
  }

  const updated = await getOrderById(orderId);
  if (!updated) throw new Error('Order not found after cancellation request');
  return updated;
}

export async function rejectOrderCancellation(
  orderId: string,
  adminNotes: string,
  adminEmail: string
): Promise<Order> {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE orders
    SET cancellation_status = 'rejected',
        cancellation_admin_notes = ?,
        updated_at = ?
    WHERE id = ?
  `).run(adminNotes, now, orderId);

  db.prepare(`
    INSERT INTO audit_logs (id, actor_type, actor_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, 'admin', ?, 'cancellation_rejected', 'order', ?, ?, ?)
  `).run(
    `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    adminEmail,
    orderId,
    JSON.stringify({ adminNotes }),
    now
  );

  if (isNeonConfigured()) {
    await updateOrderCancellationInNeon(orderId, 'rejected', null, adminNotes);
  }

  const updated = await getOrderById(orderId);
  if (!updated) throw new Error('Order not found after rejection update');
  return updated;
}

// --- WEBHOOK IDEMPOTENCY ---
export function isWebhookProcessed(eventId: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT id FROM webhook_events WHERE id = ? AND status = 'processed'").get(eventId);
  return !!row;
}

export async function recordWebhookEvent(eventId: string, eventType: string, payload: any): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO webhook_events (id, event_type, payload_json, status, created_at)
    VALUES (?, ?, ?, 'received', ?)
  `).run(eventId, eventType, JSON.stringify(payload), now);

  if (isNeonConfigured()) {
    await recordWebhookEventInNeon(eventId, eventType, payload, 'received');
  }
}

export async function markWebhookProcessed(eventId: string, error?: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE webhook_events 
    SET status = ?, processed_at = ?, error_message = ?
    WHERE id = ?
  `).run(error ? 'error' : 'processed', now, error || null, eventId);

  if (isNeonConfigured()) {
    await markWebhookProcessedInNeon(eventId, error);
  }
}

// --- INVOICE GENERATOR ---
export async function generateInvoiceRecord(orderId: string): Promise<any> {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(orderId);
  if (existing) return existing;

  const order = await getOrderById(orderId);
  if (!order) return null;

  const invoiceId = `inv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  const countStmt = db.prepare('SELECT count(*) as count FROM invoices');
  const count = countStmt.get().count + 1;
  const invoiceNumber = `RETU-INV-2026-${String(count).padStart(4, '0')}`;

  const companyName = process.env.INVOICE_COMPANY_NAME || 'DancingEarth Food Private Limited';
  const companyAddress = '2nd Floor, 235 Binnamangala, 13th Cross Road, Indiranagar, Bengaluru 560038, Karnataka, India';
  const customerAddress = `${order.shipping_address_line1}, ${order.shipping_address_line2 ? order.shipping_address_line2 + ', ' : ''}${order.shipping_city}, ${order.shipping_state} - ${order.shipping_postal_code}`;

  const invoiceRecord = {
    id: invoiceId,
    order_id: orderId,
    invoice_number: invoiceNumber,
    invoice_date: now.slice(0, 10),
    company_name: companyName,
    company_address: companyAddress,
    gstin: process.env.INVOICE_GSTIN || 'UNREGISTERED/CONSUMER',
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_address: customerAddress,
    subtotal_paise: order.subtotal_paise,
    tax_paise: order.tax_paise,
    shipping_paise: order.shipping_paise,
    total_paise: order.total_paise,
    created_at: now
  };

  db.prepare(`
    INSERT INTO invoices (
      id, order_id, invoice_number, invoice_date, company_name, company_address,
      gstin, customer_name, customer_email, customer_address, subtotal_paise,
      tax_paise, shipping_paise, total_paise, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    invoiceRecord.id,
    invoiceRecord.order_id,
    invoiceRecord.invoice_number,
    invoiceRecord.invoice_date,
    invoiceRecord.company_name,
    invoiceRecord.company_address,
    invoiceRecord.gstin,
    invoiceRecord.customer_name,
    invoiceRecord.customer_email,
    invoiceRecord.customer_address,
    invoiceRecord.subtotal_paise,
    invoiceRecord.tax_paise,
    invoiceRecord.shipping_paise,
    invoiceRecord.total_paise,
    invoiceRecord.created_at
  );

  if (isNeonConfigured()) {
    await persistInvoiceToNeon(invoiceRecord);
  }

  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
}

export async function getInvoiceByOrderId(orderId: string): Promise<any> {
  const db = getDb();
  let raw = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(orderId);

  if (!raw && isNeonConfigured()) {
    const neonInv = await fetchInvoiceFromNeonByOrderId(orderId);
    if (neonInv) {
      cacheNeonInvoiceToSqlite(neonInv);
      raw = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(orderId);
    }
  }

  return toPlain(raw);
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
  const db = getDb();
  const order = await getOrderById(params.orderId);
  if (!order) {
    throw new Error(`Order ${params.orderId} not found`);
  }

  const refundId = `ref_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  const shouldRestock = params.restock !== false;
  const restockInt = shouldRestock ? 1 : 0;

  const existingRefunds = db.prepare('SELECT COALESCE(SUM(amount_paise), 0) as total FROM refunds WHERE order_id = ? AND status = ?').get(params.orderId, 'processed');
  const totalRefundedPaise = (existingRefunds?.total || 0) + params.amountPaise;
  const isFullRefund = totalRefundedPaise >= order.total_paise;
  const newPaymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';
  const newFulfilmentStatus = isFullRefund && (order.fulfilment_status === 'pending' || order.fulfilment_status === 'confirmed' || order.fulfilment_status === 'processing')
    ? 'cancelled'
    : order.fulfilment_status;

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare(`
      INSERT INTO refunds (
        id, order_id, razorpay_refund_id, razorpay_payment_id, amount_paise,
        currency, reason, status, restocked, initiated_by, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      refundId,
      params.orderId,
      params.razorpayRefundId || null,
      params.razorpayPaymentId || order.razorpay_payment_id || null,
      params.amountPaise,
      order.currency || 'INR',
      params.reason || 'Requested refund',
      'processed',
      restockInt,
      params.initiatedBy,
      params.notes || null,
      now
    );

    db.prepare(`
      UPDATE orders
      SET payment_status = ?,
          fulfilment_status = ?,
          cancellation_status = CASE WHEN ? = 'cancelled' THEN 'approved' ELSE cancellation_status END,
          stock_restored = CASE WHEN ? = 1 THEN 1 ELSE stock_restored END,
          updated_at = ?
      WHERE id = ?
    `).run(newPaymentStatus, newFulfilmentStatus, newFulfilmentStatus, restockInt, now, params.orderId);

    if (shouldRestock && (!order.stock_restored || order.stock_restored === 0) && order.items && order.items.length > 0) {
      for (const item of order.items) {
        db.prepare(`
          UPDATE product_variants
          SET stock_quantity = stock_quantity + ?, updated_at = ?
          WHERE id = ?
        `).run(item.quantity, now, item.variant_id);
      }
    }

    db.prepare(`
      INSERT INTO audit_logs (id, actor_type, actor_id, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      params.initiatedBy,
      params.initiatedBy,
      'order_refunded',
      'order',
      params.orderId,
      JSON.stringify({
        refund_id: refundId,
        razorpay_refund_id: params.razorpayRefundId,
        amount_paise: params.amountPaise,
        restocked: shouldRestock,
        reason: params.reason,
      }),
      now
    );

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  const record = db.prepare('SELECT * FROM refunds WHERE id = ?').get(refundId);
  const refund = toPlain(record) as Refund;

  if (isNeonConfigured()) {
    await persistRefundToNeon(refund);
  }

  return refund;
}

export async function getRefundsByOrderId(orderId: string): Promise<Refund[]> {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at DESC').all(orderId);
  return toPlain(raw) as Refund[];
}

export async function getRefundByRazorpayRefundId(razorpayRefundId: string): Promise<Refund | null> {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM refunds WHERE razorpay_refund_id = ?').get(razorpayRefundId);
  return toPlain(raw) as Refund | null;
}

// --- ADMIN DASHBOARD QUERIES ---
export async function getAdminStats(): Promise<any> {
  if (isNeonConfigured()) {
    const neonStats = await fetchAdminStatsFromNeon();
    if (neonStats) return neonStats;
  }

  const db = getDb();
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const grossSalesPaise = db.prepare("SELECT COALESCE(SUM(total_paise), 0) as total FROM orders WHERE payment_status = 'paid'").get().total;
  const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE payment_status = 'pending'").get().count;
  const failedOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE payment_status = 'failed'").get().count;
  const awaitingFulfilment = db.prepare("SELECT COUNT(*) as count FROM orders WHERE payment_status = 'paid' AND fulfilment_status IN ('confirmed', 'processing')").get().count;
  const cancellationRequestsCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE cancellation_status = 'requested'").get().count;

  const lowStockVariants = db.prepare(`
    SELECT v.id, v.name as variant_name, v.stock_quantity, v.sku, p.name as product_name
    FROM product_variants v
    JOIN products p ON v.product_id = p.id
    WHERE v.stock_quantity <= 15
    ORDER BY v.stock_quantity ASC
  `).all();

  const recentOrders = db.prepare(`
    SELECT * FROM orders ORDER BY created_at DESC LIMIT 10
  `).all();

  return toPlain({
    totalOrders,
    grossSalesPaise,
    pendingOrders,
    failedOrders,
    awaitingFulfilment,
    cancellationRequestsCount,
    lowStockVariants,
    recentOrders,
  });
}

export async function getAllOrdersAdmin(status?: string, search?: string): Promise<Order[]> {
  if (isNeonConfigured() && (!status || status === 'all') && (!search || !search.trim())) {
    const neonOrders = await fetchAllOrdersFromNeon();
    if (neonOrders.length > 0) return toPlain(neonOrders);
  }

  const db = getDb();
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params: any[] = [];

  if (status && status !== 'all') {
    if (status === 'cancellation_requested') {
      query += " AND cancellation_status = 'requested'";
    } else {
      query += ' AND (payment_status = ? OR fulfilment_status = ?)';
      params.push(status, status);
    }
  }

  if (search && search.trim()) {
    query += ' AND (order_reference LIKE ? OR customer_email LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR razorpay_payment_id LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term, term);
  }

  query += ' ORDER BY created_at DESC';
  const rawOrders = db.prepare(query).all(...params) as any[];
  const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  const refundStmt = db.prepare('SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at DESC');
  const orders: Order[] = [];
  for (const raw of rawOrders) {
    const o: Order = { ...raw };
    const rawItems = itemStmt.all(o.id);
    o.items = rawItems.map((i: any) => ({ ...i }));
    const rawRefunds = refundStmt.all(o.id);
    o.refunds = rawRefunds.map((r: any) => ({ ...r }));
    orders.push(o);
  }
  return toPlain(orders);
}
