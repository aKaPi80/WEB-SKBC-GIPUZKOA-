create or replace function public.skbc_public_admin_alert_counts()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'pendingTestimonials', (
      select count(*) from public.skbc_testimonials where status = 'pending'
    ),
    'pendingKenshiRegistrations', (
      select count(*) from public.skbc_kenshi_members where status = 'pending'
    )
  );
$$;

revoke all on function public.skbc_public_admin_alert_counts() from public;
grant execute on function public.skbc_public_admin_alert_counts() to anon, authenticated;
