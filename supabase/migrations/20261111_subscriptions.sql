-- Subscriptions: plans, customer subscriptions, and order links (applied to retufoods-store on 2026-11-11)
create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  description text,
  interval_weeks int not null check (interval_weeks > 0),
  variant_id text not null references public.product_variants(id),
  packs_per_cycle int not null check (packs_per_cycle > 0),
  price_paise int not null check (price_paise > 0),
  shipping_paise int not null default 0 check (shipping_paise >= 0),
  total_cycles int not null default 52,
  razorpay_plan_id text,
  razorpay_plan_amount_paise int,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id text primary key,
  customer_id text not null references public.customers(id),
  plan_id text not null references public.subscription_plans(id),
  razorpay_subscription_id text unique,
  status text not null default 'created'
    check (status in ('created','authenticated','active','pending','halted','paused','cancelled','completed','expired')),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address_line1 text not null,
  shipping_address_line2 text,
  shipping_city text not null,
  shipping_state text not null,
  shipping_postal_code text not null,
  shipping_country text not null default 'India',
  paid_count int not null default 0,
  current_start timestamptz,
  current_end timestamptz,
  next_charge_at timestamptz,
  last_payment_failed_at timestamptz,
  last_failure_reason text,
  cancel_at_cycle_end boolean not null default false,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_customer_idx on public.subscriptions(customer_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);

alter table public.orders add column if not exists order_type text not null default 'one_time'
  check (order_type in ('one_time','trial','subscription'));
alter table public.orders add column if not exists subscription_id text references public.subscriptions(id);
create index if not exists orders_subscription_idx on public.orders(subscription_id);
create unique index if not exists orders_razorpay_payment_id_key on public.orders(razorpay_payment_id) where razorpay_payment_id is not null;

alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
revoke all on public.subscription_plans, public.subscriptions from anon, authenticated;

-- Launch catalogue: six-packs at the ₹1,110 trial price; larger one-off packs replaced by subscriptions
update public.product_variants
   set price_paise = 111000,
       compare_at_price_paise = greatest(coalesce(compare_at_price_paise, 0), 111000),
       updated_at = now()
 where pack_size = 6;
update public.product_variants set is_active = false, updated_at = now() where pack_size in (12, 24);

insert into public.subscription_plans (id, name, description, interval_weeks, variant_id, packs_per_cycle, price_paise, shipping_paise, total_cycles, sort_order)
values
  ('plan_2wk', '2-Week Subscription', 'Two Lychee + Mango six-packs delivered together every 2 weeks', 2, 'var_duo_6p', 2, 222000, 0, 26, 1),
  ('plan_4wk', '4-Week Subscription', 'Four Lychee + Mango six-packs delivered together every 4 weeks, free shipping', 4, 'var_duo_6p', 4, 444000, 0, 13, 2)
on conflict (id) do nothing;
