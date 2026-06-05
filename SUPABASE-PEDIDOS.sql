create table if not exists public.skbc_merch_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'seen', 'contacted', 'payment_pending', 'paid', 'delivered', 'cancelled')),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  payment_method text,
  custom_reference text,
  custom_details text,
  comments text,
  items jsonb not null default '[]'::jsonb,
  total_estimated numeric default 0,
  page_lang text default 'es',
  source text default 'website'
);

alter table public.skbc_merch_orders enable row level security;

drop policy if exists "Public can submit merch orders" on public.skbc_merch_orders;
create policy "Public can submit merch orders"
on public.skbc_merch_orders
for insert
to anon
with check (status = 'pending');

drop policy if exists "Authenticated can read merch orders" on public.skbc_merch_orders;
create policy "Authenticated can read merch orders"
on public.skbc_merch_orders
for select
to authenticated
using (true);

drop policy if exists "Authenticated can update merch orders" on public.skbc_merch_orders;
create policy "Authenticated can update merch orders"
on public.skbc_merch_orders
for update
to authenticated
using (true)
with check (status in ('pending', 'seen', 'contacted', 'payment_pending', 'paid', 'delivered', 'cancelled'));
