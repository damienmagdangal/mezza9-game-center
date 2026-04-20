-- Step 2 hardening: RLS policies + anti-overlap trigger
-- Run after supabase/schema.sql

-- Helper to determine admin role from JWT metadata.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false);
$$;

-- Clear starter policies and replace with stricter access rules.
drop policy if exists "Public can read tables" on public.tables;

drop policy if exists "Public can read available table catalog" on public.tables;
create policy "Public can read available table catalog"
on public.tables
for select
to anon, authenticated
using (true);

drop policy if exists "Only admins can update tables" on public.tables;
create policy "Only admins can update tables"
on public.tables
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Only admins can select customers" on public.customers;
create policy "Only admins can select customers"
on public.customers
for select
to authenticated
using (public.is_admin());

drop policy if exists "Only admins can select reservations" on public.reservations;
create policy "Only admins can select reservations"
on public.reservations
for select
to authenticated
using (public.is_admin());

drop policy if exists "Only admins can select activity logs" on public.activity_logs;
create policy "Only admins can select activity logs"
on public.activity_logs
for select
to authenticated
using (public.is_admin());

-- Anti-overlap DB guard (active reservations only)
create or replace function public.prevent_overlapping_reservations()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('PENDING', 'CONFIRMED', 'CHECKED_IN') then
    if exists (
      select 1
      from public.reservations r
      where r.table_id = new.table_id
        and r.id <> coalesce(new.id, gen_random_uuid())
        and r.status in ('PENDING', 'CONFIRMED', 'CHECKED_IN')
        and new.start_time < r.end_time
        and new.end_time > r.start_time
    ) then
      raise exception 'Overlapping reservation detected for this table.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_overlapping_reservations on public.reservations;
create trigger trg_prevent_overlapping_reservations
before insert or update on public.reservations
for each row
execute function public.prevent_overlapping_reservations();
