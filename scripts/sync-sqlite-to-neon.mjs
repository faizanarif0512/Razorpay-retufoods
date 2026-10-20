import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { DatabaseSync } from 'node:sqlite';

const envPath = path.resolve(process.cwd(), '.env.local');
const lines = fs.readFileSync(envPath, 'utf8').split('\n');
let dbUrl = '';
for (const line of lines) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
  }
}

const sqlitePath = path.resolve(process.cwd(), 'data', 'retufoods.db');
if (!fs.existsSync(sqlitePath)) {
  console.log('No local SQLite database found at data/retufoods.db.');
  process.exit(0);
}

const sqlite = new DatabaseSync(sqlitePath);
const pgClient = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

await pgClient.connect();
console.log('🔄 Syncing local SQLite data to Neon PostgreSQL...\n');

// 1. Customers
try {
  const customers = sqlite.prepare('SELECT * FROM customers').all();
  for (const c of customers) {
    await pgClient.query(`
      INSERT INTO customers (id, email, password_hash, password_salt, name, phone, address_line1, address_line2, city, state, postal_code, country, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO NOTHING
    `, [c.id, c.email, c.password_hash, c.password_salt, c.name, c.phone, c.address_line1, c.address_line2, c.city, c.state, c.postal_code, c.country || 'India', Boolean(c.is_active), c.created_at, c.updated_at]);
  }
  console.log(`✅ Synced ${customers.length} customer account(s)`);
} catch (e) {
  console.warn('Customer sync note:', e.message);
}

// 2. Orders
try {
  const orders = sqlite.prepare('SELECT * FROM orders').all();
  for (const o of orders) {
    await pgClient.query(`
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
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
      ) ON CONFLICT (id) DO NOTHING
    `, [
      o.id, o.order_reference, o.customer_id, o.customer_name, o.customer_email, o.customer_phone,
      o.shipping_address_line1, o.shipping_address_line2, o.shipping_city, o.shipping_state,
      o.shipping_postal_code, o.shipping_country || 'India', o.subtotal_paise, o.discount_paise || 0,
      o.tax_paise || 0, o.shipping_paise || 0, o.total_paise, o.currency || 'INR', o.payment_status,
      o.fulfilment_status, o.razorpay_order_id, o.razorpay_payment_id, o.razorpay_signature,
      o.notes, o.tracking_carrier, o.tracking_number, o.cancellation_status, o.cancellation_reason,
      o.cancellation_requested_at, o.cancellation_admin_notes, Boolean(o.stock_restored),
      o.created_at, o.updated_at
    ]);
  }
  console.log(`✅ Synced ${orders.length} order(s)`);
} catch (e) {
  console.warn('Order sync note:', e.message);
}

// 3. Order Items
try {
  const items = sqlite.prepare('SELECT * FROM order_items').all();
  for (const it of items) {
    await pgClient.query(`
      INSERT INTO order_items (id, order_id, product_id, variant_id, product_name, variant_name, sku, quantity, unit_price_paise, total_price_paise, image_url, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING
    `, [it.id, it.order_id, it.product_id, it.variant_id, it.product_name, it.variant_name, it.sku, it.quantity, it.unit_price_paise, it.total_price_paise, it.image_url, it.created_at]);
  }
  console.log(`✅ Synced ${items.length} order item(s)`);
} catch (e) {
  console.warn('Order item sync note:', e.message);
}

// 4. Invoices
try {
  const invoices = sqlite.prepare('SELECT * FROM invoices').all();
  for (const inv of invoices) {
    await pgClient.query(`
      INSERT INTO invoices (id, order_id, invoice_number, invoice_date, company_name, company_address, gstin, customer_name, customer_email, customer_address, subtotal_paise, tax_paise, shipping_paise, total_paise, pdf_path, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO NOTHING
    `, [inv.id, inv.order_id, inv.invoice_number, inv.invoice_date, inv.company_name, inv.company_address, inv.gstin, inv.customer_name, inv.customer_email, inv.customer_address, inv.subtotal_paise, inv.tax_paise, inv.shipping_paise, inv.total_paise, inv.pdf_path, inv.created_at]);
  }
  console.log(`✅ Synced ${invoices.length} invoice(s)`);
} catch (e) {
  console.warn('Invoice sync note:', e.message);
}

console.log('\n🎉 Synchronization to Neon PostgreSQL finished successfully!');
await pgClient.end();
