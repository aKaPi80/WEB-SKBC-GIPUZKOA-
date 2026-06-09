create table if not exists public.skbc_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  phone text,
  email text,
  interest text,
  message text,
  status text not null default 'new',
  source text not null default 'website_contact',
  page_lang text default 'es',
  notes text
);

alter table public.skbc_leads enable row level security;

drop policy if exists "Public can create SKBC leads" on public.skbc_leads;
create policy "Public can create SKBC leads"
on public.skbc_leads
for insert
to anon
with check (true);

drop policy if exists "Authenticated can manage SKBC leads" on public.skbc_leads;
create policy "Authenticated can manage SKBC leads"
on public.skbc_leads
for all
to authenticated
using (true)
with check (true);

create index if not exists skbc_leads_status_created_idx
on public.skbc_leads (status, created_at desc);
