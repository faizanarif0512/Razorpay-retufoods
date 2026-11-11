-- Multiple saved addresses per customer, and an audit trail of order address changes (applied 2026-11-11)
create table if not exists public.customer_addresses (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  label text not null default 'Home',
  name text not null,
  phone text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  postal_code text not null check (postal_code ~ '^[0-9]{6}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_addresses_customer_idx on public.customer_addresses(customer_id);
create unique index if not exists customer_addresses_one_default on public.customer_addresses(customer_id) where is_default;

create table if not exists public.order_address_changes (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  changed_by text not null,
  old_address jsonb not null,
  new_address jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists order_address_changes_order_idx on public.order_address_changes(order_id);

alter table public.customer_addresses enable row level security;
alter table public.order_address_changes enable row level security;
revoke all on public.customer_addresses, public.order_address_changes from anon, authenticated;

insert into public.customer_addresses (id, customer_id, label, name, phone, address_line1, address_line2, city, state, postal_code, is_default)
select 'addr_' || c.id, c.id, 'Home', c.name, coalesce(c.phone, ''), c.address_line1, c.address_line2, c.city, c.state, c.postal_code, true
from public.customers c
where c.address_line1 is not null and c.city is not null and c.state is not null and c.postal_code ~ '^[0-9]{6}$'
on conflict (id) do nothing;
