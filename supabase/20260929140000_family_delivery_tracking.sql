alter table public.skbc_order_family_payments
  add column if not exists delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'partial', 'delivered')),
  add column if not exists delivery_note text;

create index if not exists skbc_order_family_payments_campaign_delivery_idx
  on public.skbc_order_family_payments (campaign_id, delivery_status);
