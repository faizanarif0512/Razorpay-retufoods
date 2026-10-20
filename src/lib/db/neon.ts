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
    max: 5,
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

/**
 * Synchronizes records from Neon PostgreSQL into the fast local SQLite cache on initialization.
 */
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

    // 4. Sync Orders (Recent 100)
    const ordRes = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100');
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

    hasSyncedInitially = true;
    console.log('[NEON] Successfully synced store catalog and records from Neon PostgreSQL.');
  } catch (err: any) {
    console.warn('[NEON SYNC WARNING]:', err.message);
  } finally {
    isSyncing = false;
  }
}

/**
 * Asynchronously persist a newly created order and items to Neon PostgreSQL.
 */
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
        razorpay_order_id, notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      )
      ON CONFLICT (id) DO UPDATE SET
        payment_status = excluded.payment_status,
        razorpay_order_id = excluded.razorpay_order_id,
        updated_at = excluded.updated_at
    `, [
      order.id, order.order_reference, order.customer_id || null, order.customer_name,
      order.customer_email, order.customer_phone, order.shipping_address_line1,
      order.shipping_address_line2 || null, order.shipping_city, order.shipping_state,
      order.shipping_postal_code, order.shipping_country || 'India', order.subtotal_paise,
      order.discount_paise || 0, order.tax_paise || 0, order.shipping_paise || 0,
      order.total_paise, order.currency || 'INR', order.payment_status,
      order.fulfilment_status, order.razorpay_order_id || null, order.notes || null,
      order.created_at, order.updated_at
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

/**
 * Asynchronously persist a customer account to Neon PostgreSQL.
 */
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
        updated_at = excluded.updated_at
    `, [
      c.id, c.email, passwordHash || c.password_hash || '', passwordSalt || c.password_salt || '',
      c.name, c.phone, c.address_line1 || null, c.address_line2 || null,
      c.city || null, c.state || null, c.postal_code || null, c.country || 'India',
      Boolean(c.is_active ?? true), c.created_at || new Date().toISOString(),
      c.updated_at || new Date().toISOString()
    ]);
  } catch (err: any) {
    console.error('[NEON PERSIST CUSTOMER ERROR]:', err.message);
  }
}

/**
 * Asynchronously update order payment status in Neon PostgreSQL.
 */
export async function updateOrderPaymentInNeon(
  orderId: string,
  razorpayPaymentId: string,
  razorpaySignature?: string
): Promise<void> {
  if (!isNeonConfigured()) return;
  try {
    const pool = getPostgresPool();
    if (!pool) return;

    await pool.query(`
      UPDATE orders
      SET payment_status = 'paid',
          fulfilment_status = 'confirmed',
          razorpay_payment_id = $1,
          razorpay_signature = COALESCE($2, razorpay_signature),
          updated_at = $3
      WHERE id = $4
    `, [razorpayPaymentId, razorpaySignature || null, new Date().toISOString(), orderId]);
  } catch (err: any) {
    console.error('[NEON UPDATE PAYMENT ERROR]:', err.message);
  }
}
