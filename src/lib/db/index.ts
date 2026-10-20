import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

import { DatabaseSync } from 'node:sqlite';
import { syncNeonToLocal, isNeonConfigured } from './neon.ts';

let dbInstance: any = null;

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'retufoods.db');

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const calculated = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
}

function resolveDatabasePath(): string {
  if (process.env.SQLITE_DB_PATH) {
    return path.resolve(process.cwd(), process.env.SQLITE_DB_PATH);
  }

  // Detect serverless environment (Netlify, AWS Lambda, Vercel)
  const isServerless = Boolean(
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.VERCEL
  );

  if (isServerless) {
    return path.join(os.tmpdir(), 'retufoods.db');
  }

  return DB_PATH;
}

export function getDb() {
  if (dbInstance) return dbInstance;

  let targetPath = resolveDatabasePath();
  let targetDir = path.dirname(targetPath);

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch (dirErr) {
    console.warn('[DB] Cannot create directory at', targetDir, 'falling back to os.tmpdir():', dirErr);
    targetPath = path.join(os.tmpdir(), 'retufoods.db');
  }

  let db: any;
  try {
    db = new DatabaseSync(targetPath);
  } catch (openErr) {
    console.warn('[DB] Failed opening db at', targetPath, 'falling back to os.tmpdir():', openErr);
    targetPath = path.join(os.tmpdir(), 'retufoods.db');
    db = new DatabaseSync(targetPath);
  }
  
  // Pragmas for performance and data integrity
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA journal_mode = WAL;');
  } catch (pragmaErr) {
    console.warn('[DB] SQLite WAL pragma skipped in serverless environment:', pragmaErr);
  }

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      tagline TEXT,
      description TEXT NOT NULL,
      flavor TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Gut Shot',
      image_url TEXT NOT NULL,
      gallery_json TEXT DEFAULT '[]',
      ingredients TEXT NOT NULL,
      nutrition_json TEXT DEFAULT '{}',
      usage_instructions TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_verified_price INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      pack_size INTEGER NOT NULL DEFAULT 6,
      price_paise INTEGER NOT NULL CHECK (price_paise > 0),
      compare_at_price_paise INTEGER,
      stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address_line1 TEXT,
      address_line2 TEXT,
      city TEXT,
      state TEXT,
      postal_code TEXT,
      country TEXT NOT NULL DEFAULT 'India',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_reference TEXT NOT NULL UNIQUE,
      customer_id TEXT REFERENCES customers(id),
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      shipping_address_line1 TEXT NOT NULL,
      shipping_address_line2 TEXT,
      shipping_city TEXT NOT NULL,
      shipping_state TEXT NOT NULL,
      shipping_postal_code TEXT NOT NULL,
      shipping_country TEXT NOT NULL DEFAULT 'India',
      subtotal_paise INTEGER NOT NULL,
      discount_paise INTEGER NOT NULL DEFAULT 0,
      tax_paise INTEGER NOT NULL DEFAULT 0,
      shipping_paise INTEGER NOT NULL DEFAULT 0,
      total_paise INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      fulfilment_status TEXT NOT NULL DEFAULT 'pending',
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      razorpay_signature TEXT,
      notes TEXT,
      tracking_carrier TEXT,
      tracking_number TEXT,
      cancellation_status TEXT,
      cancellation_reason TEXT,
      cancellation_requested_at TEXT,
      cancellation_admin_notes TEXT,
      stock_restored INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      variant_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_paise INTEGER NOT NULL,
      total_price_paise INTEGER NOT NULL,
      image_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_attempts (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      razorpay_order_id TEXT NOT NULL,
      razorpay_payment_id TEXT,
      amount_paise INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL,
      error_code TEXT,
      error_description TEXT,
      raw_response_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received',
      processed_at TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      invoice_number TEXT NOT NULL UNIQUE,
      invoice_date TEXT NOT NULL,
      company_name TEXT NOT NULL,
      company_address TEXT NOT NULL,
      gstin TEXT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_address TEXT NOT NULL,
      subtotal_paise INTEGER NOT NULL,
      tax_paise INTEGER NOT NULL,
      shipping_paise INTEGER NOT NULL,
      total_paise INTEGER NOT NULL,
      pdf_path TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      razorpay_refund_id TEXT,
      razorpay_payment_id TEXT,
      amount_paise INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'processed',
      restocked INTEGER NOT NULL DEFAULT 1,
      initiated_by TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_ref ON orders(order_reference);
    CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_rp_order ON orders(razorpay_order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_ord ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_webhook_status ON webhook_events(status);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
  `);

  // Non-destructive column addition for existing database instances
  try {
    db.exec('ALTER TABLE orders ADD COLUMN customer_id TEXT REFERENCES customers(id);');
  } catch (_) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE orders ADD COLUMN cancellation_status TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE orders ADD COLUMN cancellation_reason TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE orders ADD COLUMN cancellation_requested_at TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE orders ADD COLUMN cancellation_admin_notes TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE orders ADD COLUMN stock_restored INTEGER DEFAULT 0;');
  } catch (_) {}

  seedInitialData(db);

  if (isNeonConfigured()) {
    syncNeonToLocal(db).catch((err) => {
      console.warn('[NEON SYNC NOTICE]:', err.message);
    });
  }

  dbInstance = db;
  return db;
}

function seedInitialData(db: any) {
  const now = new Date().toISOString();

  // Check if admin user exists
  const adminStmt = db.prepare('SELECT id FROM admin_users WHERE email = ?');
  const existingAdmin = adminStmt.get('admin@retufoods.com');
  if (!existingAdmin) {
    const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'RetuAdminInitialPass2026!';
    const { hash, salt } = hashPassword(defaultPassword);
    const insertAdmin = db.prepare(`
      INSERT INTO admin_users (id, email, password_hash, password_salt, role, name, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `);
    insertAdmin.run(
      'admin_super_01',
      'admin@retufoods.com',
      hash,
      salt,
      'admin',
      'Retü Foods Administrator',
      now
    );
  }

  // Check if products exist
  const prodStmt = db.prepare('SELECT count(*) as count FROM products');
  const { count } = prodStmt.get();
  if (count === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (
        id, name, slug, tagline, description, flavor, category, image_url, gallery_json,
        ingredients, nutrition_json, usage_instructions, is_active, is_verified_price,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
    `);

    const insertVariant = db.prepare(`
      INSERT INTO product_variants (
        id, product_id, name, sku, pack_size, price_paise, compare_at_price_paise,
        stock_quantity, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    // 1. Alphonso Mango
    insertProduct.run(
      'prod_mango_01',
      'mi-biotics™ Fermented Millet Gut Shot - Alphonso Mango',
      'mibiotics-mango',
      'Patented fermented multi-millet gut shot with real Alphonso mango',
      'mi-biotics™ is a chilled, fermented multi-millet gut shot (75ml) designed for daily microbiome health. Made from real Alphonso mangoes and a fermented multi-millet base of bajra, jowar, and ragi: dairy-free, clean-label, and zero preservatives. Contains clinically researched LGG® and Wellmune® bio-actives, independently validated by AMILI Singapore.',
      'Alphonso Mango',
      'Gut Shot',
      '/images/products/mibiotics-mango.png',
      JSON.stringify(['/images/products/mibiotics-mango.png', '/images/products/mibiotics-render.jpg']),
      'Fermented Multi-Millet Matrix (Bajra / Pearl Millet, Jowar / Sorghum, Ragi / Finger Millet), Real Alphonso Mango Puree, Filtered Water, LGG® (Lacticaseibacillus rhamnosus GG by Chr. Hansen), Wellmune® (Yeast Beta Glucan by Kerry), Natural Spices. No dairy. No added sugar. No preservatives. No artificial additives.',
      JSON.stringify({
        serving_size: '75 ml',
        energy_kcal: 42,
        carbohydrates_g: 8.5,
        naturally_occurring_sugars_g: 4.1,
        added_sugars_g: 0,
        protein_g: 1.2,
        dietary_fiber_g: 1.8,
        fat_g: 0.2,
        lgg_probiotics: '10+ Billion CFU',
        wellmune_beta_glucan_mg: 250
      }),
      'Drink 1 chilled shot (75ml) once a day whenever it fits your routine. Shake well before drinking. Keep refrigerated at 2°C to 8°C.',
      now,
      now
    );

    insertVariant.run('var_mango_6p', 'prod_mango_01', '6-Pack (6 × 75ml) - Starter', 'RETU-MB-MNG-6P', 6, 54000, 60000, 60, now, now);
    insertVariant.run('var_mango_12p', 'prod_mango_01', '12-Pack (12 × 75ml) - 2 Weeks', 'RETU-MB-MNG-12P', 12, 102000, 120000, 45, now, now);
    insertVariant.run('var_mango_24p', 'prod_mango_01', '24-Pack (24 × 75ml) - Monthly Protocol', 'RETU-MB-MNG-24P', 24, 192000, 240000, 30, now, now);

    // 2. Lychee
    insertProduct.run(
      'prod_lychee_02',
      'mi-biotics™ Fermented Millet Gut Shot - Lychee',
      'mibiotics-lychee',
      'Crisp floral lychee notes infused into our patented fermented millet matrix',
      'Clean, delicate real lychee combined with living cultures from our patented fermentation process. Zero lactose, zero gluten-containing grains, no added sugar, and high concentration of short-chain fatty acid precursors.',
      'Lychee',
      'Gut Shot',
      '/images/products/mibiotics-render.jpg',
      JSON.stringify(['/images/products/mibiotics-render.jpg', '/images/products/mibiotics-mango.png']),
      'Fermented Multi-Millet Matrix (Bajra, Jowar, Ragi), Real Lychee Puree, Filtered Water, LGG® (Chr. Hansen), Wellmune® (Kerry), Natural Spices. 100% plant-based, clean-label.',
      JSON.stringify({
        serving_size: '75 ml',
        energy_kcal: 39,
        carbohydrates_g: 7.8,
        naturally_occurring_sugars_g: 3.8,
        added_sugars_g: 0,
        protein_g: 1.1,
        dietary_fiber_g: 1.6,
        fat_g: 0.1,
        lgg_probiotics: '10+ Billion CFU',
        wellmune_beta_glucan_mg: 250
      }),
      'Drink 1 chilled shot (75ml) daily. Shake well before drinking. Keep refrigerated at 2°C to 8°C.',
      now,
      now
    );

    insertVariant.run('var_lychee_6p', 'prod_lychee_02', '6-Pack (6 × 75ml) - Starter', 'RETU-MB-LYC-6P', 6, 54000, 60000, 50, now, now);
    insertVariant.run('var_lychee_12p', 'prod_lychee_02', '12-Pack (12 × 75ml) - 2 Weeks', 'RETU-MB-LYC-12P', 12, 102000, 120000, 35, now, now);
    insertVariant.run('var_lychee_24p', 'prod_lychee_02', '24-Pack (24 × 75ml) - Monthly Protocol', 'RETU-MB-LYC-24P', 24, 192000, 240000, 25, now, now);

    // 3. Discovery Duo Pack
    insertProduct.run(
      'prod_duo_03',
      'mi-biotics™ Discovery Duo Pack (Mango + Lychee)',
      'mibiotics-discovery-duo',
      'Experience both launch flavours in a single variety box',
      'The optimal discovery box containing an even split of Alphonso Mango and Lychee 75ml bottles. Enjoy the variety of whole-food fruit tastes while receiving the identical patented fermented multi-millet therapeutic dosage.',
      'Mango & Lychee Variety',
      'Variety Pack',
      '/images/products/mibiotics-mango.png',
      JSON.stringify(['/images/products/mibiotics-mango.png', '/images/products/mibiotics-render.jpg']),
      'Combination of mi-biotics™ Alphonso Mango and Lychee bottles. 100% dairy-free, live fermented cultures, LGG®, Wellmune®.',
      JSON.stringify({
        serving_size: '75 ml',
        energy_kcal: 40.5,
        carbohydrates_g: 8.1,
        naturally_occurring_sugars_g: 3.9,
        added_sugars_g: 0,
        protein_g: 1.15,
        dietary_fiber_g: 1.7,
        fat_g: 0.15,
        lgg_probiotics: '10+ Billion CFU per bottle',
        wellmune_beta_glucan_mg: 250
      }),
      'Drink 1 chilled shot (75ml) daily. Shake well before drinking. Keep refrigerated at 2°C to 8°C.',
      now,
      now
    );

    insertVariant.run('var_duo_6p', 'prod_duo_03', '6-Pack Duo (3 Mango + 3 Lychee)', 'RETU-MB-DUO-6P', 6, 54000, 60000, 75, now, now);
    insertVariant.run('var_duo_12p', 'prod_duo_03', '12-Pack Duo (6 Mango + 6 Lychee)', 'RETU-MB-DUO-12P', 12, 102000, 120000, 50, now, now);
  }

  // Stock safeguard: ensure variants never stay at 0 in development/testing
  db.prepare(`UPDATE product_variants SET stock_quantity = 60 WHERE stock_quantity <= 0;`).run();
}

