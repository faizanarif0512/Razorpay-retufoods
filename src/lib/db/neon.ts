import pg from 'pg';

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;
let isSyncing = false;
let hasSyncedInitially = false;

export function isNeonConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'));
}

export function getPostgresPool(): pg.Pool | null {
  if (poolInstance) {
    return poolInstance;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || !connectionString.startsWith('postgres')) {
    return null;
  }

  poolInstance = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  poolInstance.on('error', (err) => {
    console.error('[NEON POOL ERROR]:', err.message);
  });

  return poolInstance;
}

export async function queryPostgres<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T> | null> {
  const pool = getPostgresPool();
  if (!pool) return null;
  return pool.query<T>(text, params);
}

// ---------------------------------------------------------------------------
// DIRECT READ QUERIES FROM NEON (Used as live fallback in serverless Lambdas)
// ---------------------------------------------------------------------------

export async function fetchOrderFromNeonById(orderId: string): Promise<any | null> {
  if (!isNeonConfigured()) return null;
  try {
    const pool = getPostgresPool();
    if (!pool) return null;

    const ordRes = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (ordRes.rows.length === 0) return null;

    const order = ordRes.rows[0];
    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC', [orderId]);
    order.items = itemsRes.rows;

    const refundsRes = await pool.query('SELECT * FROM refunds WHERE order_id = $1 ORDER BY created_at DESC', [orderId]);
    order.refunds = refundsRes.rows;

    return order;
  } catch (err: any) {
    console.error('[NEON FETCH ORDER BY ID ERROR]:', err.message);
    return null;
  }
}

export async function fetchOrderFromNeonByReference(ref: string): Promise<any | null> {
  if (!isNeonConfigured()) return null;
  try {
    const pool = getPostgresPool();
    if (!pool) return null;

    const ordRes = await pool.query('SELECT * FROM orders WHERE order_reference = $1', [ref]);
    if (ordRes.rows.length === 0) return null;

    const order = ordRes.rows[0];
    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC', [order.id]);
    order.items = itemsRes.rows;

    const refundsRes = await pool.query('SELECT * FROM refunds WHERE order_id = $1 ORDER BY created_at DESC', [order.id]);
    order.refunds = refundsRes.rows;

    return order;
  } catch (err: any) {
    console.error('[NEON FETCH ORDER BY REF ERROR]:', err.message);
    return null;
  }
}

export async function fetchOrderFromNeonByRazorpayOrderId(rpOrderId: string): Promise<any | null> {
  if (!isNeonConfigured()) return null;
  try {
    const pool = getPostgresPool();
    if (!pool) return null;

    const ordRes = await pool.query('SELECT * FROM orders WHERE razorpay_order_id = $1', [rpOrderId]);
    if (ordRes.rows.length === 0) return null;

    const order = ordRes.rows[0];
    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC', [order.id]);
    order.items = itemsRes.rows;

    return order;
  } catch (err: any) {
    console.error('[NEON FETCH ORDER BY RP ORDER ERROR]:', err.message);
    return null;
  }
}

export async function fetchOrdersFromNeonByCustomerId(customerId: string, email?: string): Promise<any[]> {
  if (!isNeonConfigured()) return [];
  try {
    const pool = getPostgresPool();
    if (!pool) return [];

    let ordRes;
    if (email) {
      ordRes = await pool.query(
        'SELECT * FROM orders WHERE customer_id = $1 OR LOWER(customer_email) = LOWER($2) ORDER BY created_at DESC',
        [customerId, email.trim()]
      );
    } else {
      ordRes = await pool.query(
        'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
        [customerId]
      );
    }

    const orders = ordRes.rows;
    for (const ord of orders) {
      const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [ord.id]);
      ord.items = itemsRes.rows;
    }
    return orders;
  } catch (err: any) {
    console.error('[NEON FETCH ORDERS BY CUSTOMER ERROR]:', err.message);
    return [];
  }
}

export async function fetchCustomerFromNeonByEmail(email: string): Promise<any | null> {
  if (!isNeonConfigured()) return null;
  try {
    const pool = getPostgresPool();
    if (!pool) return null;

    const res = await pool.query('SELECT * FROM customers WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (res.rows.length === 0) return null;
    return res.rows[0];
  } catch (err: any) {
    console.error('[NEON FETCH CUSTOMER BY EMAIL ERROR]:', err.message);
    return null;
  }
}

export async function fetchCustomerFromNeonById(id: string): Promise<any | null> {
  if (!isNeonConfigured()) return null;
  try {
    const pool = getPostgresPool();
    if (!pool) return null;

    const res = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return res.rows[0];
  } catch (err: any) {
    console.error('[NEON FETCH CUSTOMER BY ID ERROR]:', err.message);
    return null;
  }
}

export async function fetchCustomerFromNeonByPhone(phone: string): Promise<any | null> {
  if (!isNeonConfigured()) return null;
  try {
    const pool = getPostgresPool();
    if (!pool) return null;

    const clean = phone.replace(/^\+91/, '').replace(/\D/g, '');
    const res = await pool.query(
      'SELECT * FROM customers WHERE phone = $1 OR phone = $2 OR phone LIKE $3 ORDER BY created_at DESC LIMIT 1',
      [clean, `+91${clean}`, `%${clean}%`]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  } catch (err: any) {
    console.error('[NEON FETCH CUSTOMER BY PHONE ERROR]:', err.message);
    return null;
  }
}

export async function fetchInvoiceFromNeonByOrderId(orderId: string): Promise<any | null> {
  if (!isNeonConfigured()) return null;
  try {
    const pool = getPostgresPool();
    if (!pool) return null;

    const res = await pool.query('SELECT * FROM invoices WHERE order_id = $1', [orderId]);
    if (res.rows.length === 0) return null;
    return res.rows[0];
  } catch (err: any) {
    console.error('[NEON FETCH INVOICE ERROR]:', err.message);
    return null;
  }
}

export async function fetchAllOrdersFromNeon(): Promise<any[]> {
  if (!isNeonConfigured()) return [];
  try {
    const pool = getPostgresPool();
    if (!pool) return [];

    const res = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    const orders = res.rows;
    for (const ord of orders) {
      const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [ord.id]);
      ord.items = itemsRes.rows;
      const refRes = await pool.query('SELECT * FROM refunds WHERE order_id = $1', [ord.id]);
      ord.refunds = refRes.rows;
    }
    return orders;
  } catch (err: any) {
    console.error('[NEON FETCH ALL ORDERS ERROR]:', err.message);
    return [];
  }
}

export async function fetchAdminStatsFromNeon(): Promise<any | null> {
  if (!isNeonConfigured()) return null;
  try {
    const pool = getPostgresPool();
    if (!pool) return null;

    const totalOrdersRes = await pool.query('SELECT count(*) as count FROM orders');
    const paidOrdersRes = await pool.query("SELECT count(*) as count FROM orders WHERE payment_status = 'paid'");
    const revenueRes = await pool.query("SELECT coalesce(sum(total_paise), 0) as rev FROM orders WHERE payment_status = 'paid'");
    const totalCustomersRes = await pool.query('SELECT count(*) as count FROM customers');
    const pendingCancellationsRes = await pool.query("SELECT count(*) as count FROM orders WHERE cancellation_status = 'requested'");
    const lowStockRes = await pool.query('SELECT count(*) as count FROM product_variants WHERE stock_quantity <= 10 AND is_active = true');

    return {
      total_orders: parseInt(totalOrdersRes.rows[0].count, 10),
      paid_orders: parseInt(paidOrdersRes.rows[0].count, 10),
      total_revenue_paise: parseInt(revenueRes.rows[0].rev, 10),
      total_customers: parseInt(totalCustomersRes.rows[0].count, 10),
      pending_cancellations: parseInt(pendingCancellationsRes.rows[0].count, 10),
      low_stock_variants: parseInt(lowStockRes.rows[0].count, 10),
    };
  } catch (err: any) {
    console.error('[NEON FETCH ADMIN STATS ERROR]:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// PERSISTENCE MUTATIONS TO NEON (Awaited on every write in production)
// ---------------------------------------------------------------------------

export async function persistOrderToNeon(order: any, items: any[]): Promise<void> {
  if (!isNeonConfigured()) return;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    await pool.query(`
      INSERT INTO orders (
        id, order_reference, customer_id, customer_name, customer_email, customer_phone,
        shipping_address_line1, shipping_address_line2, shipping_city, shipping_state,
        shipping_postal_code, shipping_country, subtotal_paise, discount_paise, tax_paise,
        shipping_paise, total_paise, currency, payment_status, fulfilment_status,
        razorpay_order_id, razorpay_payment_id, razorpay_signature, notes,
        tracking_carrier, tracking_number, cancellation_status, cancellation_reason,
        cancellation_requested_at, cancellation_admin_notes, stock_restored,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
      )
      ON CONFLICT (id) DO UPDATE SET
        payment_status = excluded.payment_status,
        fulfilment_status = excluded.fulfilment_status,
        razorpay_order_id = COALESCE(excluded.razorpay_order_id, orders.razorpay_order_id),
        razorpay_payment_id = COALESCE(excluded.razorpay_payment_id, orders.razorpay_payment_id),
        razorpay_signature = COALESCE(excluded.razorpay_signature, orders.razorpay_signature),
        cancellation_status = COALESCE(excluded.cancellation_status, orders.cancellation_status),
        updated_at = excluded.updated_at
    `, [
      order.id, order.order_reference, order.customer_id || null, order.customer_name,
      order.customer_email, order.customer_phone, order.shipping_address_line1,
      order.shipping_address_line2 || null, order.shipping_city, order.shipping_state,
      order.shipping_postal_code, order.shipping_country || 'India', order.subtotal_paise,
      order.discount_paise || 0, order.tax_paise || 0, order.shipping_paise || 0,
      order.total_paise, order.currency || 'INR', order.payment_status || 'pending',
      order.fulfilment_status || 'pending', order.razorpay_order_id || null,
      order.razorpay_payment_id || null, order.razorpay_signature || null, order.notes || null,
      order.tracking_carrier || null, order.tracking_number || null,
      order.cancellation_status || null, order.cancellation_reason || null,
      order.cancellation_requested_at ? new Date(order.cancellation_requested_at).toISOString() : null,
      order.cancellation_admin_notes || null, Boolean(order.stock_restored),
      order.created_at || new Date().toISOString(), order.updated_at || new Date().toISOString()
    ]);

    for (const item of items) {
      await pool.query(`
        INSERT INTO order_items (
          id, order_id, product_id, variant_id, product_name, variant_name, sku,
          quantity, unit_price_paise, total_price_paise, image_url, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING
      `, [
        item.id, item.order_id, item.product_id, item.variant_id, item.product_name,
        item.variant_name, item.sku, item.quantity, item.unit_price_paise,
        item.total_price_paise, item.image_url || null, item.created_at || new Date().toISOString()
      ]);
    }
  } catch (err: any) {
    console.error('[NEON PERSIST ORDER ERROR]:', err.message);
  }
}

export async function attachRazorpayOrderIdToNeon(
  orderId: string,
  razorpayOrderId: string,
  amountPaise?: number
): Promise<void> {
  if (!isNeonConfigured()) return;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    await pool.query(`
      UPDATE orders
      SET razorpay_order_id = $1, updated_at = $2
      WHERE id = $3
    `, [razorpayOrderId, new Date().toISOString(), orderId]);

    // Record initial payment attempt
    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await pool.query(`
      INSERT INTO payment_attempts (
        id, order_id, razorpay_order_id, amount_paise, currency, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'INR', 'created', $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [attemptId, orderId, razorpayOrderId, amountPaise || 0, new Date().toISOString(), new Date().toISOString()]);
  } catch (err: any) {
    console.error('[NEON ATTACH RAZORPAY ORDER ID ERROR]:', err.message);
  }
}

export async function persistCustomerToNeon(c: any, passwordHash?: string, passwordSalt?: string): Promise<void> {
  if (!isNeonConfigured()) return;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    await pool.query(`
      INSERT INTO customers (
        id, email, password_hash, password_salt, name, phone,
        address_line1, address_line2, city, state, postal_code, country,
        is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        address_line1 = excluded.address_line1,
        address_line2 = excluded.address_line2,
        city = excluded.city,
        state = excluded.state,
        postal_code = excluded.postal_code,
        country = excluded.country,
        updated_at = excluded.updated_at
    `, [
      c.id, c.email.trim().toLowerCase(), passwordHash || c.password_hash || '', passwordSalt || c.password_salt || '',
      c.name.trim(), c.phone.trim(), c.address_line1 || null, c.address_line2 || null,
      c.city || null, c.state || null, c.postal_code || null, c.country || 'India',
      Boolean(c.is_active ?? true), c.created_at || new Date().toISOString(),
      c.updated_at || new Date().toISOString()
    ]);
  } catch (err: any) {
    console.error('[NEON PERSIST CUSTOMER ERROR]:', err.message);
  }
}

export async function updateCustomerProfileInNeon(customerId: string, data: any): Promise<void> {
  if (!isNeonConfigured()) return;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && key !== 'id') {
        fields.push(`"${key}" = $${idx++}`);
        values.push(val);
      }
    }

    if (fields.length === 0) return;
    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(customerId);

    await pool.query(`UPDATE customers SET ${fields.join(', ')} WHERE id = $${idx}`, values);
  } catch (err: any) {
    console.error('[NEON UPDATE CUSTOMER PROFILE ERROR]:', err.message);
  }
}

export async function updateOrderPaymentInNeon(
  orderId: string,
  razorpayPaymentId: string,
  razorpaySignature?: string
): Promise<void> {
  if (!isNeonConfigured()) return;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    const now = new Date().toISOString();
    await pool.query(`
      UPDATE orders
      SET payment_status = 'paid',
          fulfilment_status = 'confirmed',
          razorpay_payment_id = $1,
          razorpay_signature = COALESCE($2, razorpay_signature),
          updated_at = $3
      WHERE id = $4
    `, [razorpayPaymentId, razorpaySignature || null, now, orderId]);

    // Update payment attempts
    await pool.query(`
      UPDATE payment_attempts
      SET razorpay_payment_id = $1, status = 'captured', updated_at = $2
      WHERE order_id = $3 AND status != 'captured'
    `, [razorpayPaymentId, now, orderId]);
  } catch (err: any) {
    console.error('[NEON UPDATE PAYMENT ERROR]:', err.message);
  }
}

export async function updateOrderPaymentFailedInNeon(
  orderId: string,
  errorCode?: string,
  errorDesc?: string
): Promise<void> {
  if (!isNeonConfigured()) return;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    const now = new Date().toISOString();
    await pool.query(`
      UPDATE orders
      SET payment_status = 'failed',
          fulfilment_status = 'cancelled',
          stock_restored = true,
          updated_at = $1
      WHERE id = $2 AND payment_status != 'paid'
    `, [now, orderId]);

    await pool.query(`
      UPDATE payment_attempts
      SET status = 'failed', error_code = $1, error_description = $2, updated_at = $3
      WHERE order_id = $4
    `, [errorCode || null, errorDesc || null, now, orderId]);
  } catch (err: any) {
    console.error('[NEON UPDATE PAYMENT FAILED ERROR]:', err.message);
  }
}

export async function persistInvoiceToNeon(inv: any): Promise<void> {
  if (!isNeonConfigured()) return;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    await pool.query(`
      INSERT INTO invoices (
        id, order_id, invoice_number, invoice_date, company_name, company_address,
        gstin, customer_name, customer_email, customer_address, subtotal_paise,
        tax_paise, shipping_paise, total_paise, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        invoice_number = excluded.invoice_number,
        pdf_path = excluded.pdf_path
    `, [
      inv.id, inv.order_id, inv.invoice_number, inv.invoice_date || new Date().toISOString().slice(0, 10),
      inv.company_name, inv.company_address, inv.gstin || null, inv.customer_name,
      inv.customer_email, inv.customer_address, inv.subtotal_paise, inv.tax_paise,
      inv.shipping_paise, inv.total_paise, inv.created_at || new Date().toISOString()
    ]);
  } catch (err: any) {
    console.error('[NEON PERSIST INVOICE ERROR]:', err.message);
  }
}

export async function updateProductInNeon(id: string, data: any): Promise<void> {
  if (!isNeonConfigured()) return;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && key !== 'id' && key !== 'variants' && key !== 'created_at') {
        fields.push(`"${key}" = $${idx++}`);
        values.push(val);
      }
    }

    if (fields.length === 0) return;
    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(id);

    await pool.query(`UPDATE products SET ${fields.join(', ')} WHERE id = $${idx}`, values);
  } catch (err: any) {
    console.error('[NEON UPDATE PRODUCT ERROR]:', err.message);
  }
}

export async function updateVariantInNeon(id: string, data: any): Promise<void> {
  if (!isNeonConfigured()) return;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && key !== 'id' && key !== 'product_id' && key !== 'created_at') {
        fields.push(`"${key}" = $${idx++}`);
        values.push(val);
      }
    }

    if (fields.length === 0) return;
    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(id);

    await pool.query(`UPDATE product_variants SET ${fields.join(', ')} WHERE id = $${idx}`, values);
  } catch (err: any) {
    console.error('[NEON UPDATE VARIANT ERROR]:', err.message);
  }
}

export async function updateOrderFulfilmentInNeon(
  orderId: string,
  status: string,
  carrier?: string | null,
  trackingNumber?: string | null
): Promise<void> {
  if (!isNeonConfigured()) return;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    await pool.query(`
      UPDATE orders
      SET fulfilment_status = $1,
          tracking_carrier = COALESCE($2, tracking_carrier),
          tracking_number = COALESCE($3, tracking_number),
          updated_at = $4
      WHERE id = $5
    `, [status, carrier || null, trackingNumber || null, new Date().toISOString(), orderId]);
  } catch (err: any) {
    console.error('[NEON UPDATE FULFILMENT ERROR]:', err.message);
  }
}

export async function updateOrderCancellationInNeon(
  orderId: string,
  cancellationStatus: string,
  reason?: string | null,
  notes?: string | null,
  stockRestored?: boolean
): Promise<void> {
  if (!isNeonConfigured()) return;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    await pool.query(`
      UPDATE orders
      SET cancellation_status = $1,
          cancellation_reason = COALESCE($2, cancellation_reason),
          cancellation_admin_notes = COALESCE($3, cancellation_admin_notes),
          stock_restored = COALESCE($4, stock_restored),
          updated_at = $5
      WHERE id = $6
    `, [cancellationStatus, reason || null, notes || null, stockRestored !== undefined ? Boolean(stockRestored) : null, new Date().toISOString(), orderId]);
  } catch (err: any) {
    console.error('[NEON UPDATE CANCELLATION ERROR]:', err.message);
  }
}

export async function persistRefundToNeon(refund: any): Promise<void> {
  if (!isNeonConfigured()) return;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    await pool.query(`
      INSERT INTO refunds (
        id, order_id, razorpay_refund_id, razorpay_payment_id, amount_paise,
        currency, reason, status, restocked, initiated_by, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING
    `, [
      refund.id, refund.order_id, refund.razorpay_refund_id || null, refund.razorpay_payment_id || null,
      refund.amount_paise, refund.currency || 'INR', refund.reason || null, refund.status || 'processed',
      Boolean(refund.restocked), refund.initiated_by, refund.notes || null, refund.created_at || new Date().toISOString()
    ]);
  } catch (err: any) {
    console.error('[NEON PERSIST REFUND ERROR]:', err.message);
  }
}

export async function recordWebhookEventInNeon(
  eventId: string,
  eventType: string,
  payload: any,
  status = 'received'
): Promise<void> {
  if (!isNeonConfigured()) return;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    await pool.query(`
      INSERT INTO webhook_events (id, event_type, payload_json, status, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `, [eventId, eventType, JSON.stringify(payload), status, new Date().toISOString()]);
  } catch (err: any) {
    console.error('[NEON RECORD WEBHOOK ERROR]:', err.message);
  }
}

export async function markWebhookProcessedInNeon(eventId: string, error?: string): Promise<void> {
  if (!isNeonConfigured()) return;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    await pool.query(`
      UPDATE webhook_events
      SET status = $1, processed_at = $2, error_message = $3
      WHERE id = $4
    `, [error ? 'error' : 'processed', new Date().toISOString(), error || null, eventId]);
  } catch (err: any) {
    console.error('[NEON MARK WEBHOOK ERROR]:', err.message);
  }
}

// ---------------------------------------------------------------------------
// SYNCHRONIZATION: POPULATE LOCAL SQLITE CACHE FROM NEON
// ---------------------------------------------------------------------------

export async function syncNeonToLocal(db: any): Promise<void> {
  if (!isNeonConfigured() || isSyncing || hasSyncedInitially) {
    return;
  }

  isSyncing = true;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    // 1. Sync Products
    const prodRes = await pool.query('SELECT * FROM products ORDER BY created_at ASC');
    if (prodRes.rows.length > 0) {
      const upsertProd = db.prepare(`
        INSERT INTO products (
          id, name, slug, tagline, description, flavor, category, image_url,
          gallery_json, ingredients, nutrition_json, usage_instructions,
          is_active, is_verified_price, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          name = excluded.name,
          slug = excluded.slug,
          tagline = excluded.tagline,
          description = excluded.description,
          flavor = excluded.flavor,
          image_url = excluded.image_url,
          ingredients = excluded.ingredients,
          nutrition_json = excluded.nutrition_json,
          usage_instructions = excluded.usage_instructions,
          is_active = excluded.is_active,
          updated_at = excluded.updated_at
      `);

      for (const p of prodRes.rows) {
        upsertProd.run(
          p.id,
          p.name,
          p.slug,
          p.tagline,
          p.description,
          p.flavor,
          p.category,
          p.image_url,
          typeof p.gallery_json === 'string' ? p.gallery_json : JSON.stringify(p.gallery_json || []),
          p.ingredients,
          typeof p.nutrition_json === 'string' ? p.nutrition_json : JSON.stringify(p.nutrition_json || {}),
          p.usage_instructions,
          p.is_active ? 1 : 0,
          p.is_verified_price ? 1 : 0,
          p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
          p.updated_at ? new Date(p.updated_at).toISOString() : new Date().toISOString()
        );
      }
    }

    // 2. Sync Product Variants
    const varRes = await pool.query('SELECT * FROM product_variants ORDER BY pack_size ASC');
    if (varRes.rows.length > 0) {
      const upsertVar = db.prepare(`
        INSERT INTO product_variants (
          id, product_id, name, sku, pack_size, price_paise,
          compare_at_price_paise, stock_quantity, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          price_paise = excluded.price_paise,
          compare_at_price_paise = excluded.compare_at_price_paise,
          stock_quantity = excluded.stock_quantity,
          is_active = excluded.is_active,
          updated_at = excluded.updated_at
      `);

      for (const v of varRes.rows) {
        upsertVar.run(
          v.id,
          v.product_id,
          v.name,
          v.sku,
          v.pack_size,
          v.price_paise,
          v.compare_at_price_paise,
          v.stock_quantity,
          v.is_active ? 1 : 0,
          v.created_at ? new Date(v.created_at).toISOString() : new Date().toISOString(),
          v.updated_at ? new Date(v.updated_at).toISOString() : new Date().toISOString()
        );
      }
    }

    // 3. Sync Customers
    const custRes = await pool.query('SELECT * FROM customers');
    if (custRes.rows.length > 0) {
      const upsertCust = db.prepare(`
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
      `);

      for (const c of custRes.rows) {
        upsertCust.run(
          c.id,
          c.email,
          c.password_hash,
          c.password_salt,
          c.name,
          c.phone,
          c.address_line1,
          c.address_line2,
          c.city,
          c.state,
          c.postal_code,
          c.country || 'India',
          c.is_active ? 1 : 0,
          c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
          c.updated_at ? new Date(c.updated_at).toISOString() : new Date().toISOString()
        );
      }
    }

    // 4. Sync Orders (Recent 200)
    const ordRes = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200');
    if (ordRes.rows.length > 0) {
      const upsertOrd = db.prepare(`
        INSERT INTO orders (
          id, order_reference, customer_id, customer_name, customer_email, customer_phone,
          shipping_address_line1, shipping_address_line2, shipping_city, shipping_state,
          shipping_postal_code, shipping_country, subtotal_paise, discount_paise, tax_paise,
          shipping_paise, total_paise, currency, payment_status, fulfilment_status,
          razorpay_order_id, razorpay_payment_id, razorpay_signature, notes,
          tracking_carrier, tracking_number, cancellation_status, cancellation_reason,
          cancellation_requested_at, cancellation_admin_notes, stock_restored,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT (id) DO UPDATE SET
          payment_status = excluded.payment_status,
          fulfilment_status = excluded.fulfilment_status,
          razorpay_order_id = excluded.razorpay_order_id,
          razorpay_payment_id = excluded.razorpay_payment_id,
          razorpay_signature = excluded.razorpay_signature,
          updated_at = excluded.updated_at
      `);

      for (const o of ordRes.rows) {
        upsertOrd.run(
          o.id,
          o.order_reference,
          o.customer_id,
          o.customer_name,
          o.customer_email,
          o.customer_phone,
          o.shipping_address_line1,
          o.shipping_address_line2,
          o.shipping_city,
          o.shipping_state,
          o.shipping_postal_code,
          o.shipping_country || 'India',
          o.subtotal_paise,
          o.discount_paise || 0,
          o.tax_paise || 0,
          o.shipping_paise || 0,
          o.total_paise,
          o.currency || 'INR',
          o.payment_status,
          o.fulfilment_status,
          o.razorpay_order_id,
          o.razorpay_payment_id,
          o.razorpay_signature,
          o.notes,
          o.tracking_carrier,
          o.tracking_number,
          o.cancellation_status,
          o.cancellation_reason,
          o.cancellation_requested_at ? new Date(o.cancellation_requested_at).toISOString() : null,
          o.cancellation_admin_notes,
          o.stock_restored ? 1 : 0,
          o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString(),
          o.updated_at ? new Date(o.updated_at).toISOString() : new Date().toISOString()
        );
      }
    }

    // 5. Sync Order Items
    const itemsRes = await pool.query('SELECT * FROM order_items ORDER BY created_at DESC LIMIT 500');
    if (itemsRes.rows.length > 0) {
      const upsertItem = db.prepare(`
        INSERT INTO order_items (
          id, order_id, product_id, variant_id, product_name, variant_name, sku,
          quantity, unit_price_paise, total_price_paise, image_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING
      `);
      for (const it of itemsRes.rows) {
        upsertItem.run(
          it.id, it.order_id, it.product_id, it.variant_id, it.product_name,
          it.variant_name, it.sku, it.quantity, it.unit_price_paise,
          it.total_price_paise, it.image_url || null,
          it.created_at ? new Date(it.created_at).toISOString() : new Date().toISOString()
        );
      }
    }

    // 6. Sync Invoices
    const invRes = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 200');
    if (invRes.rows.length > 0) {
      const upsertInv = db.prepare(`
        INSERT INTO invoices (
          id, order_id, invoice_number, invoice_date, company_name, company_address,
          gstin, customer_name, customer_email, customer_address, subtotal_paise,
          tax_paise, shipping_paise, total_paise, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING
      `);
      for (const inv of invRes.rows) {
        upsertInv.run(
          inv.id, inv.order_id, inv.invoice_number,
          inv.invoice_date ? new Date(inv.invoice_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          inv.company_name, inv.company_address, inv.gstin || null,
          inv.customer_name, inv.customer_email, inv.customer_address,
          inv.subtotal_paise, inv.tax_paise, inv.shipping_paise, inv.total_paise,
          inv.created_at ? new Date(inv.created_at).toISOString() : new Date().toISOString()
        );
      }
    }

    hasSyncedInitially = true;
    console.log('[NEON] Successfully synced store catalog, orders, and records from Neon PostgreSQL.');
  } catch (err: any) {
    console.warn('[NEON SYNC WARNING]:', err.message);
  } finally {
    isSyncing = false;
  }
}
