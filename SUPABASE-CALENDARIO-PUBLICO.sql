-- SKBC GIPUZKOA - Agenda publica planificada para la web
-- Ejecutar en el proyecto Supabase del sistema de gestion SKBC.
-- Esta tabla NO sustituye a courses: courses sigue siendo historial/asignacion de cursos a alumnos.

create table if not exists public.skbc_public_calendar_events (
  id uuid primary key default gen_random_uuid(),
  starts_on date not null,
  ends_on date,
  title text not null,
  description text,
  location text,
  kind text not null default 'event',
  color text not null default '#c9a646',
  visibility text not null default 'public',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skbc_public_calendar_events_kind_check
    check (kind in ('event', 'course', 'national', 'international', 'taikai', 'training', 'vacation', 'closure')),
  constraint skbc_public_calendar_events_visibility_check
    check (visibility in ('public', 'kenshi')),
  constraint skbc_public_calendar_events_dates_check
    check (ends_on is null or ends_on >= starts_on)
);

create index if not exists skbc_public_calendar_events_starts_on_idx
  on public.skbc_public_calendar_events (starts_on);

create or replace function public.skbc_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists skbc_public_calendar_events_touch_updated_at on public.skbc_public_calendar_events;

create trigger skbc_public_calendar_events_touch_updated_at
before update on public.skbc_public_calendar_events
for each row execute function public.skbc_touch_updated_at();

alter table public.skbc_public_calendar_events enable row level security;

drop policy if exists "Public planned events are readable" on public.skbc_public_calendar_events;
create policy "Public planned events are readable"
on public.skbc_public_calendar_events
for select
to anon, authenticated
using (active = true);

drop policy if exists "Authenticated users can manage planned events" on public.skbc_public_calendar_events;
create policy "Authenticated users can manage planned events"
on public.skbc_public_calendar_events
for all
to authenticated
using (true)
with check (true);

