-- Mezza9.ph Billiards Management & Reservation System
-- Run this in Supabase SQL Editor

create extension if not exists "pgcrypto";

create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  table_number int not null unique check (table_number between 1 and 3),
  model_name text not null,
  base_price_per_hour numeric(10,2) not null check (base_price_per_hour > 0),
  is_premium boolean not null default false,
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE', 'RESERVED', 'IN_USE', 'MAINTENANCE')),
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  email text not null unique,
  type text not null default 'REGULAR' check (type in ('REGULAR', 'VIP', 'CORPORATE')),
  created_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  total_price numeric(10,2) not null check (total_price >= 0),
  is_web_booking boolean not null default true,
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'COMPLETED', 'NO_SHOW')),
  agreed_to_terms boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete restrict,
  action_type text not null check (action_type in ('MANUAL_OVERRIDE', 'PRICE_CHANGE', 'RESERVATION_STATUS_CHANGE', 'AUTO_NO_SHOW')),
  table_id uuid references public.tables(id) on delete set null,
  "timestamp" timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

create index if not exists idx_reservations_table_time on public.reservations(table_id, start_time, end_time);
create index if not exists idx_reservations_created_at on public.reservations(created_at);
create index if not exists idx_reservations_web_status on public.reservations(is_web_booking, status);

alter table public.tables enable row level security;
alter table public.customers enable row level security;
alter table public.reservations enable row level security;
alter table public.activity_logs enable row level security;

-- Public read access for table visibility (customer-facing availability UI)
drop policy if exists "Public can read tables" on public.tables;
create policy "Public can read tables"
on public.tables
for select
to anon, authenticated
using (true);

-- Customers and reservations are app-managed through server-side keys.
-- Restrictive default: no direct anon CRUD policies are added.

-- Seed the 3 billiards tables
insert into public.tables (table_number, model_name, base_price_per_hour, is_premium, status)
values
  (1, 'Prometeus', 150.00, false, 'AVAILABLE'),
  (2, 'Prometeus', 150.00, false, 'AVAILABLE'),
  (3, 'Maxima 8', 180.00, true, 'AVAILABLE')
on conflict (table_number) do update
set
  model_name = excluded.model_name,
  base_price_per_hour = excluded.base_price_per_hour,
  is_premium = excluded.is_premium,
  status = excluded.status;
