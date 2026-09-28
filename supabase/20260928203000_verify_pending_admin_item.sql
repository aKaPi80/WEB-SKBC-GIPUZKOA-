create or replace function public.skbc_is_pending_admin_item(item_type text, item_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case item_type
    when 'testimonial' then exists (
      select 1 from public.skbc_testimonials where id = item_id and status = 'pending'
    )
    when 'kenshi' then exists (
      select 1 from public.skbc_kenshi_members where id = item_id and status = 'pending'
    )
    else false
  end;
$$;

revoke all on function public.skbc_is_pending_admin_item(text, uuid) from public;
grant execute on function public.skbc_is_pending_admin_item(text, uuid) to anon, authenticated;
