import { getDb, hashPassword, verifyPassword } from './index.ts';
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

// Helper to convert node:sqlite [Object: null prototype] to plain objects for Next.js Server Components
export function toPlain<T>(obj: T): T {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
}

// --- PRODUCT SERVICE ---
export function getAllProducts(includeInactive = false): Product[] {
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

export function getProductBySlug(slug: string): Product | null {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM products WHERE slug = ?').get(slug) as any;
  if (!raw) return null;
  const prod: Product = { ...raw };
  const rawVariants = db.prepare('SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY pack_size ASC').all(prod.id);
  prod.variants = rawVariants.map((v: any) => ({ ...v }));
  return toPlain(prod);
}

export function getProductById(id: string): Product | null {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!raw) return null;
  const prod: Product = { ...raw };
  const rawVariants = db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY pack_size ASC').all(prod.id);
  prod.variants = rawVariants.map((v: any) => ({ ...v }));
  return toPlain(prod);
}

export function updateProduct(id: string, data: Partial<Product>): void {
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
}

export function getVariantById(id: string): ProductVariant | null {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(id) as any;
  if (!raw) return null;
  return toPlain({ ...raw });
}

export function updateVariant(id: string, data: Partial<ProductVariant>): void {
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
}

// --- SERVER-SIDE CART & PRICING VALIDATOR ---
// Never trust client prices! Server retrieves active prices from database.
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

  // In India, consumer food prices are MRP-inclusive of GST.
  // We record tax as 0 additional extra (included in MRP)
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

export function createOrderWithReservation(input: CreateOrderInput): { order: Order; razorpayAmountPaise: number } {
  const db = getDb();
  const validation = validateCartItems(input.items);

  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  const now = new Date().toISOString();
  const orderId = `ord_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const orderRef = generateOrderReference();

  // Atomically decrement stock and persist order
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    // 1. Decrement stock
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

    // 2. Insert Order
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

    // 3. Insert Order Items (Immutable Snapshots)
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

  const order = getOrderById(orderId);
  if (!order) throw new Error('Order creation failed to retrieve saved record');

  return { order, razorpayAmountPaise: validation.total_paise };
}

export function attachRazorpayOrderId(orderId: string, razorpayOrderId: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE orders 
    SET razorpay_order_id = ?, updated_at = ?
    WHERE id = ?
  `).run(razorpayOrderId, now, orderId);

  // Record initial payment attempt
  const attemptId = `att_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const order = getOrderById(orderId);
  if (order) {
    db.prepare(`
      INSERT INTO payment_attempts (
        id, order_id, razorpay_order_id, amount_paise, currency, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'INR', 'created', ?, ?)
    `).run(attemptId, orderId, razorpayOrderId, order.total_paise, now, now);
  }
}

export function getOrderById(orderId: string): Order | null {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!raw) return null;
  const order: Order = { ...raw };
  const rawItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  order.items = rawItems.map((i: any) => ({ ...i }));
  const rawRefunds = db.prepare('SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at DESC').all(orderId);
  order.refunds = rawRefunds.map((r: any) => ({ ...r }));
  return toPlain(order);
}

export function getOrderByReference(reference: string): Order | null {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM orders WHERE order_reference = ?').get(reference) as any;
  if (!raw) return null;
  const order: Order = { ...raw };
  const rawItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  order.items = rawItems.map((i: any) => ({ ...i }));
  const rawRefunds = db.prepare('SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at DESC').all(order.id);
  order.refunds = rawRefunds.map((r: any) => ({ ...r }));
  return toPlain(order);
}

export function getOrderByRazorpayOrderId(rpOrderId: string): Order | null {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').get(rpOrderId) as any;
  if (!raw) return null;
  const order: Order = { ...raw };
  const rawItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  order.items = rawItems.map((i: any) => ({ ...i }));
  return toPlain(order);
}

export function getOrderByRazorpayPaymentId(paymentId: string): Order | null {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM orders WHERE razorpay_payment_id = ?').get(paymentId) as any;
  if (!raw) return null;
  const order: Order = { ...raw };
  const rawItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  order.items = rawItems.map((i: any) => ({ ...i }));
  return toPlain(order);
}

export function getOrdersByCustomerEmail(email: string): Order[] {
  const db = getDb();
  const rawOrders = db.prepare(
    'SELECT * FROM orders WHERE LOWER(customer_email) = ? ORDER BY created_at DESC'
  ).all(email.toLowerCase().trim()) as any[];
  
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
export function createCustomer(data: {
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
}): Customer {
  const db = getDb();
  const normalizedEmail = data.email.trim().toLowerCase();
  
  // Check if customer already exists
  const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(normalizedEmail);
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

  return getCustomerById(customerId)!;
}

export function authenticateCustomer(email: string, password: string): Customer | null {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const raw = db.prepare('SELECT * FROM customers WHERE email = ? AND is_active = 1').get(normalizedEmail) as any;
  if (!raw) return null;

  const valid = verifyPassword(password, raw.password_hash, raw.password_salt);
  if (!valid) return null;

  return getCustomerById(raw.id);
}

export function getCustomerById(id: string): Customer | null {
  const db = getDb();
  const raw = db.prepare('SELECT id, email, name, phone, address_line1, address_line2, city, state, postal_code, country, is_active, created_at, updated_at FROM customers WHERE id = ?').get(id) as any;
  if (!raw) return null;
  return toPlain(raw);
}

export function getCustomerByEmail(email: string): Customer | null {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const raw = db.prepare('SELECT id, email, name, phone, address_line1, address_line2, city, state, postal_code, country, is_active, created_at, updated_at FROM customers WHERE email = ?').get(normalizedEmail) as any;
  if (!raw) return null;
  return toPlain(raw);
}

export function updateCustomerProfile(id: string, data: Partial<Customer>): Customer | null {
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

  if (fields.length === 0) return getCustomerById(id);

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getCustomerById(id);
}

export function getOrdersByCustomerId(customerId: string): Order[] {
  const db = getDb();
  const customer = getCustomerById(customerId);
  if (!customer) return [];

  // Match by customer_id OR customer_email for full fidelity
  const rawOrders = db.prepare(`
    SELECT * FROM orders 
    WHERE customer_id = ? OR LOWER(customer_email) = ?
    ORDER BY created_at DESC
  `).all(customerId, customer.email.toLowerCase()) as any[];

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

// Payment reconciliation & updates
export function markOrderPaid(
  orderId: string,
  razorpayPaymentId: string,
  razorpaySignature?: string
): Order {
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

  // Update or insert payment attempt record
  db.prepare(`
    UPDATE payment_attempts
    SET razorpay_payment_id = ?, status = 'captured', updated_at = ?
    WHERE order_id = ? AND status != 'captured'
  `).run(razorpayPaymentId, now, orderId);

  // Automatically generate tax invoice upon confirmed payment
  generateInvoiceRecord(orderId);

  const updated = getOrderById(orderId);
  if (!updated) throw new Error('Order not found after update');
  return updated;
}

export function markOrderPaymentFailed(
  orderId: string,
  errorCode?: string,
  errorDesc?: string
): Order | null {
  const db = getDb();
  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const rawOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!rawOrder) {
      db.exec('ROLLBACK;');
      return null;
    }

    // Restore stock if not already restored and payment is not paid
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

  return getOrderById(orderId);
}

export function updateOrderFulfilment(
  orderId: string,
  status: Order['fulfilment_status'],
  carrier?: string,
  trackingNumber?: string
): void {
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
}

// Admin directly sets order to cancelled with optional inventory restocking
export function adminCancelOrder(
  orderId: string,
  params: {
    reason?: string;
    restock?: boolean;
    adminEmail?: string;
  }
): Order {
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

    // Audit log
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

  const updated = getOrderById(orderId);
  if (!updated) throw new Error('Order not found after cancellation');
  return updated;
}

// Customer initiates a cancellation request (Intimation before admin review)
export function requestOrderCancellation(
  orderId: string,
  reason: string
): Order {
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

  const updated = getOrderById(orderId);
  if (!updated) throw new Error('Order not found after cancellation request');
  return updated;
}

// Admin rejects a customer's cancellation request
export function rejectOrderCancellation(
  orderId: string,
  adminNotes: string,
  adminEmail: string
): Order {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE orders
    SET cancellation_status = 'rejected',
        cancellation_admin_notes = ?,
        updated_at = ?
    WHERE id = ?
  `).run(adminNotes, now, orderId);

  // Audit log
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

  const updated = getOrderById(orderId);
  if (!updated) throw new Error('Order not found after rejection update');
  return updated;
}

// --- WEBHOOK IDEMPOTENCY ---
export function isWebhookProcessed(eventId: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT id FROM webhook_events WHERE id = ? AND status = 'processed'").get(eventId);
  return !!row;
}

export function recordWebhookEvent(eventId: string, eventType: string, payload: any): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO webhook_events (id, event_type, payload_json, status, created_at)
    VALUES (?, ?, ?, 'received', ?)
  `).run(eventId, eventType, JSON.stringify(payload), now);
}

export function markWebhookProcessed(eventId: string, error?: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE webhook_events 
    SET status = ?, processed_at = ?, error_message = ?
    WHERE id = ?
  `).run(error ? 'error' : 'processed', now, error || null, eventId);
}

// --- INVOICE GENERATOR ---
export function generateInvoiceRecord(orderId: string): any {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(orderId);
  if (existing) return existing;

  const order = getOrderById(orderId);
  if (!order) return null;

  const invoiceId = `inv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  const countStmt = db.prepare('SELECT count(*) as count FROM invoices');
  const count = countStmt.get().count + 1;
  const invoiceNumber = `RETU-INV-2026-${String(count).padStart(4, '0')}`;

  const companyName = process.env.INVOICE_COMPANY_NAME || 'DancingEarth Food Private Limited';
  const companyAddress = '2nd Floor, 235 Binnamangala, 13th Cross Road, Indiranagar, Bengaluru 560038, Karnataka, India';
  const customerAddress = `${order.shipping_address_line1}, ${order.shipping_address_line2 ? order.shipping_address_line2 + ', ' : ''}${order.shipping_city}, ${order.shipping_state} - ${order.shipping_postal_code}`;

  db.prepare(`
    INSERT INTO invoices (
      id, order_id, invoice_number, invoice_date, company_name, company_address,
      gstin, customer_name, customer_email, customer_address, subtotal_paise,
      tax_paise, shipping_paise, total_paise, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    invoiceId,
    orderId,
    invoiceNumber,
    now.slice(0, 10),
    companyName,
    companyAddress,
    process.env.INVOICE_GSTIN || 'UNREGISTERED/CONSUMER',
    order.customer_name,
    order.customer_email,
    customerAddress,
    order.subtotal_paise,
    order.tax_paise,
    order.shipping_paise,
    order.total_paise,
    now
  );

  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
}

export function getInvoiceByOrderId(orderId: string): any {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(orderId);
  return toPlain(raw);
}

// --- REFUND AND CANCELLATION METHODS ---
export function createOrderRefund(params: {
  orderId: string;
  razorpayRefundId?: string | null;
  razorpayPaymentId?: string | null;
  amountPaise: number;
  reason?: string;
  initiatedBy: 'customer' | 'admin' | 'webhook';
  restock?: boolean;
  notes?: string;
}): Refund {
  const db = getDb();
  const order = getOrderById(params.orderId);
  if (!order) {
    throw new Error(`Order ${params.orderId} not found`);
  }

  const refundId = `ref_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  const shouldRestock = params.restock !== false;
  const restockInt = shouldRestock ? 1 : 0;

  // Calculate new payment status based on cumulative refunds
  const existingRefunds = db.prepare('SELECT COALESCE(SUM(amount_paise), 0) as total FROM refunds WHERE order_id = ? AND status = ?').get(params.orderId, 'processed');
  const totalRefundedPaise = (existingRefunds?.total || 0) + params.amountPaise;
  const isFullRefund = totalRefundedPaise >= order.total_paise;
  const newPaymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';
  const newFulfilmentStatus = isFullRefund && (order.fulfilment_status === 'pending' || order.fulfilment_status === 'confirmed' || order.fulfilment_status === 'processing')
    ? 'cancelled'
    : order.fulfilment_status;

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    // 1. Insert refund record
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

    // 2. Update order status
    db.prepare(`
      UPDATE orders
      SET payment_status = ?,
          fulfilment_status = ?,
          cancellation_status = CASE WHEN ? = 'cancelled' THEN 'approved' ELSE cancellation_status END,
          stock_restored = CASE WHEN ? = 1 THEN 1 ELSE stock_restored END,
          updated_at = ?
      WHERE id = ?
    `).run(newPaymentStatus, newFulfilmentStatus, newFulfilmentStatus, restockInt, now, params.orderId);

    // 3. Atomically restore variant inventory if requested
    if (shouldRestock && (!order.stock_restored || order.stock_restored === 0) && order.items && order.items.length > 0) {
      for (const item of order.items) {
        db.prepare(`
          UPDATE product_variants
          SET stock_quantity = stock_quantity + ?, updated_at = ?
          WHERE id = ?
        `).run(item.quantity, now, item.variant_id);
      }
    }

    // 4. Record audit log
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
  return toPlain(record) as Refund;
}

export function getRefundsByOrderId(orderId: string): Refund[] {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at DESC').all(orderId);
  return toPlain(raw) as Refund[];
}

export function getRefundByRazorpayRefundId(razorpayRefundId: string): Refund | null {
  const db = getDb();
  const raw = db.prepare('SELECT * FROM refunds WHERE razorpay_refund_id = ?').get(razorpayRefundId);
  return toPlain(raw) as Refund | null;
}

// --- ADMIN DASHBOARD QUERIES ---
export function getAdminStats() {
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

export function getAllOrdersAdmin(status?: string, search?: string): Order[] {
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
