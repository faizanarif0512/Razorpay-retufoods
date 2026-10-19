# Retü Foods: Custom E-Commerce Webstore (mi-biotics™)

Production-ready custom e-commerce webstore for **Retü Foods**, the brand behind **mi-biotics™**, using the official brand identity, typography, color tokens, and clinical evidence from [https://www.retufoods.com/](https://www.retufoods.com/).

---

## 1. Verified Brand & Business Information

- **Brand Name:** Retü Foods / Retü®
- **Product Range:** mi-biotics™ (Chilled, dairy-free fermented multi-millet gut shots)
- **Legal Entity:** DancingEarth Food Private Limited
- **Registered Address:** 2nd Floor, 235 Binnamangala, 13th Cross Road, Indiranagar, Bengaluru, Karnataka 560038, India
- **Phone:** 011-69269668
- **Support Email:** `faizan.loyola@gmail.com`
- **Manufacturing Facility:** Dedicated, purpose-built, 100% dairy-free line in Coimbatore, Tamil Nadu
- **Indian Patent:** **Patent No. 551921** (Granted October 2024): *Fermented Multi-Millet, Fruit-Based Vegan Probiotic Composition and Method of Preparing the Same*
- **Clinical Validation:** Tested in vitro against Asian gut microbiome by **AMILI (Singapore)**
- **Bio-Actives:** LGG® (*Lacticaseibacillus rhamnosus GG* by Chr. Hansen) & Wellmune® (*Yeast beta glucan* by Kerry)
- **Grains & Formulation:** Bajra (Pearl Millet), Jowar (Sorghum), Ragi (Finger Millet), real fruit purees (Alphonso Mango, Lychee). 0% Dairy, 0% Added Sugars, 0% Preservatives.

---

## 2. Store Architecture & Customer Routes

The webstore is **100% independent and self-contained**. It has zero external redirects and zero em dashes across the entire user experience.

| Route | Purpose | Features |
|---|---|---|
| `/` | Root Redirect | Seamlessly forwards customers to `/store` |
| `/store` | Storefront Homepage | Hero showcase, mi-biotics range, clinical citations, patent badge, product cards |
| `/store/products` | Full Product Catalogue | Responsive grid, flavour filters (Mango, Lychee, Duo), pack selectors, stock indicators |
| `/store/products/[slug]` | Product Details | Multi-image gallery, protocol pack sizes, nutrition facts panel, ingredients, cold transit promise |
| `/store/science` | The Science | Deep dive into Patent No. 551921, AMILI Singapore research, LGG® & Wellmune® bio-actives |
| `/store/our-story` | Founder's Story | Origin story: Ritu nursing Lavindra through 19 days in COVID-19 ICU, rebuilding gut microbiome |
| `/store/microbiome` | Gut Health Guide | Educational guide on microbial diversity, dysbiosis, and Short-Chain Fatty Acids (SCFAs) |
| `/store/faq` | Frequently Asked Questions | Shelf life (45 days), dosage instructions, 2°C to 8°C refrigeration, shipping details |
| `/store/contact` | Contact & Support | Registered office in Indiranagar Bengaluru, phone helpline, direct support message form |
| `/store/cart` | Shopping Cart | Persistent items, quantity controls, subtotal, cold-chain shipping calculation, free shipping meter |
| `/store/checkout` | One-Page Checkout | Mandatory permanent customer account creation or login, contact, address, server-side validated amounts |
| `/store/order-confirmation/[orderReference]` | Verified Confirmation | Server-validated payment status, order reference, line item summary, invoice link |
| `/store/account` | Customer Hub | Profile overview, saved shipping address, quick links to order history |
| `/store/account/login` | Customer Login | Email and password authentication with permanent persistent session cookie |
| `/store/account/register` | Customer Registration | Create permanent customer account to track dispatches and download GST tax invoices |
| `/store/account/orders` | Customer Order History | Lists all past verified orders, live courier tracking numbers, and instant PDF invoice downloads |
| `/admin` | Seller Admin Dashboard | Real-time revenue KPIs, stock alerts, order fulfillment updater, price editor, webhook simulator |
| `/admin/login` | Admin Authentication | Scrypt password verification, HMAC-SHA256 signed session cookie |

---

## 3. Technology Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS + Vanilla CSS tokens with Montserrat typography
- **Database:** Universal persistent engine:
  - Local / Embedded: Node built-in SQLite engine (`node:sqlite`) with WAL mode and ACID transactions
  - Cloud / Production: Supabase PostgreSQL migration script provided at `supabase/migrations/20261011_initial_schema.sql`
- **Customer Auth:** Scrypt password hashing with cryptographic salts + 30-day persistent HTTP-only session cookies
- **Payments:** Razorpay Standard Checkout SDK + Server-side HMAC-SHA256 signature verification + Webhook deduplication
- **Mailing:** Universal SMTP support powered by `nodemailer` (Gmail, Hostinger, Zoho, Amazon SES, Brevo, SendGrid)
- **Invoices:** Compliant printable tax invoices matching Indian GST guidelines (`RETU-INV-2026-XXXX`)

---

## 4. Setup & Running Locally

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### Step 3: Run Unit & Integration Tests
```bash
npm test
```
All 15 automated tests will run and verify:
- Pricing and atomic stock reservation
- Free cold-chain shipping threshold (₹999+)
- Razorpay HMAC-SHA256 signature calculation and verification
- Webhook signature validation and idempotency
- Customer registration, login, and order linkage

### Step 4: Run Development or Production Server
```bash
# Development mode
npm run dev

# Production build and run
npm run build
npm run start
```
The storefront is available at `http://localhost:3000/store` and the seller admin is at `http://localhost:3000/admin`.

---

## 5. Razorpay Integration Guide (Test Account)

You already have a Razorpay Test Account created. Here is how to link it:

### Step 1: Obtain Your Test API Keys
1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. In the top-left or top-right, ensure the mode toggle is switched to **Test Mode**.
3. Navigate to **Account & Settings** (gear icon) -> **API Keys**.
4. Click **Generate Test Key** (or view your existing Test Key).
5. You will see:
   - **Key ID:** Starts with `rzp_test_...`
   - **Key Secret:** A 24-character secret string (e.g., `wE39x...`)

### Step 2: Add Keys to `.env.local`
Open `d:\RetuFoods\.env.local` and paste:
```env
# Public Key ID for the browser checkout modal:
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YOUR_ACTUAL_KEY_ID

# Secret Key strictly for the server to create orders and verify HMAC signatures:
RAZORPAY_KEY_SECRET=YOUR_ACTUAL_KEY_SECRET
```

### Step 3: Configure Razorpay Webhooks
1. In the Razorpay Dashboard, go to **Account & Settings** -> **Webhooks**.
2. Click **Add New Webhook**.
3. In **Webhook URL**, enter your public endpoint:
   - In production: `https://store.retufoods.com/api/webhooks/razorpay`
   - In local development: use [ngrok](https://ngrok.com/) to expose port 3000 (e.g., `https://xxxx.ngrok-free.app/api/webhooks/razorpay`).
4. In **Secret**, enter a webhook secret string of your choice (e.g. `retu_live_webhook_secret_2026`).
5. In **Active Events**, select:
   - `order.paid`
   - `payment.failed`
   - `payment.captured`
6. Click **Save Webhook**.
7. In `.env.local`, set:
```env
RAZORPAY_WEBHOOK_SECRET=retu_live_webhook_secret_2026
```

### Step 4: Test Payment Flow
1. Open `http://localhost:3000/store` in your browser.
2. Add a product (e.g. Alphonso Mango 6-Pack) to cart and click **Checkout**.
3. Fill in contact and shipping details, create a password, and click **Pay via Razorpay**.
4. The Razorpay Standard Checkout opens.
5. In Test Mode, use Razorpay test credentials:
   - **Card:** Enter `4111 1111 1111 1111`, any future expiry (e.g. `12/28`), and CVV `123`.
   - **UPI:** Enter any test VPA (e.g. `success@razorpay`).
   - Click **Success**.
6. The server validates the cryptographic HMAC signature, captures the payment, decrements inventory, generates `RETU-INV-2026-XXXX`, sends email notifications, and displays the verified confirmation page!

---

## 6. SMTP Mailing Guide (Transactional Emails & Tax Invoices)

The store has native SMTP support via `nodemailer`. It automatically emails:
1. **Customer Order Confirmation:** Full order breakdown, payment reference, and secure link to download the GST Tax Invoice.
2. **Admin Notification:** Real-time email alerting the Bengaluru warehouse team to pack and dispatch the chilled package.

### How to Configure SMTP:
In `.env.local`, set `EMAIL_PROVIDER=smtp` and supply your SMTP host credentials.

#### Option A: Gmail (Google Workspace or personal Gmail)
1. Go to your Google Account -> **Security** -> **2-Step Verification**.
2. Scroll to the bottom and select **App Passwords**.
3. Create an app password named "Retu Store" and copy the 16-character code.
4. In `.env.local`:
```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="orders@retufoods.com"  # Your Gmail / Google Workspace email
SMTP_PASS="xxxx xxxx xxxx xxxx"  # The 16-character App Password
SMTP_SECURE="false"
EMAIL_FROM_ADDRESS="Retu Foods <orders@retufoods.com>"
EMAIL_ADMIN_NOTIFY="restoreme@retufoods.com"
```

#### Option B: Hostinger / Custom Domain Webmail
```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="465"
SMTP_USER="orders@retufoods.com"
SMTP_PASS="your_email_password"
SMTP_SECURE="true"
EMAIL_FROM_ADDRESS="Retu Foods <orders@retufoods.com>"
EMAIL_ADMIN_NOTIFY="restoreme@retufoods.com"
```

#### Option C: Amazon SES / SendGrid / Brevo
```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp-relay.brevo.com"   # Or email-smtp.ap-south-1.amazonaws.com
SMTP_PORT="587"
SMTP_USER="your_smtp_username"
SMTP_PASS="your_smtp_password"
SMTP_SECURE="false"
EMAIL_FROM_ADDRESS="orders@retufoods.com"
EMAIL_ADMIN_NOTIFY="restoreme@retufoods.com"
```

*Note: If no SMTP credentials are configured, the store uses the built-in Console Simulator, safely logging all formatted emails without crashing.*

---

## 7. Connecting Your Existing Website (Squarespace)

Your live website [https://www.retufoods.com/](https://www.retufoods.com/) remains completely untouched as your main marketing site. Customers who click **"Buy Now"**, **"Shop Now"**, or **"Visit Store"** on the homepage will seamlessly open this custom webstore for purchasing and checkout.

### Step 1: Deploy This Webstore to a Subdomain
Deploy this Next.js repository to Vercel, Cloudflare, or AWS under the subdomain:
**`store.retufoods.com`**

1. In your DNS provider (where `retufoods.com` is hosted, e.g. GoDaddy, Namecheap, Cloudflare, or Squarespace Domains):
   - Add a **CNAME Record**:
     - **Name:** `store`
     - **Target:** `cname.vercel-dns.com` (or your host target)
     - **TTL:** Automatic / 1 Hour
2. In your hosting platform (e.g. Vercel), add domain `store.retufoods.com`. SSL certificates are provisioned automatically.

### Step 2: Update "Buy Now" & "Shop Now" Buttons on Squarespace
On the official Squarespace website:
1. Log in to [https://www.retufoods.com/config](https://www.retufoods.com/config).
2. Go to **Pages** -> **Home** -> Click **Edit**.
3. Click on the header **"Buy Now"** / **"Shop Now"** button (or any product CTA button):
   - Click the **Gear icon (Settings)** on the button.
   - Under **Link**, select **Web Address**.
   - Enter: `https://store.retufoods.com/` (or directly to products: `https://store.retufoods.com/store/products`).
   - Check **"Open in New Tab"** (optional: preserves their session on the marketing site).
4. For specific product buttons (e.g. Alphonso Mango):
   - Link directly to `https://store.retufoods.com/store/products/mibiotics-mango`.
5. Click **Save** in Squarespace.

---

## 8. Customer Account Architecture

Guest-only checkout has been replaced with **mandatory permanent customer accounts**:
1. When checking out, new customers provide their name, email, phone, shipping address, and create a password (minimum 6 characters).
2. The account is stored permanently in the database table `customers` with salted scrypt hashing.
3. Every order is permanently linked to the customer via `customer_id`.
4. Returning customers can log in at `/store/account/login` or directly on the checkout screen.
5. In the customer portal (`/store/account/orders`), customers can:
   - View their lifetime order history.
   - Check real-time cold-chain courier tracking numbers.
   - Download official GST Tax Invoices anytime.

---

## 9. Seller Administrative Dashboard

- **URL:** `http://localhost:3000/admin`
- **Default Login Email:** `admin@retufoods.com`
- **Default Password:** `ChangeMeInProduction2026!`
- **Features:**
  - Gross sales and reconciled paid revenue metrics.
  - Active stock inventory manager with low-stock alerts.
  - Order fulfillment state updater (Pending -> Confirmed -> Shipped -> Delivered).
  - Courier tracking carrier and tracking number input.
  - Instant PDF invoice downloader.
  - Webhook simulation and reconciliation inspector.
