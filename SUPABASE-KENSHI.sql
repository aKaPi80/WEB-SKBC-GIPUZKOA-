create table if not exists public.skbc_kenshi_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  revoked_at timestamptz,
  full_name text not null,
  email text not null,
  phone text,
  photo_url text,
  ficha_url text,
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

alter table public.skbc_kenshi_members
  add column if not exists photo_url text;

alter table public.skbc_kenshi_members
  add column if not exists ficha_url text;

alter table public.skbc_kenshi_members enable row level security;

drop policy if exists "Public can request Kenshi access" on public.skbc_kenshi_members;
create policy "Public can request Kenshi access"
on public.skbc_kenshi_members
for insert
to anon
with check (status = 'pending');

drop policy if exists "Authenticated admin can read Kenshi requests" on public.skbc_kenshi_members;
drop policy if exists "Authenticated users can read Kenshi own or admin" on public.skbc_kenshi_members;
create policy "Authenticated users can read Kenshi own or admin"
on public.skbc_kenshi_members
for select
to authenticated
using (
  (auth.jwt() ->> 'email') = 'alvarocalvo8@gmail.com'
  or lower(email) = lower(auth.jwt() ->> 'email')
);

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

create table if not exists public.skbc_kenshi_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  replied_at timestamptz,
  member_id uuid references public.skbc_kenshi_members(id) on delete set null,
  member_email text not null,
  member_name text,
  subject text not null,
  message text not null,
  admin_reply text,
  status text not null default 'open',
  page_lang text default 'es',
  constraint skbc_kenshi_messages_status_check check (status in ('open', 'answered', 'closed'))
);

create index if not exists skbc_kenshi_messages_status_idx
  on public.skbc_kenshi_messages (status, created_at desc);

create index if not exists skbc_kenshi_messages_email_idx
  on public.skbc_kenshi_messages (lower(member_email), created_at desc);

alter table public.skbc_kenshi_messages enable row level security;

drop policy if exists "Kenshi users can create own messages" on public.skbc_kenshi_messages;
create policy "Kenshi users can create own messages"
on public.skbc_kenshi_messages
for insert
to authenticated
with check (lower(member_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Kenshi users can read own messages or admin all" on public.skbc_kenshi_messages;
create policy "Kenshi users can read own messages or admin all"
on public.skbc_kenshi_messages
for select
to authenticated
using (
  (auth.jwt() ->> 'email') = 'alvarocalvo8@gmail.com'
  or lower(member_email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists "Authenticated admin can update Kenshi messages" on public.skbc_kenshi_messages;
create policy "Authenticated admin can update Kenshi messages"
on public.skbc_kenshi_messages
for update
to authenticated
using ((auth.jwt() ->> 'email') = 'alvarocalvo8@gmail.com')
with check ((auth.jwt() ->> 'email') = 'alvarocalvo8@gmail.com');

drop policy if exists "Authenticated admin can delete Kenshi messages" on public.skbc_kenshi_messages;
create policy "Authenticated admin can delete Kenshi messages"
on public.skbc_kenshi_messages
for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'alvarocalvo8@gmail.com');
