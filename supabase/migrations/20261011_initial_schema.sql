-- ==============================================================================
-- RETÜ FOODS CUSTOM WEBSTORE - SUPABASE POSTGRESQL PRODUCTION MIGRATION
-- Brand: Retü Foods / mi-biotics™
-- Company: DancingEarth Food Private Limited
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
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
CREATE TABLE IF NOT EXISTS product_variants (
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

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_reference TEXT NOT NULL UNIQUE,
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ORDER ITEMS (Immutable historical snapshot)
CREATE TABLE IF NOT EXISTS order_items (
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

-- 5. PAYMENT ATTEMPTS
CREATE TABLE IF NOT EXISTS payment_attempts (
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

-- 6. WEBHOOK EVENTS (Deduplication & Idempotency)
CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY, -- Razorpay event ID (e.g. event_...)
    event_type TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'received',
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
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

-- 8. ADMIN USERS
CREATE TABLE IF NOT EXISTS admin_users (
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

-- 9. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
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

-- 10. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_reference ON orders(order_reference);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_order ON payment_attempts(order_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Public can read active products and variants
CREATE POLICY "Public can view active products" ON products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public can view active variants" ON product_variants FOR SELECT USING (is_active = TRUE);

-- Orders and Invoices: only server-side service role or authenticated owner
-- Service role bypasses RLS by default in Supabase.
