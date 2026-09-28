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
  brand text,
  supplier_reference text not null unique,
  category text,
  recommended_level text,
  weight text,
  image_url text,
  source_url text,
  image_attribution text,
  catalog_owner text check (catalog_owner is null or btrim(catalog_owner) <> ''),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
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
  supplier_reference text not null,
  cost_cents integer not null check (cost_cents >= 0),
  margin_cents integer not null,
  price_cents integer not null check (price_cents >= 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  cost_basis text not null check (btrim(cost_basis) <> ''),
  promotion_price_cents integer check (promotion_price_cents is null or promotion_price_cents >= 0),
  promotion_starts_at timestamptz,
  promotion_ends_at timestamptz,
  promotion_is_active boolean not null default false,
  catalog_owner text check (catalog_owner is null or btrim(catalog_owner) <> ''),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price_cents = cost_cents + margin_cents),
  check (unit_price_cents = price_cents),
  check (promotion_ends_at is null or promotion_starts_at is null or promotion_ends_at >= promotion_starts_at),
  check (not promotion_is_active or promotion_price_cents is not null)
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
  add column if not exists request_hash text,
  add column if not exists frozen_at timestamptz;

alter table public.skbc_merch_products
  add column if not exists brand text,
  add column if not exists supplier_reference text,
  add column if not exists category text,
  add column if not exists recommended_level text,
  add column if not exists weight text,
  add column if not exists source_url text,
  add column if not exists image_attribution text,
  add column if not exists catalog_owner text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.skbc_merch_products
set supplier_reference = slug
where supplier_reference is null;
alter table public.skbc_merch_products alter column supplier_reference set not null;
create unique index if not exists skbc_merch_products_supplier_reference_uidx
  on public.skbc_merch_products (supplier_reference);

alter table public.skbc_merch_variants
  add column if not exists supplier_reference text,
  add column if not exists cost_cents integer,
  add column if not exists margin_cents integer,
  add column if not exists price_cents integer,
  add column if not exists cost_basis text,
  add column if not exists promotion_price_cents integer,
  add column if not exists promotion_starts_at timestamptz,
  add column if not exists promotion_ends_at timestamptz,
  add column if not exists promotion_is_active boolean not null default false,
  add column if not exists catalog_owner text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.skbc_merch_variants
set supplier_reference = coalesce(supplier_reference, sku),
    price_cents = coalesce(price_cents, unit_price_cents),
    cost_cents = coalesce(cost_cents, unit_price_cents),
    margin_cents = coalesce(margin_cents, 0),
    cost_basis = coalesce(cost_basis, 'Legacy public price; supplier cost not recorded'),
    metadata = coalesce(metadata, '{}'::jsonb);

alter table public.skbc_merch_variants
  alter column supplier_reference set not null,
  alter column cost_cents set not null,
  alter column margin_cents set not null,
  alter column price_cents set not null,
  alter column cost_basis set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'skbc_merch_products_metadata_object') then
    alter table public.skbc_merch_products add constraint skbc_merch_products_metadata_object
      check (jsonb_typeof(metadata) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'skbc_merch_products_catalog_owner_valid') then
    alter table public.skbc_merch_products add constraint skbc_merch_products_catalog_owner_valid
      check (catalog_owner is null or btrim(catalog_owner) <> '');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'skbc_merch_variants_pricing_valid') then
    alter table public.skbc_merch_variants add constraint skbc_merch_variants_pricing_valid
      check (cost_cents >= 0 and price_cents >= 0 and price_cents = cost_cents + margin_cents and unit_price_cents = price_cents);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'skbc_merch_variants_promotion_valid') then
    alter table public.skbc_merch_variants add constraint skbc_merch_variants_promotion_valid
      check (
        (promotion_price_cents is null or promotion_price_cents >= 0)
        and (promotion_ends_at is null or promotion_starts_at is null or promotion_ends_at >= promotion_starts_at)
        and (not promotion_is_active or promotion_price_cents is not null)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'skbc_merch_variants_metadata_object') then
    alter table public.skbc_merch_variants add constraint skbc_merch_variants_metadata_object
      check (jsonb_typeof(metadata) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'skbc_merch_variants_catalog_owner_valid') then
    alter table public.skbc_merch_variants add constraint skbc_merch_variants_catalog_owner_valid
      check (catalog_owner is null or btrim(catalog_owner) <> '');
  end if;
end;
$$;

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
  supplier_reference text not null,
  size text not null,
  recipient text,
  quantity integer not null check (quantity between 1 and 10),
  cost_cents integer not null check (cost_cents >= 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer generated always as (quantity * unit_price_cents) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.skbc_order_communications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.skbc_merch_orders(id) on delete cascade,
  channel text not null check (channel in ('email', 'phone', 'whatsapp', 'in_person', 'internal')),
  direction text not null default 'outbound' check (direction in ('inbound', 'outbound', 'internal')),
  status text not null default 'prepared' check (status in ('prepared', 'sending', 'sent', 'failed', 'delivered_unconfirmed')),
  recipient_name text,
  recipient_email text,
  snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot) = 'object'),
  subject text,
  body text check (body is null or btrim(body) <> ''),
  prepared_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  failure_message text,
  attempt_token uuid,
  attempt_started_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.skbc_order_communication_attempts (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.skbc_order_communications(id) on delete cascade,
  campaign_id uuid not null references public.skbc_order_campaigns(id),
  attempt_token uuid not null unique,
  forced boolean not null default false,
  outcome text not null default 'sending' check (outcome in (
    'sending', 'delivered', 'smtp_failed', 'delivered_unconfirmed',
    'delivered_reconciled', 'not_delivered_reconciled'
  )),
  started_at timestamptz not null default now(),
  smtp_accepted_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.skbc_merch_order_items
  add column if not exists supplier_reference text,
  add column if not exists size text,
  add column if not exists recipient text,
  add column if not exists cost_cents integer;

update public.skbc_merch_order_items item
set supplier_reference = coalesce(item.supplier_reference, variant.supplier_reference),
    size = coalesce(item.size, variant.attributes ->> 'size', item.variant_name),
    cost_cents = coalesce(item.cost_cents, variant.cost_cents)
from public.skbc_merch_variants variant
where variant.id = item.variant_id
  and (item.supplier_reference is null or item.size is null or item.cost_cents is null);

alter table public.skbc_merch_order_items
  alter column supplier_reference set not null,
  alter column size set not null,
  alter column cost_cents set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'skbc_merch_order_items_recipient_valid') then
    alter table public.skbc_merch_order_items add constraint skbc_merch_order_items_recipient_valid
      check (recipient is null or (btrim(recipient) <> '' and char_length(btrim(recipient)) <= 120));
  end if;
end;
$$;

create or replace view public.skbc_merch_catalog_public as
select
  product.id as product_id,
  product.name as product_name,
  product.description,
  product.brand,
  product.supplier_reference as product_supplier_reference,
  product.category,
  product.recommended_level,
  product.weight,
  product.image_url,
  case when product.source_url ~* '^https://' then product.source_url end as source_url,
  product.image_attribution,
  product.sort_order as product_sort_order,
  variant.id as variant_id,
  variant.sku,
  variant.name as variant_name,
  jsonb_strip_nulls(jsonb_build_object('size', variant.attributes ->> 'size')) as attributes,
  variant.price_cents,
  coalesce(
    case
      when variant.promotion_is_active
       and variant.promotion_price_cents is not null
       and (variant.promotion_starts_at is null or variant.promotion_starts_at <= statement_timestamp())
       and (variant.promotion_ends_at is null or variant.promotion_ends_at >= statement_timestamp())
      then variant.promotion_price_cents
    end,
    variant.price_cents
  ) as effective_price_cents,
  variant.sort_order as variant_sort_order
from public.skbc_merch_products product
join public.skbc_merch_variants variant on variant.product_id = product.id
where product.is_active and variant.is_active;

create or replace view public.skbc_merch_order_items_management as
select id, order_id, variant_id, product_name, variant_name, sku,
       supplier_reference, size, recipient, quantity, cost_cents,
       unit_price_cents, line_total_cents, created_at
from public.skbc_merch_order_items;

alter table public.skbc_order_communications
  add column if not exists status text not null default 'prepared',
  add column if not exists recipient_name text,
  add column if not exists recipient_email text,
  add column if not exists snapshot jsonb not null default '{}'::jsonb,
  add column if not exists prepared_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists failure_message text,
  add column if not exists attempt_token uuid,
  add column if not exists attempt_started_at timestamptz,
  alter column body drop not null;

alter table public.skbc_order_communications
  drop constraint if exists skbc_order_communications_body_check,
  drop constraint if exists skbc_order_communications_status_check,
  drop constraint if exists skbc_order_communications_status_valid;

do $$
begin
  alter table public.skbc_order_communications add constraint skbc_order_communications_status_valid
    check (status in ('prepared', 'sending', 'sent', 'failed', 'delivered_unconfirmed'));
  if not exists (select 1 from pg_constraint where conname = 'skbc_order_communications_snapshot_object') then
    alter table public.skbc_order_communications add constraint skbc_order_communications_snapshot_object
      check (jsonb_typeof(snapshot) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'skbc_order_communications_body_valid') then
    alter table public.skbc_order_communications add constraint skbc_order_communications_body_valid
      check (body is null or btrim(body) <> '');
  end if;
end;
$$;

create index if not exists skbc_merch_variants_product_sort_idx
  on public.skbc_merch_variants (product_id, sort_order, name);
create index if not exists skbc_merch_order_items_order_idx
  on public.skbc_merch_order_items (order_id);
create index if not exists skbc_merch_order_items_variant_idx
  on public.skbc_merch_order_items (variant_id);
create index if not exists skbc_order_communications_order_created_idx
  on public.skbc_order_communications (order_id, created_at desc);
create index if not exists skbc_order_communication_attempts_communication_created_idx
  on public.skbc_order_communication_attempts (communication_id, created_at desc);
create index if not exists skbc_order_communication_attempts_campaign_created_idx
  on public.skbc_order_communication_attempts (campaign_id, created_at desc);
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

create or replace function public.can_manage_skbc_merch_orders()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or public.is_skbc_merch_admin();
$$;

create or replace function public.sync_skbc_merch_variant_price()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.price_cents is null then
    new.price_cents := new.unit_price_cents;
  end if;
  if new.cost_cents is null then
    new.cost_cents := new.price_cents;
  end if;
  if new.margin_cents is null then
    new.margin_cents := new.price_cents - new.cost_cents;
  end if;
  if new.cost_basis is null then
    new.cost_basis := 'Legacy public price; supplier cost not recorded';
  end if;
  if new.supplier_reference is null then
    new.supplier_reference := new.sku;
  end if;

  -- price_cents is authoritative; a legacy-only write cannot alter public pricing.
  new.unit_price_cents := new.price_cents;
  return new;
end;
$$;

create or replace function public.protect_skbc_frozen_order()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_frozen_at timestamptz;
begin
  if tg_table_name = 'skbc_merch_orders' then
    if tg_op = 'DELETE' and old.frozen_at is not null then
      raise exception 'frozen orders cannot be deleted' using errcode = '55000';
    end if;
    if tg_op = 'UPDATE' and old.frozen_at is not null and new is distinct from old then
      raise exception 'frozen orders cannot be changed' using errcode = '55000';
    end if;
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select frozen_at into v_frozen_at
  from public.skbc_merch_orders
  where id = case when tg_op = 'DELETE' then old.order_id else new.order_id end
  for update;
  if v_frozen_at is not null then
    raise exception 'items belonging to a frozen order cannot be changed' using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
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
drop trigger if exists sync_skbc_merch_variant_price on public.skbc_merch_variants;
create trigger sync_skbc_merch_variant_price before insert or update on public.skbc_merch_variants
for each row execute function public.sync_skbc_merch_variant_price();
drop trigger if exists set_skbc_order_campaigns_updated_at on public.skbc_order_campaigns;
create trigger set_skbc_order_campaigns_updated_at before update on public.skbc_order_campaigns
for each row execute function public.set_skbc_merch_updated_at();
drop trigger if exists protect_skbc_frozen_order on public.skbc_merch_orders;
create trigger protect_skbc_frozen_order before update or delete on public.skbc_merch_orders
for each row execute function public.protect_skbc_frozen_order();
drop trigger if exists protect_skbc_frozen_order_items on public.skbc_merch_order_items;
create trigger protect_skbc_frozen_order_items before insert or update or delete on public.skbc_merch_order_items
for each row execute function public.protect_skbc_frozen_order();

alter table public.skbc_merch_orders enable row level security;
alter table public.skbc_merch_products enable row level security;
alter table public.skbc_merch_variants enable row level security;
alter table public.skbc_order_campaigns enable row level security;
alter table public.skbc_merch_order_items enable row level security;
alter table public.skbc_order_communications enable row level security;
alter table public.skbc_order_communication_attempts enable row level security;
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
drop policy if exists "Admins can read order communication attempts" on public.skbc_order_communication_attempts;

drop policy if exists "Public can read active merch products" on public.skbc_merch_products;
drop policy if exists "Public can read active merch variants" on public.skbc_merch_variants;

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
create policy "Admins can read order communication attempts" on public.skbc_order_communication_attempts
for select to authenticated using (public.is_skbc_merch_admin());

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
            'recipient', btrim(coalesce(item ->> 'recipient', '')),
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
     or nullif(btrim(p_customer_phone), '') is null
     or regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g') !~ '^[0-9]{6,}$' then
    raise exception 'customer name and a phone with at least six digits are required'
      using errcode = '22023';
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
    if nullif(btrim(v_item ->> 'recipient'), '') is null
       or char_length(btrim(v_item ->> 'recipient')) > 120 then
      raise exception 'each item requires a recipient of at most 120 characters' using errcode = '22023';
    end if;
    v_variant_id := (v_item ->> 'variant_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity < 1 or v_quantity > 10 then
      raise exception 'item quantity must be between 1 and 10' using errcode = '22023';
    end if;

    select variant.id, variant.sku, variant.name as variant_name,
           variant.supplier_reference, variant.cost_cents,
           coalesce(variant.attributes ->> 'size', variant.name) as size,
           coalesce(
             case
               when variant.promotion_is_active
                and variant.promotion_price_cents is not null
                and (variant.promotion_starts_at is null or variant.promotion_starts_at <= statement_timestamp())
                and (variant.promotion_ends_at is null or variant.promotion_ends_at >= statement_timestamp())
               then variant.promotion_price_cents
             end,
             variant.price_cents
           ) as effective_price_cents,
           product.name as product_name
      into v_variant
    from public.skbc_merch_variants variant
    join public.skbc_merch_products product on product.id = variant.product_id
    where variant.id = v_variant_id and variant.is_active and product.is_active
    for update of variant;
    if not found then
      raise exception 'material variant % is invalid or inactive', v_variant_id using errcode = '22023';
    end if;

    v_total_cents := v_total_cents + (v_quantity * v_variant.effective_price_cents);
    v_priced_items := v_priced_items || jsonb_build_array(jsonb_build_object(
      'variant_id', v_variant.id, 'sku', v_variant.sku,
      'product_name', v_variant.product_name, 'variant_name', v_variant.variant_name,
      'supplier_reference', v_variant.supplier_reference, 'size', v_variant.size,
      'recipient', btrim(v_item ->> 'recipient'),
      'cost_cents', v_variant.cost_cents, 'quantity', v_quantity,
      'unit_price_cents', v_variant.effective_price_cents,
      'line_total_cents', v_quantity * v_variant.effective_price_cents
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
    order_id, variant_id, product_name, variant_name, sku, supplier_reference,
    size, recipient, cost_cents, quantity, unit_price_cents
  )
  select v_order_id, (priced ->> 'variant_id')::uuid, priced ->> 'product_name',
         priced ->> 'variant_name', priced ->> 'sku',
         priced ->> 'supplier_reference', priced ->> 'size', priced ->> 'recipient',
         (priced ->> 'cost_cents')::integer,
         (priced ->> 'quantity')::integer, (priced ->> 'unit_price_cents')::integer
  from jsonb_array_elements(v_priced_items) priced;

  return query select v_order_id, v_order_number, v_total_cents;
end;
$$;

create or replace function public.assign_skbc_order_payment_method(
  p_order_id uuid,
  p_payment_method text
)
returns table (order_id uuid, payment_method text)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_campaign_status text;
  v_frozen_at timestamptz;
begin
  if not public.can_manage_skbc_merch_orders() then
    raise exception 'merch order management permission required' using errcode = '42501';
  end if;
  if nullif(btrim(p_payment_method), '') is null then
    raise exception 'payment method is required' using errcode = '22023';
  end if;

  select campaign.status, merch_order.frozen_at
    into v_campaign_status, v_frozen_at
  from public.skbc_merch_orders merch_order
  join public.skbc_order_campaigns campaign on campaign.id = merch_order.campaign_id
  where merch_order.id = p_order_id
  for update of merch_order, campaign;

  if not found then
    raise exception 'material order not found' using errcode = 'P0002';
  end if;
  if v_campaign_status <> 'open' or v_frozen_at is not null then
    raise exception 'payment method cannot be changed after campaign closure' using errcode = '55000';
  end if;

  update public.skbc_merch_orders
  set payment_method = btrim(p_payment_method)
  where id = p_order_id;
  return query select p_order_id, btrim(p_payment_method);
end;
$$;

create or replace function public.close_skbc_order_campaign(
  p_campaign_id uuid,
  p_expected_order_count integer,
  p_expected_communication_count integer
)
returns table (
  campaign_id uuid,
  order_count integer,
  prepared_communication_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_campaign public.skbc_order_campaigns%rowtype;
  v_order_count integer;
  v_communication_count integer;
  v_now timestamptz := statement_timestamp();
begin
  if not public.can_manage_skbc_merch_orders() then
    raise exception 'merch order management permission required' using errcode = '42501';
  end if;
  if p_expected_order_count is null or p_expected_communication_count is null
     or p_expected_order_count < 0 or p_expected_communication_count < 0 then
    raise exception 'expected counts must be non-negative' using errcode = '22023';
  end if;

  select * into v_campaign
  from public.skbc_order_campaigns campaign
  where campaign.id = p_campaign_id
  for update;
  if not found then
    raise exception 'material order campaign not found' using errcode = 'P0002';
  end if;
  if v_campaign.status <> 'open' then
    raise exception 'only an open campaign pending closure can be closed' using errcode = '55000';
  end if;
  if (v_now at time zone 'Europe/Madrid')::date <= v_campaign.period_end then
    raise exception 'campaign period has not ended in Europe/Madrid' using errcode = '55000';
  end if;

  perform 1
  from public.skbc_merch_orders merch_order
  where merch_order.campaign_id = p_campaign_id
  for update;

  select count(*)::integer,
         count(distinct lower(btrim(merch_order.customer_email))) filter (
           where merch_order.status <> 'cancelled'
             and nullif(btrim(merch_order.customer_email), '') is not null
         )::integer
    into v_order_count, v_communication_count
  from public.skbc_merch_orders merch_order
  where merch_order.campaign_id = p_campaign_id;

  if v_order_count is distinct from p_expected_order_count
     or v_communication_count is distinct from p_expected_communication_count then
    raise exception 'stale campaign confirmation counts: expected orders %, communications %; found orders %, communications %',
      p_expected_order_count, p_expected_communication_count, v_order_count, v_communication_count
      using errcode = '40001';
  end if;
  if exists (
    select 1 from public.skbc_merch_orders merch_order
    where merch_order.campaign_id = p_campaign_id
      and merch_order.status <> 'cancelled'
      and nullif(btrim(merch_order.payment_method), '') is null
  ) then
    raise exception 'every non-cancelled order requires a payment method before closure' using errcode = '23514';
  end if;

  with eligible_orders as (
    select merch_order.*, lower(btrim(merch_order.customer_email)) as normalized_email
    from public.skbc_merch_orders merch_order
    where merch_order.campaign_id = p_campaign_id
      and merch_order.status <> 'cancelled'
      and nullif(btrim(merch_order.customer_email), '') is not null
  ), grouped_families as (
    select
      eligible_order.normalized_email,
      (array_agg(eligible_order.id order by eligible_order.created_at, eligible_order.id))[1] as representative_order_id,
      (array_agg(eligible_order.customer_name order by eligible_order.created_at, eligible_order.id))[1] as recipient_name,
      sum(coalesce(eligible_order.total_cents, 0))::integer as total_cents,
      jsonb_agg(eligible_order.id order by eligible_order.created_at, eligible_order.id) as order_ids,
      jsonb_agg(coalesce(eligible_order.order_number, eligible_order.id::text) order by eligible_order.created_at, eligible_order.id) as order_numbers,
      jsonb_agg(eligible_order.payment_method order by eligible_order.created_at, eligible_order.id) as payment_methods,
      jsonb_agg(
        jsonb_build_object(
          'id', eligible_order.id,
          'order_number', eligible_order.order_number,
          'customer_name', eligible_order.customer_name,
          'customer_phone', eligible_order.customer_phone,
          'member_reference', eligible_order.member_reference,
          'payment_method', eligible_order.payment_method,
          'status', eligible_order.status,
          'total_cents', eligible_order.total_cents
        ) order by eligible_order.created_at, eligible_order.id
      ) as orders
    from eligible_orders eligible_order
    group by lower(btrim(eligible_order.customer_email)), eligible_order.normalized_email
  )
  insert into public.skbc_order_communications (
    order_id, channel, direction, status, recipient_name, recipient_email,
    snapshot, subject, body, prepared_at
  )
  select family.representative_order_id, 'email', 'outbound', 'prepared', family.recipient_name,
         family.normalized_email,
         jsonb_build_object(
           'order_ids', family.order_ids,
           'order_numbers', family.order_numbers,
           'orders', family.orders,
           'customer_name', family.recipient_name,
           'customer_email', family.normalized_email,
           'payment_methods', family.payment_methods,
           'total_cents', family.total_cents,
           'items', coalesce((
             select jsonb_agg(to_jsonb(item) order by merch_order.created_at, merch_order.id, item.created_at, item.id)
             from public.skbc_merch_orders merch_order
             join public.skbc_merch_order_items item on item.order_id = merch_order.id
             where merch_order.campaign_id = p_campaign_id
               and merch_order.status <> 'cancelled'
               and lower(btrim(merch_order.customer_email)) = family.normalized_email
           ), '[]'::jsonb),
           'campaign', jsonb_build_object(
             'id', v_campaign.id,
             'period_start', v_campaign.period_start,
             'period_end', v_campaign.period_end
           )
         ),
         'Pedido de material ' || array_to_string(array(
           select jsonb_array_elements_text(family.order_numbers)
         ), ', '),
         null,
         v_now
  from grouped_families family;

  update public.skbc_merch_orders merch_order
  set frozen_at = v_now
  where merch_order.campaign_id = p_campaign_id;
  update public.skbc_order_campaigns
  set status = 'closed'
  where id = p_campaign_id;

  return query select p_campaign_id, v_order_count, v_communication_count;
end;
$$;

create or replace function public.claim_skbc_order_communication(
  p_campaign_id uuid,
  p_communication_id uuid,
  p_attempt_token uuid,
  p_force_resend boolean,
  p_confirmed boolean
)
returns table (
  communication_id uuid,
  communication_status text,
  recipient_name text,
  recipient_email text,
  snapshot jsonb,
  attempt_token uuid,
  attempt_started_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_communication public.skbc_order_communications%rowtype;
  v_campaign_status text;
  v_started_at timestamptz := statement_timestamp();
begin
  if not public.can_manage_skbc_merch_orders() then
    raise exception 'merch order management permission required' using errcode = '42501';
  end if;
  if p_campaign_id is null or p_communication_id is null or p_attempt_token is null then
    raise exception 'campaign, communication, and attempt token are required' using errcode = '22023';
  end if;
  if p_force_resend is null then
    raise exception 'force-resend mode must be explicit' using errcode = '22023';
  end if;
  if p_confirmed is distinct from true then
    raise exception 'explicit server-side send confirmation is required' using errcode = '22023';
  end if;

  select communication, campaign.status
    into v_communication, v_campaign_status
  from public.skbc_order_communications communication
  join public.skbc_merch_orders merch_order on merch_order.id = communication.order_id
  join public.skbc_order_campaigns campaign on campaign.id = merch_order.campaign_id
  where communication.id = p_communication_id
    and merch_order.campaign_id = p_campaign_id
    and communication.channel = 'email'
    and communication.direction = 'outbound'
  for update of communication;

  if not found then
    raise exception 'communication does not belong to the exact campaign' using errcode = 'P0002';
  end if;
  if v_campaign_status <> 'closed' then
    raise exception 'campaign must be closed and reviewed before sending' using errcode = '55000';
  end if;
  if p_force_resend then
    if v_communication.status <> 'sent' then
      raise exception 'forced resend is allowed only for a confirmed sent communication' using errcode = '55000';
    end if;
  elsif v_communication.status not in ('prepared', 'failed') then
    raise exception 'communication is not retryable without manual reconciliation' using errcode = '55000';
  end if;

  insert into public.skbc_order_communication_attempts (
    communication_id, campaign_id, attempt_token, forced, outcome, started_at
  ) values (
    p_communication_id, p_campaign_id, p_attempt_token, p_force_resend, 'sending', v_started_at
  );

  update public.skbc_order_communications
  set status = 'sending',
      attempt_token = p_attempt_token,
      attempt_started_at = v_started_at,
      failed_at = null,
      failure_message = null
  where id = p_communication_id;

  return query select v_communication.id, 'sending'::text, v_communication.recipient_name,
    v_communication.recipient_email, v_communication.snapshot, p_attempt_token, v_started_at;
end;
$$;

create or replace function public.complete_skbc_order_communication_attempt(
  p_campaign_id uuid,
  p_communication_id uuid,
  p_attempt_token uuid,
  p_outcome text,
  p_error_message text default null
)
returns table (communication_id uuid, communication_status text)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_status text;
  v_forced boolean;
begin
  if not public.can_manage_skbc_merch_orders() then
    raise exception 'merch order management permission required' using errcode = '42501';
  end if;
  if p_outcome is null or p_outcome not in ('delivered', 'smtp_failed', 'delivered_unconfirmed') then
    raise exception 'invalid communication attempt outcome' using errcode = '22023';
  end if;

  select attempt.forced into v_forced
  from public.skbc_order_communications communication
  join public.skbc_merch_orders merch_order on merch_order.id = communication.order_id
  join public.skbc_order_communication_attempts attempt
    on attempt.communication_id = communication.id
   and attempt.attempt_token = p_attempt_token
   and attempt.campaign_id = p_campaign_id
  where communication.id = p_communication_id
    and merch_order.campaign_id = p_campaign_id
    and communication.status = 'sending'
    and communication.attempt_token = p_attempt_token
    and attempt.outcome = 'sending'
  for update of communication, attempt;
  if not found then
    raise exception 'active communication attempt not found' using errcode = '55000';
  end if;

  v_status := case p_outcome
    when 'delivered' then 'sent'
    when 'smtp_failed' then case when v_forced then 'sent' else 'failed' end
    else 'delivered_unconfirmed'
  end;

  update public.skbc_order_communications
  set status = v_status,
      sent_at = case when p_outcome = 'delivered' then v_now else sent_at end,
      failed_at = case when p_outcome = 'smtp_failed' then v_now else null end,
      failure_message = case when p_outcome = 'delivered' then null else left(nullif(btrim(p_error_message), ''), 240) end
  where id = p_communication_id;

  update public.skbc_order_communication_attempts
  set outcome = p_outcome,
      smtp_accepted_at = case when p_outcome in ('delivered', 'delivered_unconfirmed') then v_now else null end,
      completed_at = v_now,
      error_message = case when p_outcome = 'delivered' then null else left(nullif(btrim(p_error_message), ''), 240) end
  where attempt_token = p_attempt_token;

  return query select p_communication_id, v_status;
end;
$$;

create or replace function public.reconcile_skbc_order_communication(
  p_campaign_id uuid,
  p_communication_id uuid,
  p_attempt_token uuid,
  p_delivered boolean,
  p_confirmed boolean
)
returns table (communication_id uuid, communication_status text)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_status text;
  v_now timestamptz := statement_timestamp();
  v_forced boolean;
begin
  if not public.can_manage_skbc_merch_orders() then
    raise exception 'merch order management permission required' using errcode = '42501';
  end if;
  if p_confirmed is distinct from true or p_delivered is null then
    raise exception 'explicit reconciliation confirmation is required' using errcode = '22023';
  end if;

  select attempt.forced into v_forced
  from public.skbc_order_communications communication
  join public.skbc_merch_orders merch_order on merch_order.id = communication.order_id
  join public.skbc_order_communication_attempts attempt
    on attempt.communication_id = communication.id
   and attempt.attempt_token = p_attempt_token
   and attempt.campaign_id = p_campaign_id
  where communication.id = p_communication_id
    and merch_order.campaign_id = p_campaign_id
    and communication.attempt_token = p_attempt_token
    and communication.status in ('sending', 'delivered_unconfirmed')
  for update of communication, attempt;
  if not found then
    raise exception 'ambiguous communication attempt not found' using errcode = '55000';
  end if;

  v_status := case when p_delivered or v_forced then 'sent' else 'failed' end;
  update public.skbc_order_communications
  set status = v_status,
      sent_at = case when p_delivered then coalesce(sent_at, v_now) else sent_at end,
      failed_at = case when p_delivered or v_forced then null else v_now end,
      failure_message = case
        when p_delivered then null
        when v_forced then 'Manual reconciliation confirmed forced resend was not delivered; original delivery remains confirmed'
        else 'Manual reconciliation confirmed no delivery'
      end
  where id = p_communication_id;

  update public.skbc_order_communication_attempts
  set outcome = case when p_delivered then 'delivered_reconciled' else 'not_delivered_reconciled' end,
      smtp_accepted_at = case when p_delivered then coalesce(smtp_accepted_at, v_now) else smtp_accepted_at end,
      completed_at = v_now,
      error_message = case when p_delivered then error_message else 'Manual reconciliation confirmed no delivery' end
  where attempt_token = p_attempt_token;

  return query select p_communication_id, v_status;
end;
$$;

create or replace function public.seed_skbc_merch_catalog(
  p_products jsonb,
  p_variants jsonb,
  p_catalog_owner text
)
returns table (
  products_upserted integer,
  variants_upserted integer,
  products_deactivated integer,
  variants_deactivated integer
)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_product jsonb;
  v_variant jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_products_upserted integer := 0;
  v_variants_upserted integer := 0;
  v_products_deactivated integer := 0;
  v_variants_deactivated integer := 0;
begin
  if not public.can_manage_skbc_merch_orders() then
    raise exception 'catalog seed permission required' using errcode = '42501';
  end if;
  if nullif(btrim(p_catalog_owner), '') is null then
    raise exception 'catalog owner is required' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_catalog_owner, 0));
  if p_products is null or p_variants is null
     or jsonb_typeof(p_products) <> 'array' or jsonb_typeof(p_variants) <> 'array' then
    raise exception 'products and variants must be arrays' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_products || p_variants) entry
    where entry ->> 'catalog_owner' is distinct from p_catalog_owner
  ) then
    raise exception 'every seeded row must match the catalog owner' using errcode = '22023';
  end if;

  update public.skbc_merch_products product
  set catalog_owner = p_catalog_owner
  where product.catalog_owner is null
    and exists (
      select 1 from jsonb_array_elements(p_products) seeded
      where seeded ->> 'supplier_reference' = product.supplier_reference
    );

  update public.skbc_merch_variants variant
  set catalog_owner = p_catalog_owner
  where variant.catalog_owner is null
    and exists (
      select 1 from jsonb_array_elements(p_variants) seeded
      where seeded ->> 'sku' = variant.sku
    );

  for v_product in select value from jsonb_array_elements(p_products)
  loop
    v_product_id := null;
    insert into public.skbc_merch_products (
      slug, name, description, brand, supplier_reference, category,
      recommended_level, weight, image_url, source_url, image_attribution,
      catalog_owner, metadata, sort_order, is_active
    ) values (
      v_product ->> 'slug', v_product ->> 'name', v_product ->> 'description',
      v_product ->> 'brand', v_product ->> 'supplier_reference', v_product ->> 'category',
      v_product ->> 'recommended_level', v_product ->> 'weight', v_product ->> 'image_url',
      v_product ->> 'source_url', v_product ->> 'image_attribution', p_catalog_owner,
      coalesce(v_product -> 'metadata', '{}'::jsonb),
      coalesce((v_product ->> 'sort_order')::integer, 0),
      coalesce((v_product ->> 'is_active')::boolean, true)
    )
    on conflict (supplier_reference) do update
    set slug = excluded.slug,
        name = excluded.name,
        description = excluded.description,
        brand = excluded.brand,
        category = excluded.category,
        recommended_level = excluded.recommended_level,
        weight = excluded.weight,
        image_url = excluded.image_url,
        source_url = excluded.source_url,
        image_attribution = excluded.image_attribution,
        metadata = excluded.metadata,
        sort_order = excluded.sort_order,
        is_active = excluded.is_active
    where skbc_merch_products.catalog_owner = p_catalog_owner
    returning id into v_product_id;
    if v_product_id is null then
      raise exception 'supplier reference % belongs to another catalog owner', v_product ->> 'supplier_reference'
        using errcode = '23505';
    end if;
    v_products_upserted := v_products_upserted + 1;
  end loop;

  for v_variant in select value from jsonb_array_elements(p_variants)
  loop
    v_product_id := null;
    select id into v_product_id
    from public.skbc_merch_products
    where slug = v_variant ->> 'product_slug'
      and catalog_owner = p_catalog_owner
    for update;
    if v_product_id is null then
      raise exception 'seed variant % references an unknown owned product', v_variant ->> 'sku'
        using errcode = '23503';
    end if;

    v_variant_id := null;
    insert into public.skbc_merch_variants (
      product_id, sku, name, attributes, supplier_reference, cost_cents,
      margin_cents, price_cents, unit_price_cents, cost_basis,
      promotion_price_cents, promotion_starts_at, promotion_ends_at,
      promotion_is_active, catalog_owner, metadata, sort_order, is_active
    ) values (
      v_product_id, v_variant ->> 'sku', v_variant ->> 'name',
      coalesce(v_variant -> 'attributes', '{}'::jsonb), v_variant ->> 'supplier_reference',
      (v_variant ->> 'cost_cents')::integer, (v_variant ->> 'margin_cents')::integer,
      (v_variant ->> 'price_cents')::integer, (v_variant ->> 'price_cents')::integer,
      v_variant ->> 'cost_basis', (v_variant ->> 'promotion_price_cents')::integer,
      (v_variant ->> 'promotion_starts_at')::timestamptz,
      (v_variant ->> 'promotion_ends_at')::timestamptz,
      coalesce((v_variant ->> 'promotion_is_active')::boolean, false), p_catalog_owner,
      coalesce(v_variant -> 'metadata', '{}'::jsonb),
      coalesce((v_variant ->> 'sort_order')::integer, 0),
      coalesce((v_variant ->> 'is_active')::boolean, true)
    )
    on conflict (sku) do update
    set product_id = excluded.product_id,
        name = excluded.name,
        attributes = excluded.attributes,
        supplier_reference = excluded.supplier_reference,
        cost_cents = excluded.cost_cents,
        margin_cents = excluded.margin_cents,
        price_cents = excluded.price_cents,
        unit_price_cents = excluded.price_cents,
        cost_basis = excluded.cost_basis,
        promotion_price_cents = excluded.promotion_price_cents,
        promotion_starts_at = excluded.promotion_starts_at,
        promotion_ends_at = excluded.promotion_ends_at,
        promotion_is_active = excluded.promotion_is_active,
        metadata = excluded.metadata,
        sort_order = excluded.sort_order,
        is_active = excluded.is_active
    where skbc_merch_variants.catalog_owner = p_catalog_owner
    returning id into v_variant_id;
    if v_variant_id is null then
      raise exception 'SKU % belongs to another catalog owner', v_variant ->> 'sku'
        using errcode = '23505';
    end if;
    v_variants_upserted := v_variants_upserted + 1;
  end loop;

  update public.skbc_merch_variants variant
  set is_active = false
  where variant.catalog_owner = p_catalog_owner
    and not exists (
      select 1 from jsonb_array_elements(p_variants) seeded
      where seeded ->> 'sku' = variant.sku
    )
    and variant.is_active;
  get diagnostics v_variants_deactivated = row_count;

  update public.skbc_merch_products product
  set is_active = false
  where product.catalog_owner = p_catalog_owner
    and not exists (
      select 1 from jsonb_array_elements(p_products) seeded
      where seeded ->> 'supplier_reference' = product.supplier_reference
    )
    and product.is_active;
  get diagnostics v_products_deactivated = row_count;

  return query select v_products_upserted, v_variants_upserted,
                      v_products_deactivated, v_variants_deactivated;
end;
$$;

revoke all on function public.set_skbc_merch_updated_at() from public;
revoke all on function public.is_skbc_merch_admin() from public;
revoke all on function public.can_manage_skbc_merch_orders() from public;
revoke all on function public.sync_skbc_merch_variant_price() from public;
revoke all on function public.protect_skbc_frozen_order() from public;
revoke all on function public.skbc_merch_campaign_period(timestamptz) from public;
revoke all on function public.submit_skbc_merch_order(uuid, text, text, text, text, text, text, jsonb) from public;
revoke all on function public.assign_skbc_order_payment_method(uuid, text) from public;
revoke all on function public.close_skbc_order_campaign(uuid, integer, integer) from public;
revoke all on function public.claim_skbc_order_communication(uuid, uuid, uuid, boolean, boolean) from public;
revoke all on function public.complete_skbc_order_communication_attempt(uuid, uuid, uuid, text, text) from public;
revoke all on function public.reconcile_skbc_order_communication(uuid, uuid, uuid, boolean, boolean) from public;
revoke all on function public.seed_skbc_merch_catalog(jsonb, jsonb, text) from public;
revoke all privileges on table public.skbc_merch_orders from public;
revoke all privileges on table public.skbc_merch_products from public;
revoke all privileges on table public.skbc_merch_variants from public;
revoke all privileges on table public.skbc_order_campaigns from public;
revoke all privileges on table public.skbc_merch_order_items from public;
revoke all privileges on table public.skbc_order_communications from public;
revoke all privileges on table public.skbc_order_communication_attempts from public;
revoke all privileges on table public.skbc_merch_admins from public;
revoke all privileges on table public.skbc_merch_catalog_public from public;
revoke all privileges on table public.skbc_merch_order_items_management from public;
revoke all privileges on table public.skbc_merch_orders from anon;
revoke all privileges on table public.skbc_merch_products from anon;
revoke all privileges on table public.skbc_merch_variants from anon;
revoke all privileges on table public.skbc_order_campaigns from anon;
revoke all privileges on table public.skbc_merch_order_items from anon;
revoke all privileges on table public.skbc_order_communications from anon;
revoke all privileges on table public.skbc_order_communication_attempts from anon;
revoke all privileges on table public.skbc_merch_admins from anon;
revoke all privileges on table public.skbc_merch_catalog_public from anon;
revoke all privileges on table public.skbc_merch_order_items_management from anon;
revoke all privileges on table public.skbc_merch_orders from authenticated;
revoke all privileges on table public.skbc_merch_products from authenticated;
revoke all privileges on table public.skbc_merch_variants from authenticated;
revoke all privileges on table public.skbc_order_campaigns from authenticated;
revoke all privileges on table public.skbc_merch_order_items from authenticated;
revoke all privileges on table public.skbc_order_communications from authenticated;
revoke all privileges on table public.skbc_order_communication_attempts from authenticated;
revoke all privileges on table public.skbc_merch_admins from authenticated;
revoke all privileges on table public.skbc_merch_catalog_public from authenticated;
revoke all privileges on table public.skbc_merch_order_items_management from authenticated;
grant select on table public.skbc_merch_catalog_public to anon;
grant execute on function public.submit_skbc_merch_order(uuid, text, text, text, text, text, text, jsonb) to anon;

grant execute on function public.is_skbc_merch_admin() to authenticated;
grant execute on function public.can_manage_skbc_merch_orders() to authenticated;
grant execute on function public.assign_skbc_order_payment_method(uuid, text) to authenticated;
grant execute on function public.close_skbc_order_campaign(uuid, integer, integer) to authenticated;
grant execute on function public.claim_skbc_order_communication(uuid, uuid, uuid, boolean, boolean) to authenticated;
grant execute on function public.complete_skbc_order_communication_attempt(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.reconcile_skbc_order_communication(uuid, uuid, uuid, boolean, boolean) to authenticated;
grant execute on function public.seed_skbc_merch_catalog(jsonb, jsonb, text) to authenticated;
grant select on table public.skbc_merch_products, public.skbc_merch_variants to authenticated;
grant select on table public.skbc_merch_orders, public.skbc_merch_order_items,
  public.skbc_order_campaigns, public.skbc_order_communications to authenticated;
grant select on table public.skbc_merch_catalog_public to anon, authenticated;
grant select on table public.skbc_order_communication_attempts to authenticated;

grant execute on function public.can_manage_skbc_merch_orders() to service_role;
grant execute on function public.assign_skbc_order_payment_method(uuid, text) to service_role;
grant execute on function public.close_skbc_order_campaign(uuid, integer, integer) to service_role;
grant execute on function public.claim_skbc_order_communication(uuid, uuid, uuid, boolean, boolean) to service_role;
grant execute on function public.complete_skbc_order_communication_attempt(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.reconcile_skbc_order_communication(uuid, uuid, uuid, boolean, boolean) to service_role;
grant execute on function public.seed_skbc_merch_catalog(jsonb, jsonb, text) to service_role;

grant all privileges on table
  public.skbc_merch_admins,
  public.skbc_merch_orders,
  public.skbc_merch_products,
  public.skbc_merch_variants,
  public.skbc_order_campaigns,
  public.skbc_merch_order_items,
  public.skbc_order_communications,
  public.skbc_order_communication_attempts
to service_role;
grant select on table public.skbc_merch_order_items_management to service_role;
