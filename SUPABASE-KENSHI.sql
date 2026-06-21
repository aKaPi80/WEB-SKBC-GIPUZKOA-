create table if not exists public.skbc_kenshi_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  revoked_at timestamptz,
  full_name text not null,
  email text not null,
  phone text,
  relationship text,
  grade text,
  message text,
  admin_notes text,
  status text not null default 'pending',
  page_lang text default 'es',
  source text default 'website_kenshi',
  constraint skbc_kenshi_status_check check (status in ('pending', 'approved', 'rejected', 'revoked'))
);

create index if not exists skbc_kenshi_members_status_idx
  on public.skbc_kenshi_members (status, created_at desc);

create index if not exists skbc_kenshi_members_email_idx
  on public.skbc_kenshi_members (lower(email));

alter table public.skbc_kenshi_members enable row level security;

drop policy if exists "Public can request Kenshi access" on public.skbc_kenshi_members;
create policy "Public can request Kenshi access"
on public.skbc_kenshi_members
for insert
to anon
with check (status = 'pending');

drop policy if exists "Authenticated admin can read Kenshi requests" on public.skbc_kenshi_members;
create policy "Authenticated admin can read Kenshi requests"
on public.skbc_kenshi_members
for select
to authenticated
using ((auth.jwt() ->> 'email') = 'alvarocalvo8@gmail.com');

drop policy if exists "Authenticated admin can update Kenshi requests" on public.skbc_kenshi_members;
create policy "Authenticated admin can update Kenshi requests"
on public.skbc_kenshi_members
for update
to authenticated
using ((auth.jwt() ->> 'email') = 'alvarocalvo8@gmail.com')
with check ((auth.jwt() ->> 'email') = 'alvarocalvo8@gmail.com');

drop policy if exists "Authenticated admin can delete Kenshi requests" on public.skbc_kenshi_members;
create policy "Authenticated admin can delete Kenshi requests"
on public.skbc_kenshi_members
for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'alvarocalvo8@gmail.com');
