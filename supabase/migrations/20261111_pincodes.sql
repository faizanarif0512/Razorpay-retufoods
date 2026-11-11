-- All India PIN codes (India Post directory via data.gov.in, one row per PIN) with a per-PIN delivery switch.
-- Data imported separately (19,300 PINs); Bengaluru city 560xxx enabled at launch.
create table if not exists public.pincodes (
  pincode text primary key check (pincode ~ '^[0-9]{6}$'),
  state text not null,
  district text not null,
  office_names text,
  is_serviceable boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists pincodes_state_district_idx on public.pincodes(state, district);
create index if not exists pincodes_serviceable_idx on public.pincodes(is_serviceable) where is_serviceable;

alter table public.pincodes enable row level security;
revoke all on public.pincodes from anon, authenticated;

create or replace function public.pincode_coverage()
returns table(state text, district text, total int, serviceable int)
language sql stable security definer set search_path = public as $$
  select state, district, count(*)::int, count(*) filter (where is_serviceable)::int
  from pincodes group by state, district order by state, district
$$;
revoke all on function public.pincode_coverage() from anon, authenticated;
