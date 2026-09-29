create table if not exists public.skbc_order_family_payments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.skbc_order_campaigns(id) on delete cascade,
  family_key text not null check (btrim(family_key) <> ''),
  recipient_name text not null check (btrim(recipient_name) <> ''),
  recipient_email text,
  recipient_phone text,
  order_ids uuid[] not null default '{}',
  recipients jsonb not null default '[]'::jsonb check (jsonb_typeof(recipients) = 'array'),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  total_cents integer not null default 0 check (total_cents >= 0),
  intended_payment_method text not null check (intended_payment_method in ('cash', 'bank', 'paid', 'mixed')),
  status text not null default 'pending' check (status in ('pending', 'cash_paid', 'bank_submitted')),
  status_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, family_key)
);

create index if not exists skbc_order_family_payments_campaign_status_idx
  on public.skbc_order_family_payments (campaign_id, status, recipient_name);

alter table public.skbc_order_family_payments enable row level security;
revoke all on table public.skbc_order_family_payments from anon, authenticated;
grant all on table public.skbc_order_family_payments to service_role;

with communication_families as (
  select distinct on (
    (communication.snapshot->'campaign'->>'id')::uuid,
    lower(btrim(coalesce(communication.recipient_email, communication.snapshot->>'customer_email')))
  )
    (communication.snapshot->'campaign'->>'id')::uuid as campaign_id,
    lower(btrim(coalesce(communication.recipient_email, communication.snapshot->>'customer_email'))) as family_key,
    coalesce(nullif(btrim(communication.recipient_name), ''), nullif(btrim(communication.snapshot->>'customer_name'), ''), 'Familia') as recipient_name,
    lower(btrim(coalesce(communication.recipient_email, communication.snapshot->>'customer_email'))) as recipient_email,
    coalesce(communication.snapshot->'order_ids', '[]'::jsonb) as order_ids_json,
    coalesce(communication.snapshot->'items', '[]'::jsonb) as items,
    greatest(0, coalesce((communication.snapshot->>'total_cents')::integer, 0)) as total_cents,
    coalesce(communication.snapshot->'payment_methods', '[]'::jsonb) as payment_methods,
    communication.created_at
  from public.skbc_order_communications communication
  where communication.channel = 'email'
    and communication.direction = 'outbound'
    and communication.snapshot ? 'campaign'
    and communication.snapshot->'campaign' ? 'id'
    and coalesce(communication.recipient_email, communication.snapshot->>'customer_email') is not null
  order by
    (communication.snapshot->'campaign'->>'id')::uuid,
    lower(btrim(coalesce(communication.recipient_email, communication.snapshot->>'customer_email'))),
    communication.created_at desc
), prepared as (
  select
    family.*,
    coalesce((
      select array_agg(value::uuid)
      from jsonb_array_elements_text(family.order_ids_json)
    ), '{}'::uuid[]) as order_ids,
    coalesce((
      select jsonb_agg(distinct nullif(btrim(item->>'recipient'), ''))
      from jsonb_array_elements(family.items) item
      where nullif(btrim(item->>'recipient'), '') is not null
    ), '[]'::jsonb) as recipients,
    case
      when jsonb_array_length(family.payment_methods) > 0
        and (select count(distinct method) from jsonb_array_elements_text(family.payment_methods) method) = 1
        then family.payment_methods->>0
      else 'mixed'
    end as intended_payment_method
  from communication_families family
)
insert into public.skbc_order_family_payments (
  campaign_id, family_key, recipient_name, recipient_email, order_ids,
  recipients, items, total_cents, intended_payment_method, status, status_on
)
select
  prepared.campaign_id,
  prepared.family_key,
  prepared.recipient_name,
  prepared.recipient_email,
  prepared.order_ids,
  prepared.recipients,
  prepared.items,
  prepared.total_cents,
  prepared.intended_payment_method,
  case when prepared.intended_payment_method = 'paid' then 'cash_paid' else 'pending' end,
  case when prepared.intended_payment_method = 'paid' then prepared.created_at::date else null end
from prepared
on conflict (campaign_id, family_key) do nothing;
