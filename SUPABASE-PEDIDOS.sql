-- DEPLOYMENT BLOCKER: DO NOT DEPLOY until Task 4 atomically switches the storefront from direct inserts to this RPC.

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

create table if not exists public.skbc_merch_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (btrim(name) <> ''),
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skbc_merch_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.skbc_merch_products(id) on delete cascade,
  sku text not null unique check (btrim(sku) <> ''),
  name text not null check (btrim(name) <> ''),
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skbc_order_campaigns (
  id uuid primary key default gen_random_uuid(),
  period_start date not null unique,
  period_end date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end = (period_start + interval '1 month - 1 day')::date),
  check (extract(day from period_start) = 16)
);

create table if not exists public.skbc_merch_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.skbc_merch_orders
  add column if not exists order_number text,
  add column if not exists idempotency_key uuid,
  add column if not exists campaign_id uuid references public.skbc_order_campaigns(id),
  add column if not exists member_reference text,
  add column if not exists total_cents integer,
  add column if not exists request_hash text;

create unique index if not exists skbc_merch_orders_order_number_uidx
  on public.skbc_merch_orders (order_number) where order_number is not null;
create unique index if not exists skbc_merch_orders_idempotency_key_uidx
  on public.skbc_merch_orders (idempotency_key) where idempotency_key is not null;
create index if not exists skbc_merch_orders_campaign_created_idx
  on public.skbc_merch_orders (campaign_id, created_at desc);

create table if not exists public.skbc_merch_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.skbc_merch_orders(id) on delete cascade,
  variant_id uuid not null references public.skbc_merch_variants(id),
  product_name text not null,
  variant_name text not null,
  sku text not null,
  quantity integer not null check (quantity between 1 and 10),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer generated always as (quantity * unit_price_cents) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.skbc_order_communications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.skbc_merch_orders(id) on delete cascade,
  channel text not null check (channel in ('email', 'phone', 'whatsapp', 'in_person', 'internal')),
  direction text not null default 'outbound' check (direction in ('inbound', 'outbound', 'internal')),
  subject text,
  body text not null check (btrim(body) <> ''),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists skbc_merch_variants_product_sort_idx
  on public.skbc_merch_variants (product_id, sort_order, name);
create index if not exists skbc_merch_order_items_order_idx
  on public.skbc_merch_order_items (order_id);
create index if not exists skbc_merch_order_items_variant_idx
  on public.skbc_merch_order_items (variant_id);
create index if not exists skbc_order_communications_order_created_idx
  on public.skbc_order_communications (order_id, created_at desc);
create index if not exists skbc_merch_admins_created_by_idx
  on public.skbc_merch_admins (created_by);

create or replace function public.set_skbc_merch_updated_at()
returns trigger language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.is_skbc_merch_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
    from public.skbc_merch_admins admin_member
    where admin_member.user_id = (select auth.uid())
  );
$$;

create or replace function public.skbc_merch_campaign_period(p_at timestamptz)
returns table (period_start date, period_end date)
language sql
stable
set search_path = pg_catalog, public, pg_temp
as $$
  with madrid_day as (
    select (p_at at time zone 'Europe/Madrid')::date as day
  ), starts as (
    select case
      when extract(day from day) >= 16
        then make_date(extract(year from day)::integer, extract(month from day)::integer, 16)
      else (date_trunc('month', day) - interval '1 month' + interval '15 days')::date
    end as period_start
    from madrid_day
  )
  select starts.period_start,
         (starts.period_start + interval '1 month - 1 day')::date as period_end
  from starts;
$$;

drop trigger if exists set_skbc_merch_orders_updated_at on public.skbc_merch_orders;
create trigger set_skbc_merch_orders_updated_at before update on public.skbc_merch_orders
for each row execute function public.set_skbc_merch_updated_at();
drop trigger if exists set_skbc_merch_products_updated_at on public.skbc_merch_products;
create trigger set_skbc_merch_products_updated_at before update on public.skbc_merch_products
for each row execute function public.set_skbc_merch_updated_at();
drop trigger if exists set_skbc_merch_variants_updated_at on public.skbc_merch_variants;
create trigger set_skbc_merch_variants_updated_at before update on public.skbc_merch_variants
for each row execute function public.set_skbc_merch_updated_at();
drop trigger if exists set_skbc_order_campaigns_updated_at on public.skbc_order_campaigns;
create trigger set_skbc_order_campaigns_updated_at before update on public.skbc_order_campaigns
for each row execute function public.set_skbc_merch_updated_at();

alter table public.skbc_merch_orders enable row level security;
alter table public.skbc_merch_products enable row level security;
alter table public.skbc_merch_variants enable row level security;
alter table public.skbc_order_campaigns enable row level security;
alter table public.skbc_merch_order_items enable row level security;
alter table public.skbc_order_communications enable row level security;
alter table public.skbc_merch_admins enable row level security;

drop policy if exists "Public can submit merch orders" on public.skbc_merch_orders;
drop policy if exists "Authenticated can read merch orders" on public.skbc_merch_orders;
drop policy if exists "Authenticated can update merch orders" on public.skbc_merch_orders;
drop policy if exists "Authenticated can delete merch orders" on public.skbc_merch_orders;
drop policy if exists "Authenticated can manage merch orders" on public.skbc_merch_orders;
drop policy if exists "Authenticated can manage merch products" on public.skbc_merch_products;
drop policy if exists "Authenticated can manage merch variants" on public.skbc_merch_variants;
drop policy if exists "Authenticated can manage order campaigns" on public.skbc_order_campaigns;
drop policy if exists "Authenticated can manage merch order items" on public.skbc_merch_order_items;
drop policy if exists "Authenticated can manage order communications" on public.skbc_order_communications;
drop policy if exists "Admins can read merch orders" on public.skbc_merch_orders;
drop policy if exists "Admins can update merch orders" on public.skbc_merch_orders;
drop policy if exists "Admins can delete merch orders" on public.skbc_merch_orders;
drop policy if exists "Admins can manage merch products" on public.skbc_merch_products;
drop policy if exists "Admins can manage merch variants" on public.skbc_merch_variants;
drop policy if exists "Admins can manage order campaigns" on public.skbc_order_campaigns;
drop policy if exists "Admins can read merch order items" on public.skbc_merch_order_items;
drop policy if exists "Admins can update merch order items" on public.skbc_merch_order_items;
drop policy if exists "Admins can delete merch order items" on public.skbc_merch_order_items;
drop policy if exists "Admins can manage order communications" on public.skbc_order_communications;

drop policy if exists "Public can read active merch products" on public.skbc_merch_products;
create policy "Public can read active merch products" on public.skbc_merch_products
for select to anon, authenticated using (is_active);
drop policy if exists "Public can read active merch variants" on public.skbc_merch_variants;
create policy "Public can read active merch variants" on public.skbc_merch_variants
for select to anon, authenticated using (
  is_active and exists (
    select 1 from public.skbc_merch_products product
    where product.id = product_id and product.is_active
  )
);

create policy "Admins can read merch orders" on public.skbc_merch_orders
for select to authenticated using (public.is_skbc_merch_admin());
create policy "Admins can update merch orders" on public.skbc_merch_orders
for update to authenticated using (public.is_skbc_merch_admin())
with check (public.is_skbc_merch_admin());
create policy "Admins can delete merch orders" on public.skbc_merch_orders
for delete to authenticated using (public.is_skbc_merch_admin());

create policy "Admins can manage merch products" on public.skbc_merch_products
for all to authenticated using (public.is_skbc_merch_admin())
with check (public.is_skbc_merch_admin());
create policy "Admins can manage merch variants" on public.skbc_merch_variants
for all to authenticated using (public.is_skbc_merch_admin())
with check (public.is_skbc_merch_admin());
create policy "Admins can manage order campaigns" on public.skbc_order_campaigns
for all to authenticated using (public.is_skbc_merch_admin())
with check (public.is_skbc_merch_admin());
create policy "Admins can read merch order items" on public.skbc_merch_order_items
for select to authenticated using (public.is_skbc_merch_admin());
create policy "Admins can update merch order items" on public.skbc_merch_order_items
for update to authenticated using (public.is_skbc_merch_admin())
with check (public.is_skbc_merch_admin());
create policy "Admins can delete merch order items" on public.skbc_merch_order_items
for delete to authenticated using (public.is_skbc_merch_admin());
create policy "Admins can manage order communications" on public.skbc_order_communications
for all to authenticated using (public.is_skbc_merch_admin())
with check (public.is_skbc_merch_admin());

create or replace function public.submit_skbc_merch_order(
  p_idempotency_key uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_member_reference text,
  p_comments text,
  p_page_lang text,
  p_items jsonb
)
returns table (order_id uuid, order_number text, total_cents integer)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_period_start date;
  v_period_end date;
  v_campaign_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_total_cents integer := 0;
  v_item jsonb;
  v_quantity integer;
  v_variant_id uuid;
  v_variant record;
  v_priced_items jsonb := '[]'::jsonb;
  v_request_payload jsonb;
  v_request_hash text;
  v_existing_request_hash text;
begin
  if p_idempotency_key is null then
    raise exception 'idempotency key is required' using errcode = '22023';
  end if;

  v_request_payload := jsonb_build_object(
    'customer_name', btrim(coalesce(p_customer_name, '')),
    'customer_email', lower(btrim(coalesce(p_customer_email, ''))),
    'customer_phone', btrim(coalesce(p_customer_phone, '')),
    'member_reference', nullif(btrim(p_member_reference), ''),
    'comments', nullif(btrim(p_comments), ''),
    'page_lang', lower(coalesce(nullif(btrim(p_page_lang), ''), 'es')),
    'items', case
      when jsonb_typeof(p_items) = 'array' then coalesce((
        select jsonb_agg(canonical_item order by canonical_item::text)
        from (
          select jsonb_build_object(
            'variant_id', lower(btrim(coalesce(item ->> 'variant_id', ''))),
            'quantity', case
              when coalesce(item ->> 'quantity', '') ~ '^[0-9]+$'
                then ((item ->> 'quantity')::numeric)::text
              else item ->> 'quantity'
            end
          ) as canonical_item
          from jsonb_array_elements(p_items) item
        ) normalized_items
      ), '[]'::jsonb)
      else p_items
    end
  );
  v_request_hash := encode(sha256(convert_to(v_request_payload::text, 'UTF8')), 'hex');

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));
  select existing.id, existing.order_number, existing.total_cents, existing.request_hash
    into v_order_id, v_order_number, v_total_cents, v_existing_request_hash
  from public.skbc_merch_orders existing
  where existing.idempotency_key = p_idempotency_key;
  if found then
    if v_existing_request_hash is distinct from v_request_hash then
      raise exception 'idempotency key was already used with a different request'
        using errcode = '23505';
    end if;
    return query select v_order_id, v_order_number, v_total_cents;
    return;
  end if;

  if nullif(btrim(p_customer_name), '') is null
     or nullif(btrim(p_customer_phone), '') is null then
    raise exception 'customer name and phone are required' using errcode = '22023';
  end if;
  if nullif(btrim(p_customer_email), '') is null
     or btrim(p_customer_email) !~* '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)+$' then
    raise exception 'a valid customer email is required' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'items must contain between 1 and 30 lines' using errcode = '22023';
  end if;

  select period.period_start, period.period_end
    into v_period_start, v_period_end
  from public.skbc_merch_campaign_period(statement_timestamp()) period;

  insert into public.skbc_order_campaigns (period_start, period_end, status)
  values (v_period_start, v_period_end, 'open')
  on conflict (period_start) do nothing;
  select campaign.id into v_campaign_id
  from public.skbc_order_campaigns campaign
  where campaign.period_start = v_period_start
    and campaign.period_end = v_period_end
    and campaign.status = 'open'
  for update;
  if v_campaign_id is null then
    raise exception 'the current material-order campaign is closed' using errcode = 'P0001';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
    order by value ->> 'variant_id'
  loop
    if jsonb_typeof(v_item) <> 'object'
       or coalesce(v_item ->> 'variant_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or coalesce(v_item ->> 'quantity', '') !~ '^[0-9]+$' then
      raise exception 'each item requires a valid variant_id and integer quantity' using errcode = '22023';
    end if;
    v_variant_id := (v_item ->> 'variant_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity < 1 or v_quantity > 10 then
      raise exception 'item quantity must be between 1 and 10' using errcode = '22023';
    end if;

    select variant.id, variant.sku, variant.name as variant_name,
           variant.unit_price_cents, product.name as product_name
      into v_variant
    from public.skbc_merch_variants variant
    join public.skbc_merch_products product on product.id = variant.product_id
    where variant.id = v_variant_id and variant.is_active and product.is_active
    for update of variant;
    if not found then
      raise exception 'material variant % is invalid or inactive', v_variant_id using errcode = '22023';
    end if;

    v_total_cents := v_total_cents + (v_quantity * v_variant.unit_price_cents);
    v_priced_items := v_priced_items || jsonb_build_array(jsonb_build_object(
      'variant_id', v_variant.id, 'sku', v_variant.sku,
      'product_name', v_variant.product_name, 'variant_name', v_variant.variant_name,
      'quantity', v_quantity, 'unit_price_cents', v_variant.unit_price_cents,
      'line_total_cents', v_quantity * v_variant.unit_price_cents
    ));
  end loop;

  v_order_id := gen_random_uuid();
  v_order_number := 'SKBC-' || to_char(v_period_start, 'YYYYMM') || '-'
    || upper(substr(replace(v_order_id::text, '-', ''), 1, 8));
  insert into public.skbc_merch_orders (
    id, order_number, idempotency_key, request_hash, campaign_id, customer_name,
    customer_email, customer_phone, member_reference, custom_reference,
    comments, items, total_cents, total_estimated, page_lang, source
  ) values (
    v_order_id, v_order_number, p_idempotency_key, v_request_hash, v_campaign_id, btrim(p_customer_name),
    nullif(btrim(p_customer_email), ''), btrim(p_customer_phone),
    nullif(btrim(p_member_reference), ''), nullif(btrim(p_member_reference), ''),
    nullif(btrim(p_comments), ''), v_priced_items, v_total_cents,
    v_total_cents / 100.0, coalesce(nullif(btrim(p_page_lang), ''), 'es'), 'website'
  );

  insert into public.skbc_merch_order_items (
    order_id, variant_id, product_name, variant_name, sku, quantity, unit_price_cents
  )
  select v_order_id, (priced ->> 'variant_id')::uuid, priced ->> 'product_name',
         priced ->> 'variant_name', priced ->> 'sku',
         (priced ->> 'quantity')::integer, (priced ->> 'unit_price_cents')::integer
  from jsonb_array_elements(v_priced_items) priced;

  return query select v_order_id, v_order_number, v_total_cents;
end;
$$;

revoke all on function public.set_skbc_merch_updated_at() from public;
revoke all on function public.is_skbc_merch_admin() from public;
revoke all on function public.skbc_merch_campaign_period(timestamptz) from public;
revoke all on function public.submit_skbc_merch_order(uuid, text, text, text, text, text, text, jsonb) from public;
revoke all privileges on table public.skbc_merch_orders from public;
revoke all privileges on table public.skbc_merch_products from public;
revoke all privileges on table public.skbc_merch_variants from public;
revoke all privileges on table public.skbc_order_campaigns from public;
revoke all privileges on table public.skbc_merch_order_items from public;
revoke all privileges on table public.skbc_order_communications from public;
revoke all privileges on table public.skbc_merch_admins from public;
revoke all privileges on table public.skbc_merch_orders from anon;
revoke all privileges on table public.skbc_merch_products from anon;
revoke all privileges on table public.skbc_merch_variants from anon;
revoke all privileges on table public.skbc_order_campaigns from anon;
revoke all privileges on table public.skbc_merch_order_items from anon;
revoke all privileges on table public.skbc_order_communications from anon;
revoke all privileges on table public.skbc_merch_admins from anon;
revoke all privileges on table public.skbc_merch_orders from authenticated;
revoke all privileges on table public.skbc_merch_products from authenticated;
revoke all privileges on table public.skbc_merch_variants from authenticated;
revoke all privileges on table public.skbc_order_campaigns from authenticated;
revoke all privileges on table public.skbc_merch_order_items from authenticated;
revoke all privileges on table public.skbc_order_communications from authenticated;
revoke all privileges on table public.skbc_merch_admins from authenticated;
grant select on table public.skbc_merch_products, public.skbc_merch_variants to anon;
grant execute on function public.submit_skbc_merch_order(uuid, text, text, text, text, text, text, jsonb) to anon;

grant execute on function public.is_skbc_merch_admin() to authenticated;
grant select on table public.skbc_merch_products, public.skbc_merch_variants to authenticated;
grant insert, update, delete on table public.skbc_merch_products, public.skbc_merch_variants to authenticated;
grant select, update, delete on table public.skbc_merch_orders, public.skbc_merch_order_items to authenticated;
grant select, insert, update, delete on table public.skbc_order_campaigns, public.skbc_order_communications to authenticated;

grant all privileges on table
  public.skbc_merch_admins,
  public.skbc_merch_orders,
  public.skbc_merch_products,
  public.skbc_merch_variants,
  public.skbc_order_campaigns,
  public.skbc_merch_order_items,
  public.skbc_order_communications
to service_role;
