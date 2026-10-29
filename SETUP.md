# Retü Foods Store: Setup Guide

This store is a Next.js app deployed on Vercel. The data lives in Supabase, and payments go through Razorpay.

```
Browser ──► Next.js pages + /api routes (Vercel) ──► Supabase Postgres (service role key, server only)
   ▲                                                        │
   └──── Supabase Realtime "store-orders" ping ◄────────────┘  (trigger on orders table)
```

- **Customers** browse products, sign in (email + password, phone OTP, or Google), check out with Razorpay, see their orders and request cancellations.
- **Admin** (`/admin`) sees all orders, stats and low stock. They can approve or reject cancellations, issue refunds, update shipping/tracking and edit prices and stock.
- **Real time:** every insert or update on `orders` triggers a broadcast. The admin dashboard and the customer's "My orders" page refetch automatically. The green **Live** dot in the admin header shows the connection is active.

---

## Step 1: Supabase project (already done)

Project `retufoods-store` (`nbunpdlzfifqtaxclduq`) already has:

- All tables, plus the seeded products and admin user (`supabase/migrations/supabase_ready_migration.sql`)
- Database functions for atomic stock reservation, restock and invoice numbers (`supabase/migrations/20261029_store_backend_functions.sql`)
- A realtime broadcast trigger on orders (`supabase/migrations/20261029_realtime_order_broadcast.sql`)

Row Level Security is on for every table, with no public policies. Only the server, using the service role key, can read or write data.

**Rotate the secret key.** It was shared in a chat. In the Supabase dashboard, open **Project Settings → API Keys**, create a new secret key and delete the old one. Then put the new key in `.env.local` and in Vercel.

## Step 2: Customer sign-in methods

Email + password works with no extra setup. Phone and Google need these one-time steps.

### 2a. Site URLs (required for Google)
1. Open Supabase → **Authentication → URL Configuration**.
2. Set **Site URL** to your live URL, e.g. `https://razorpay-retufoods.vercel.app`.
3. Under **Redirect URLs**, add:
   - `https://razorpay-retufoods.vercel.app/store/account/login`
   - `http://localhost:3000/store/account/login`

### 2b. Google sign-in
1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**.
2. Click **Create credentials → OAuth client ID** and choose type **Web application**.
3. Fill in these fields:
   - **Authorized JavaScript origins:** your site URL and `http://localhost:3000`
   - **Authorized redirect URIs:** `https://nbunpdlzfifqtaxclduq.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client Secret**.
5. In Supabase → **Authentication → Providers → Google**, enable it, paste both values and save.
6. Optional, for Google One Tap: set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to the same Client ID.

### 2c. Phone OTP sign-in
Supabase sends the SMS through a provider you connect.

1. Open Supabase → **Authentication → Providers → Phone** and enable it.
2. Pick an SMS provider (Twilio, MessageBird, Vonage or Textlocal), sign up with them and paste in their credentials.
   - **India:** commercial SMS needs DLT registration of your sender ID and message template, through the provider or your telecom operator. Twilio Verify is the quickest way to start.
3. Optional: under **Authentication → Rate Limits**, keep the SMS limits low to prevent abuse.

Until a provider is connected, the phone tab shows an error. Email and Google keep working.

## Step 3: Razorpay

1. In the [Razorpay Dashboard](https://dashboard.razorpay.com/), switch to **Test Mode**.
2. Open **Account & Settings → API Keys → Generate Test Key** and copy both values into these variables:
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` = `rzp_test_…`
   - `RAZORPAY_KEY_SECRET` = the secret
3. Open **Account & Settings → Webhooks → Add New Webhook** and fill in:
   - **URL:** `https://<your-site>/api/webhooks/razorpay`
   - **Secret:** any long random string. Set `RAZORPAY_WEBHOOK_SECRET` to the same string.
   - **Events:** `payment.captured`, `order.paid`, `payment.failed`, `refund.created`, `refund.processed`
4. Webhooks can't reach `localhost`. Locally, payments are confirmed by the checkout page itself. The webhook is a backup for customers who close the tab after paying.

For test payments, use card `4111 1111 1111 1111` with any future expiry and any CVV. You can also use UPI ID `success@razorpay`.

When going live, generate **Live** keys and a new live-mode webhook, and replace the three Razorpay variables.

## Step 4: Environment variables

`.env.example` lists every variable. Set them in `.env.local` for local runs. In Vercel, add them under **Project → Settings → Environment Variables**.

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nbunpdlzfifqtaxclduq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API Keys → publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys → secret key (**server only, never share**) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Step 3 |
| `ADMIN_SESSION_SECRET`, `CUSTOMER_SESSION_SECRET` | Any two different random strings, 32+ characters |
| `NEXT_PUBLIC_STORE_URL` | Your live site URL |
| `SMTP_*`, `EMAIL_*` | Gmail app password or another SMTP provider, for order emails |
| `INVOICE_*` | Your company details, printed on GST invoices |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Optional (Step 2b) |

To generate a random secret, run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 5: Run locally

```bash
npm install
```

```bash
npm run dev
```

Then open:

- Store: http://localhost:3000/store
- Customer account: http://localhost:3000/store/account/login
- Admin: http://localhost:3000/admin/login, as `admin@retufoods.com` with the password from `ADMIN_INITIAL_PASSWORD`

## Step 6: Deploy

1. Push to `main`. Vercel builds and deploys automatically.
2. Make sure every variable from Step 4 is set in Vercel, then redeploy.
3. Update the Supabase Site URL (Step 2a) and the Razorpay webhook URL (Step 3) to the live domain.

## Step 7: Test the whole flow

1. Open `/admin` in one window and leave it open. Check that the **Live** dot is green.
2. In another window, register a customer, add a product to the cart and check out with a test card.
3. The new order should appear on the admin dashboard within a second or two, without a refresh.
4. As the customer, open **My orders** and request a cancellation. The admin sees a cancellation request banner appear.
5. As admin, approve it. That refunds through Razorpay and restocks. The customer's page updates live.
6. Mark another paid order as **Shipped** with a tracking number. The customer sees it update.

## Security notes

- The browser never talks to the database directly. All reads and writes go through `/api` routes that check the customer or admin session.
- Phone and Google sign-in are verified by Supabase Auth. The server only accepts a Supabase access token, which it checks with Supabase, and never trusts an email or phone sent by the browser.
- Customers can only see, cancel or download invoices for their own orders.
- To change the admin password, update `admin_users.password_hash` and `password_salt` (scrypt, 64-byte key, hex) in Supabase. You can also ask your developer to add a change-password screen.
