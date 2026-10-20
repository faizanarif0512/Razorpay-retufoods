-- ==============================================================================
-- RETÜ FOODS STORE - NEON POSTGRESQL COMPLETE SCHEMA & SEED DATA
-- Company: DancingEarth Food Private Limited
-- Brand: Retü Foods (mi-biotics™)
-- ==============================================================================

-- Drop old incompatible tables if present
DROP TABLE IF EXISTS invoice_deliveries CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS payment_attempts CASCADE;
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- 1. PRODUCTS TABLE
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    tagline TEXT,
    description TEXT NOT NULL,
    flavor TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Gut Shot',
    image_url TEXT NOT NULL,
    gallery_json JSONB DEFAULT '[]'::jsonb,
    ingredients TEXT NOT NULL,
    nutrition_json JSONB DEFAULT '{}'::jsonb,
    usage_instructions TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified_price BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PRODUCT VARIANTS TABLE
CREATE TABLE product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    pack_size INTEGER NOT NULL DEFAULT 6,
    price_paise BIGINT NOT NULL CHECK (price_paise > 0),
    compare_at_price_paise BIGINT CHECK (compare_at_price_paise >= price_paise),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CUSTOMERS TABLE (Persistent Account Management)
CREATE TABLE customers (
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
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ORDERS TABLE
CREATE TABLE orders (
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
    subtotal_paise BIGINT NOT NULL CHECK (subtotal_paise >= 0),
    discount_paise BIGINT NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
    tax_paise BIGINT NOT NULL DEFAULT 0 CHECK (tax_paise >= 0),
    shipping_paise BIGINT NOT NULL DEFAULT 0 CHECK (shipping_paise >= 0),
    total_paise BIGINT NOT NULL CHECK (total_paise >= 0),
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
    cancellation_requested_at TIMESTAMPTZ,
    cancellation_admin_notes TEXT,
    stock_restored BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ORDER ITEMS TABLE (Immutable historical snapshot)
CREATE TABLE order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    variant_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_paise BIGINT NOT NULL CHECK (unit_price_paise >= 0),
    total_price_paise BIGINT NOT NULL CHECK (total_price_paise >= 0),
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PAYMENT ATTEMPTS TABLE
CREATE TABLE payment_attempts (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    razorpay_order_id TEXT NOT NULL,
    razorpay_payment_id TEXT,
    amount_paise BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL,
    error_code TEXT,
    error_description TEXT,
    raw_response_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. WEBHOOK EVENTS TABLE (Idempotency deduplication)
CREATE TABLE webhook_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'received',
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. INVOICES TABLE
CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    company_name TEXT NOT NULL,
    company_address TEXT NOT NULL,
    gstin TEXT,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    subtotal_paise BIGINT NOT NULL,
    tax_paise BIGINT NOT NULL,
    shipping_paise BIGINT NOT NULL,
    total_paise BIGINT NOT NULL,
    pdf_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ADMIN USERS TABLE
CREATE TABLE admin_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. REFUNDS TABLE
CREATE TABLE refunds (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    razorpay_refund_id TEXT,
    razorpay_payment_id TEXT,
    amount_paise BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'processed',
    restocked BOOLEAN NOT NULL DEFAULT TRUE,
    initiated_by TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    actor_type TEXT NOT NULL,
    actor_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details_json JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_orders_ref ON orders(order_reference);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_email ON orders(customer_email);
CREATE INDEX idx_orders_rp_order ON orders(razorpay_order_id);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_webhook_status ON webhook_events(status);
CREATE INDEX idx_refunds_order ON refunds(order_id);

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

-- 1. Default Super Admin (admin@retufoods.com)
INSERT INTO admin_users (id, email, password_hash, password_salt, role, name, is_active, created_at)
VALUES (
    'admin_super_01',
    'admin@retufoods.com',
    'a3c4852e6f436fb3a12a8e8eb46fbf0aa84d41dfc45f479a834d95b542e88a0871d3a5fc769da812f86ec0b4bf729ef5e0037eb94cfd2b1f13ce82bf1b14a600',
    '2dc6e4efbe2a8c3d9876543210abcdef',
    'admin',
    'Retü Foods Administrator',
    TRUE,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- 2. Seed Products
INSERT INTO products (
    id, name, slug, tagline, description, flavor, category, image_url, gallery_json,
    ingredients, nutrition_json, usage_instructions, is_active, is_verified_price, created_at, updated_at
) VALUES 
(
    'prod_mango_01',
    'mi-biotics™ Fermented Millet Gut Shot - Alphonso Mango',
    'mibiotics-mango',
    'Patented fermented multi-millet gut shot with real Alphonso mango',
    'mi-biotics™ is a chilled, fermented multi-millet gut shot (75ml) designed for daily microbiome health. Made from real Alphonso mangoes and a fermented multi-millet base of bajra, jowar, and ragi: dairy-free, clean-label, and zero preservatives. Contains clinically researched LGG® and Wellmune® bio-actives, independently validated by AMILI Singapore.',
    'Alphonso Mango',
    'Gut Shot',
    '/images/products/mibiotics-mango.png',
    '["/images/products/mibiotics-mango.png", "/images/products/mibiotics-render.jpg"]'::jsonb,
    'Fermented Multi-Millet Matrix (Bajra / Pearl Millet, Jowar / Sorghum, Ragi / Finger Millet), Real Alphonso Mango Puree, Filtered Water, LGG® (Lacticaseibacillus rhamnosus GG by Chr. Hansen), Wellmune® (Yeast Beta Glucan by Kerry), Natural Spices. No dairy. No added sugar. No preservatives. No artificial additives.',
    '{"serving_size": "75 ml", "energy_kcal": 42, "carbohydrates_g": 8.5, "naturally_occurring_sugars_g": 4.1, "added_sugars_g": 0, "protein_g": 1.2, "dietary_fiber_g": 1.8, "fat_g": 0.2, "lgg_probiotics": "10+ Billion CFU", "wellmune_beta_glucan_mg": 250}'::jsonb,
    'Drink 1 chilled shot (75ml) once a day whenever it fits your routine. Shake well before drinking. Keep refrigerated at 2°C to 8°C.',
    TRUE,
    TRUE,
    NOW(),
    NOW()
),
(
    'prod_lychee_02',
    'mi-biotics™ Fermented Millet Gut Shot - Lychee',
    'mibiotics-lychee',
    'Crisp floral lychee notes infused into our patented fermented millet matrix',
    'Clean, delicate real lychee combined with living cultures from our patented fermentation process. Zero lactose, zero gluten-containing grains, no added sugar, and high concentration of short-chain fatty acid precursors.',
    'Lychee',
    'Gut Shot',
    '/images/products/mibiotics-render.jpg',
    '["/images/products/mibiotics-render.jpg", "/images/products/mibiotics-mango.png"]'::jsonb,
    'Fermented Multi-Millet Matrix (Bajra, Jowar, Ragi), Real Lychee Puree, Filtered Water, LGG® (Chr. Hansen), Wellmune® (Kerry), Natural Spices. 100% plant-based, clean-label.',
    '{"serving_size": "75 ml", "energy_kcal": 39, "carbohydrates_g": 7.8, "naturally_occurring_sugars_g": 3.8, "added_sugars_g": 0, "protein_g": 1.1, "dietary_fiber_g": 1.6, "fat_g": 0.1, "lgg_probiotics": "10+ Billion CFU", "wellmune_beta_glucan_mg": 250}'::jsonb,
    'Drink 1 chilled shot (75ml) daily. Shake well before drinking. Keep refrigerated at 2°C to 8°C.',
    TRUE,
    TRUE,
    NOW(),
    NOW()
),
(
    'prod_duo_03',
    'mi-biotics™ Discovery Duo Pack (Mango + Lychee)',
    'mibiotics-discovery-duo',
    'Experience both launch flavours in a single variety box',
    'The optimal discovery box containing an even split of Alphonso Mango and Lychee 75ml bottles. Enjoy the variety of whole-food fruit tastes while receiving the identical patented fermented multi-millet therapeutic dosage.',
    'Mango & Lychee Variety',
    'Variety Pack',
    '/images/products/mibiotics-mango.png',
    '["/images/products/mibiotics-mango.png", "/images/products/mibiotics-render.jpg"]'::jsonb,
    'Combination of mi-biotics™ Alphonso Mango and Lychee bottles. 100% dairy-free, live fermented cultures, LGG®, Wellmune®.',
    '{"serving_size": "75 ml", "energy_kcal": 40.5, "carbohydrates_g": 8.1, "naturally_occurring_sugars_g": 3.9, "added_sugars_g": 0, "protein_g": 1.15, "dietary_fiber_g": 1.7, "fat_g": 0.15, "lgg_probiotics": "10+ Billion CFU per bottle", "wellmune_beta_glucan_mg": 250}'::jsonb,
    'Drink 1 chilled shot (75ml) daily. Shake well before drinking. Keep refrigerated at 2°C to 8°C.',
    TRUE,
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    ingredients = EXCLUDED.ingredients,
    nutrition_json = EXCLUDED.nutrition_json;

-- 3. Seed Variants
INSERT INTO product_variants (
    id, product_id, name, sku, pack_size, price_paise, compare_at_price_paise, stock_quantity, is_active, created_at, updated_at
) VALUES
('var_mango_6p', 'prod_mango_01', '6-Pack (6 × 75ml) - Starter', 'RETU-MB-MNG-6P', 6, 54000, 60000, 60, TRUE, NOW(), NOW()),
('var_mango_12p', 'prod_mango_01', '12-Pack (12 × 75ml) - 2 Weeks', 'RETU-MB-MNG-12P', 12, 102000, 120000, 45, TRUE, NOW(), NOW()),
('var_mango_24p', 'prod_mango_01', '24-Pack (24 × 75ml) - Monthly Protocol', 'RETU-MB-MNG-24P', 24, 192000, 240000, 30, TRUE, NOW(), NOW()),

('var_lychee_6p', 'prod_lychee_02', '6-Pack (6 × 75ml) - Starter', 'RETU-MB-LYC-6P', 6, 54000, 60000, 50, TRUE, NOW(), NOW()),
('var_lychee_12p', 'prod_lychee_02', '12-Pack (12 × 75ml) - 2 Weeks', 'RETU-MB-LYC-12P', 12, 102000, 120000, 35, TRUE, NOW(), NOW()),
('var_lychee_24p', 'prod_lychee_02', '24-Pack (24 × 75ml) - Monthly Protocol', 'RETU-MB-LYC-24P', 24, 192000, 240000, 25, TRUE, NOW(), NOW()),

('var_duo_6p', 'prod_duo_03', '6-Pack Duo (3 Mango + 3 Lychee)', 'RETU-MB-DUO-6P', 6, 54000, 60000, 75, TRUE, NOW(), NOW()),
('var_duo_12p', 'prod_duo_03', '12-Pack Duo (6 Mango + 6 Lychee)', 'RETU-MB-DUO-12P', 12, 102000, 120000, 50, TRUE, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    price_paise = EXCLUDED.price_paise,
    stock_quantity = EXCLUDED.stock_quantity;
