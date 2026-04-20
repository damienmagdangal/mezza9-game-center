-- Step 4: reservation lifecycle, no-show automation support, and activity log enums
-- Run after schema.sql and step2_security_and_integrity.sql

alter table public.reservations
  drop constraint if exists reservations_status_check;

alter table public.reservations
  add constraint reservations_status_check
  check (status in ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'COMPLETED', 'NO_SHOW'));

alter table public.activity_logs
  drop constraint if exists activity_logs_action_type_check;

alter table public.activity_logs
  add constraint activity_logs_action_type_check
  check (action_type in ('MANUAL_OVERRIDE', 'PRICE_CHANGE', 'RESERVATION_STATUS_CHANGE', 'AUTO_NO_SHOW'));

-- Keep overlap guard aligned with active reservation statuses.
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
