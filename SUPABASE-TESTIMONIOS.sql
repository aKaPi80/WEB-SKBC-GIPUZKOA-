create table if not exists public.skbc_testimonials (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  name text not null,
  role text,
  message text not null,
  photo_url text,
  rating integer check (rating between 1 and 5),
  page_lang text default 'es',
  source text default 'website'
);

alter table public.skbc_testimonials
add column if not exists photo_url text;

alter table public.skbc_testimonials
add column if not exists rating integer check (rating between 1 and 5);

alter table public.skbc_testimonials enable row level security;

drop policy if exists "Public can submit testimonials" on public.skbc_testimonials;
create policy "Public can submit testimonials"
on public.skbc_testimonials
for insert
to anon
with check (status = 'pending');

drop policy if exists "Authenticated can read testimonials" on public.skbc_testimonials;
create policy "Authenticated can read testimonials"
on public.skbc_testimonials
for select
to authenticated
using (true);

drop policy if exists "Authenticated can moderate testimonials" on public.skbc_testimonials;
create policy "Authenticated can moderate testimonials"
on public.skbc_testimonials
for update
to authenticated
using (true)
with check (status in ('pending', 'approved', 'rejected'));

insert into storage.buckets (id, name, public)
values ('skbc-testimonials', 'skbc-testimonials', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can upload testimonial photos" on storage.objects;
create policy "Public can upload testimonial photos"
on storage.objects
for insert
to anon
with check (bucket_id = 'skbc-testimonials');

drop policy if exists "Public can view testimonial photos" on storage.objects;
create policy "Public can view testimonial photos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'skbc-testimonials');
