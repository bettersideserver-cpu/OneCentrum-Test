-- BetterSide unified Supabase schema
-- Unified Supabase application schema.
-- Run this file in the Supabase SQL Editor.
--
-- Browser code uses only the Supabase publishable key.
-- Do NOT put a service-role key in the frontend.

create extension if not exists pgcrypto;

-- ============================================================
-- BUILDING / FLOOR / UNIT INVENTORY
-- ============================================================

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  floor_number text not null,
  name text not null,
  html_file text,
  created_at timestamptz not null default now(),
  unique(building_id, floor_number)
);

create table if not exists public.status_categories (
  id text primary key,
  name text not null unique,
  color text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid references public.floors(id) on delete cascade,
  floor text not null,
  unit_type text not null,
  unit_number text not null,
  svg_id text not null,
  status_id text not null references public.status_categories(id),
  area numeric,
  price numeric,
  super_area text,
  carpet_area text,
  buyer_name text not null default '',
  buyer_phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(floor_id, svg_id)
);

-- Upgrade the existing ProductDevelopment prototype schema if it is already installed.
alter table public.units add column if not exists super_area text;
alter table public.units add column if not exists carpet_area text;
alter table public.units add column if not exists buyer_name text not null default '';
alter table public.units add column if not exists buyer_phone text not null default '';

create index if not exists units_floor_idx on public.units(floor);
create index if not exists units_status_idx on public.units(status_id);
create index if not exists units_svg_id_idx on public.units(svg_id);

-- ============================================================
-- VISITORS
-- ============================================================

create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  name text not null,
  phone text not null,
  email text not null,
  city text not null default '',
  status text not null default 'Pending'
    check (status in ('Pending','Approved','Rejected','Expired')),
  access_time integer not null default 5,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists visitors_public_id_idx on public.visitors(public_id);
create index if not exists visitors_status_idx on public.visitors(status);
create index if not exists visitors_created_at_idx on public.visitors(created_at desc);

-- ============================================================
-- PROPERTY HOLD REQUESTS
-- ============================================================

create table if not exists public.property_requests (
  id uuid primary key default gen_random_uuid(),
  visitor_public_id text not null default '',
  visitor_name text not null default '',
  phone text not null default '',
  email text not null default '',
  city text not null default '',
  property_id text not null default '',
  property_name text not null default '',
  floor text not null default '',
  unit text not null default '',
  status text not null default 'Pending',
  requested_at timestamptz not null default now()
);

create index if not exists property_requests_status_idx on public.property_requests(status);
create index if not exists property_requests_requested_at_idx on public.property_requests(requested_at desc);

-- ============================================================
-- ADMIN PROFILES / SUPABASE AUTH
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, ''),
    'admin'
  )
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for Auth users that already exist in this Supabase project.
insert into public.profiles (id, name, email, role)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'name', ''),
  coalesce(u.email, ''),
  'admin'
from auth.users u
on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- ============================================================
-- REALTIME
-- ============================================================

alter table public.units replica identity full;
alter table public.status_categories replica identity full;
alter table public.visitors replica identity full;
alter table public.property_requests replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.units;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.status_categories;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.visitors;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.property_requests;
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================
-- RLS
-- ============================================================

alter table public.buildings enable row level security;
alter table public.floors enable row level security;
alter table public.status_categories enable row level security;
alter table public.units enable row level security;
alter table public.visitors enable row level security;
alter table public.property_requests enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "public can read buildings" on public.buildings;
create policy "public can read buildings"
on public.buildings for select to anon, authenticated
using (true);

drop policy if exists "public can read floors" on public.floors;
create policy "public can read floors"
on public.floors for select to anon, authenticated
using (true);

drop policy if exists "public can read active statuses" on public.status_categories;
create policy "public can read active statuses"
on public.status_categories for select to anon, authenticated
using (active = true);

drop policy if exists "public can read units" on public.units;
create policy "public can read units"
on public.units for select to anon, authenticated
using (true);

drop policy if exists "public can register visitors" on public.visitors;
create policy "public can register visitors"
on public.visitors for insert to anon, authenticated
with check (true);

drop policy if exists "admins can read visitors" on public.visitors;
create policy "admins can read visitors"
on public.visitors for select to authenticated
using (public.is_admin());

drop policy if exists "admins can update visitors" on public.visitors;
create policy "admins can update visitors"
on public.visitors for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can delete visitors" on public.visitors;
create policy "admins can delete visitors"
on public.visitors for delete to authenticated
using (public.is_admin());

drop policy if exists "public can create property requests" on public.property_requests;
create policy "public can create property requests"
on public.property_requests for insert to anon, authenticated
with check (true);

drop policy if exists "admins can read property requests" on public.property_requests;
create policy "admins can read property requests"
on public.property_requests for select to authenticated
using (public.is_admin());

drop policy if exists "admins can delete property requests" on public.property_requests;
create policy "admins can delete property requests"
on public.property_requests for delete to authenticated
using (public.is_admin());

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "admins can update units" on public.units;
create policy "admins can update units"
on public.units for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can insert units" on public.units;
create policy "admins can insert units"
on public.units for insert to authenticated
with check (public.is_admin());

drop policy if exists "admins can delete units" on public.units;
create policy "admins can delete units"
on public.units for delete to authenticated
using (public.is_admin());

drop policy if exists "admins can read all statuses" on public.status_categories;
create policy "admins can read all statuses"
on public.status_categories for select to authenticated
using (public.is_admin());

drop policy if exists "admins can insert statuses" on public.status_categories;
create policy "admins can insert statuses"
on public.status_categories for insert to authenticated
with check (public.is_admin());

drop policy if exists "admins can update statuses" on public.status_categories;
create policy "admins can update statuses"
on public.status_categories for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can delete statuses" on public.status_categories;
create policy "admins can delete statuses"
on public.status_categories for delete to authenticated
using (public.is_admin());

-- ============================================================
-- SAFE PUBLIC RPCs FOR VISITOR FLOW
-- These avoid exposing the full visitors table to anonymous users.
-- ============================================================

create or replace function public.get_public_visitor(p_public_id text)
returns table (
  public_id text,
  name text,
  phone text,
  email text,
  city text,
  status text,
  access_time integer,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    v.public_id, v.name, v.phone, v.email, v.city,
    v.status, v.access_time, v.created_at, v.expires_at
  from public.visitors v
  where v.public_id = p_public_id
  limit 1;
$$;

grant execute on function public.get_public_visitor(text) to anon, authenticated;

create or replace function public.expire_due_visitors()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.visitors
  set status = 'Expired'
  where status = 'Approved'
    and expires_at is not null
    and expires_at < now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.expire_due_visitors() to anon, authenticated;

-- ============================================================
-- SEED BUILDING + REAL FLOOR STRUCTURE
-- The existing SVG floor pages remain in the frontend; only their data
-- storage is being moved to Supabase.
-- ============================================================

-- The supplied ProductDevelopment ZIP is a demo. Remove its demo building
-- so the migrated floor inventory becomes the single inventory.
delete from public.buildings
where name = 'Demo Building';

insert into public.buildings (name)
select 'BetterSide Building'
where not exists (
  select 1 from public.buildings where name = 'BetterSide Building'
);

insert into public.status_categories (id, name, color, active, sort_order)
values
  ('available', 'Available', '#22c55e', true, 1),
  ('reserved', 'Reserved', '#f59e0b', true, 2),
  ('sold', 'Sold', '#ef4444', true, 3),
  ('hold', 'Hold', '#7c3aed', true, 4)
on conflict (id) do update set
  name = excluded.name,
  color = excluded.color,
  active = true,
  sort_order = excluded.sort_order;

insert into public.floors (building_id, floor_number, name, html_file)
select b.id, x.floor_number, x.name, x.html_file
from public.buildings b
cross join (values

  ('LG', 'Lower Ground', 'svg/pages/Lower-Ground/Lower-Ground.html'),
  ('G', 'Ground', 'svg/pages/Upper-Ground/Upper-Ground.html'),
  ('1', 'Floor 1', 'svg/pages/floor_1/floor_1.html'),
  ('2', 'Floor 2', 'svg/pages/floor_2/floor_2.html'),
  ('3', 'Floor 3', 'svg/pages/floor_3/floor_3.html'),
  ('4', 'Floor 4', 'svg/pages/floor_4/floor_4.html'),
  ('5', 'Floor 5', 'svg/pages/floor_5/floor_5.html'),
  ('6', 'Floor 6', 'svg/pages/floor_6/floor_6.html'),
  ('7', 'Floor 7', 'svg/pages/floor_7/floor_7.html'),
  ('8', 'Floor 8', 'svg/pages/floor_8/floor_8.html'),
  ('9', 'Floor 9', 'svg/pages/floor_9/floor_9.html'),
  ('10', 'Floor 10', 'svg/pages/floor_10/floor_10.html'),
  ('11', 'Floor 11', 'svg/pages/floor_11/floor_11.html'),
  ('12', 'Floor 12', 'svg/pages/floor_12/floor_12.html'),
  ('13', 'Floor 13', 'svg/pages/floor_13/floor_13.html'),
  ('14', 'Floor 14', 'svg/pages/floor_14/floor_14.html'),
  ('15', 'Floor 15', 'svg/pages/floor_15/floor_15.html'),
  ('16', 'Floor 16', 'svg/pages/floor_16/floor_16.html')
) as x(floor_number, name, html_file)
where b.name = 'BetterSide Building'
on conflict (building_id, floor_number) do update
set name = excluded.name, html_file = excluded.html_file;

-- Real unit IDs extracted from the project's 18 SVG floor pages.
-- Existing Supabase unit status is preserved when the same floor/SVG already exists.
insert into public.units
  (floor_id, floor, unit_type, unit_number, svg_id, status_id, super_area, carpet_area, area)
select
  f.id,
  u.floor,
  u.unit_type,
  u.unit_number,
  u.svg_id,
  'available',
  u.super_area,
  u.carpet_area,
  u.area
from (values

  ('4', 'Unit', 'Cafe', '4_Cafe', '1,654 sq.ft', '827 sq.ft', 1654.0),
  ('4', 'Presidential Office', '401', '4_PresedentialOffice_401', '3,392 sq.ft', '1,696 sq.ft', 3392.0),
  ('4', 'Presidential Office', '402', '4_PresedentialOffice_402', '2,896 sq.ft', '1,448 sq.ft', 2896.0),
  ('4', 'Presidential Office', '403', '4_PresedentialOffice_403', '4,156 sq.ft', '2,078 sq.ft', 4156.0),
  ('4', 'Presidential Office', '404', '_x34__x5F_PresedentialOffice_404', '3,944 sq.ft', '1,972 sq.ft', 3944.0),
  ('LG', 'RetailArea', '01', 'UpperGround_RetailArea_01', null, null, null),
  ('LG', 'RetailArea', '02', 'UpperGround_RetailArea_02', null, null, null),
  ('LG', 'RetailArea', '03', 'UpperGround_RetailArea_03', null, null, null),
  ('LG', 'RetailArea', '04', 'UpperGround_RetailArea_04', null, null, null),
  ('LG', 'LowerGround Restaurent', '01', 'LowerGround_Restaurent_01', '7,226 sq.ft', '3,613 sq.ft', 7226.0),
  ('LG', 'LowerGround Restaurent', '02', 'LowerGround_Restaurent_02', '2,794 sq.ft', '1,397 sq.ft', 2794.0),
  ('LG', 'LowerGround Restaurent', '03', 'LowerGround_Restaurent_03', '4,278 sq.ft', '2,239 sq.ft', 4278.0),
  ('7', 'Boutique Office', '701', '7_BoutiqueOffice_701', '1,054 sq.ft', '527 sq.ft', 1054.0),
  ('7', 'Boutique Office', '702', '7_BoutiqueOffice_702', '996 sq.ft', '498 sq.ft', 996.0),
  ('7', 'Boutique Office', '703', '7_BoutiqueOffice_703', '996 sq.ft', '498 sq.ft', 996.0),
  ('7', 'Boutique Office', '704', '7_BoutiqueOffice_704', '996 sq.ft', '498 sq.ft', 996.0),
  ('7', 'Boutique Office', '705', '7_BoutiqueOffice_705', '1,034 sq.ft', '517 sq.ft', 1034.0),
  ('7', 'Boutique Office', '706', '7_BoutiqueOffice_706', '1,296 sq.ft', '648 sq.ft', 1296.0),
  ('7', 'Boutique Office', '707', '7_BoutiqueOffice_707', '896 sq.ft', '448 sq.ft', 896.0),
  ('7', 'Boutique Office', '708', '7_BoutiqueOffice_708', '870 sq.ft', '435 sq.ft', 870.0),
  ('7', 'Boutique Office', '709', '7_BoutiqueOffice_709', '952 sq.ft', '476 sq.ft', 952.0),
  ('7', 'Boutique Office', '710', '7_BoutiqueOffice_710', '952 sq.ft', '476 sq.ft', 952.0),
  ('7', 'Boutique Office', '711', '7_BoutiqueOffice_711', '986 sq.ft', '493 sq.ft', 986.0),
  ('12', 'Presidential Office', '1201', '12_PresidentialOffice_1201', '7,126 sq.ft', '3,563 sq.ft', 7126.0),
  ('2', 'Anchor', 'Store', '2_Anchor_Store', '9,148 sq.ft', '4,574 sq.ft', 9148.0),
  ('2', 'Mini Theater', 'MiniTheater', '2_MiniTheater', '- sq.ft', '958 sq.ft', null),
  ('2', 'Admin', 'Area', '2_Admin_Area', '604 sq.ft', '1208 sq.ft', 604.0),
  ('2', 'Restaurant', 'Restaurent', '2_Restaurent', '9,668 sq.ft', '4,834 sq.ft', 9668.0),
  ('2', 'Unit', 'Cabin', '2_Cabin', '532 sq.ft', '266 sq.ft', 532.0),
  ('10', 'Boutique Office', '1001', '10_BoutiqueOffice_1001', '1,054 sq.ft', '527 sq.ft', 1054.0),
  ('10', 'Boutique Office', '1002', '10_BoutiqueOffice_1002', '996 sq.ft', '498 sq.ft', 996.0),
  ('10', 'Boutique Office', '1003', '10_BoutiqueOffice_1003', '996 sq.ft', '498 sq.ft', 996.0),
  ('10', 'Boutique Office', '1004', '10_BoutiqueOffice_1004', '996 sq.ft', '498 sq.ft', 996.0),
  ('10', 'Boutique Office', '1005', '10_BoutiqueOffice_1005', '1,034 sq.ft', '517 sq.ft', 1034.0),
  ('10', 'Boutique Office', '1006', '10_BoutiqueOffice_1006', '1,442 sq.ft', '721 sq.ft', 1442.0),
  ('10', 'Boutique Office', '1007', '10_BoutiqueOffice_1007', '1,032 sq.ft', '516 sq.ft', 1032.0),
  ('10', 'Boutique Office', '1008', '10_BoutiqueOffice_1008', '1,076 sq.ft', '538 sq.ft', 1076.0),
  ('10', 'Boutique Office', '1009', '10_BoutiqueOffice_1009', '1,054 sq.ft', '527 sq.ft', 1054.0),
  ('10', 'Boutique Office', '1010', '10_BoutiqueOffice_1010', '1,076 sq.ft', '538 sq.ft', 1076.0),
  ('3', 'Exhibition Hall', 'ExibhitionHall', '3_ExibhitionHall', '7,228 sq.ft', '3,614 sq.ft', 7228.0),
  ('3', 'Fitness Studio', 'FirtnessStudio', '3_FirtnessStudio', '2,026 sq.ft', '1,013 sq.ft', 2026.0),
  ('3', 'Party Hall', 'PartyHall', '3_PartyHall', '7,060 sq.ft', '3,530 sq.ft', 7060.0),
  ('6', 'Boutique Office', '601', '6_BoutiqueOffice_601', '1,054 sq.ft', '527 sq.ft', 1054.0),
  ('6', 'Boutique Office', '602', '6_BoutiqueOffice_602', '996 sq.ft', '498 sq.ft', 996.0),
  ('6', 'Boutique Office', '603', '6_BoutiqueOffice_603', '996 sq.ft', '498 sq.ft', 996.0),
  ('6', 'Boutique Office', '604', '6_BoutiqueOffice_604', '996 sq.ft', '498 sq.ft', 996.0),
  ('6', 'Boutique Office', '605', '6_BoutiqueOffice_605', '1,034 sq.ft', '517 sq.ft', 1034.0),
  ('6', 'Boutique Office', '606', '6_BoutiqueOffice_606', '1,442 sq.ft', '721 sq.ft', 1442.0),
  ('6', 'Boutique Office', '607', '6_BoutiqueOffice_607', '896 sq.ft', '448 sq.ft', 896.0),
  ('6', 'Boutique Office', '608', '6_BoutiqueOffice_608', '870 sq.ft', '435 sq.ft', 870.0),
  ('6', 'Boutique Office', '609', '6_BoutiqueOffice_609', '952 sq.ft', '476 sq.ft', 952.0),
  ('6', 'Boutique Office', '610', '6_BoutiqueOffice_610', '952 sq.ft', '476 sq.ft', 952.0),
  ('6', 'Boutique Office', '611', '6_BoutiqueOffice_611', '986 sq.ft', '493 sq.ft', 986.0),
  ('14', 'Presidential Office', '1401', '14_PresidentialOffice_1401', '7,126 sq.ft', '3,563 sq.ft', 7126.0),
  ('16', 'Presidential Office', '1601', '16_PresidentialOffice_1601', '7,126 sq.ft', '3,563 sq.ft', 7126.0),
  ('5', 'Boutique Office', '501', '5_BotiqueOffice_501', '2,036 sq.ft', '1,018 sq.ft', 2036.0),
  ('5', 'Boutique Office', '502', '5_BotiqueOffice_502', '1,726 sq.ft', '863 sq.ft', 1726.0),
  ('5', 'Boutique Office', '503', '5_BotiqueOffice_503', '2,620 sq.ft', '1,310 sq.ft', 2620.0),
  ('5', 'Boutique Office', '504', '5_BotiqueOffice_504', '1,572 sq.ft', '786 sq.ft', 1572.0),
  ('5', 'Boutique Office', '505', '5_BotiqueOffice_505', '1,152 sq.ft', '576 sq.ft', 1152.0),
  ('5', 'Boutique Office', '506', '5_BotiqueOffice_506', '1,494 sq.ft', '747 sq.ft', 1494.0),
  ('5', 'Boutique Office', '507', '5_BotiqueOffice_507', '1,456 sq.ft', '728 sq.ft', 1456.0),
  ('5', 'Boutique Office', '508', '5_BotiqueOffice_508', '1,456 sq.ft', '728 sq.ft', 1456.0),
  ('5', 'Boutique Office', '509', '5_BotiqueOffice_509', '2,042 sq.ft', '1,021 sq.ft', 2042.0),
  ('1', 'Anchor Store', '01', '1_AnchorStore_01', '13,444 sq.ft', '6,722 sq.ft', 13444.0),
  ('1', 'Retail Area', '01', '1_Retail_Area_01', '2,094 sq.ft', '1,047 sq.ft', 2094.0),
  ('1', 'Retail Area', '02', '1_Retail_Area_02', '2,742 sq.ft', '1,371 sq.ft', 2742.0),
  ('1', 'Retail Area', '03', '1_Retail_Area_03', '9,370 sq.ft', '4,685 sq.ft', 9370.0),
  ('15', 'Presidential Office', '1501', '15_PresidentialOffice_1501', '7,126 sq.ft', '3,563 sq.ft', 7126.0),
  ('11', 'Presidential Office', '1101', '11_PresidentialOffice_1101', '2,576 sq.ft', '1,288 sq.ft', 2576.0),
  ('11', 'Presidential Office', '1102', '11_PresidentialOffice_1102', '2,504 sq.ft', '1,252 sq.ft', 2504.0),
  ('11', 'Presidential Office', '1103', '11_PresidentialOffice_1103', '2,096 sq.ft', '1,048 sq.ft', 2096.0),
  ('11', 'Presidential Office', '1104', '11_PresidentialOffice_1104', '2,432 sq.ft', '1,216 sq.ft', 2432.0),
  ('11', 'Presidential Office', '1105', '11_PresidentialOffice_1105', '2,152 sq.ft', '1,076 sq.ft', 2152.0),
  ('9', 'BoutiqueOffice', '1', '9_BoutiqueOffice_1', null, null, null),
  ('9', 'Boutique Office', '902', '9_BoutiqueOffice_902', '996 sq.ft', '498 sq.ft', 996.0),
  ('9', 'Boutique Office', '903', '9_BoutiqueOffice_903', '996 sq.ft', '498 sq.ft', 996.0),
  ('9', 'Boutique Office', '904', '9_BoutiqueOffice_904', '1,054 sq.ft', '527 sq.ft', 1054.0),
  ('9', 'Boutique Office', '905', '9_BoutiqueOffice_905', '904 sq.ft', '452 sq.ft', 904.0),
  ('9', 'Boutique Office', '906', '9_BoutiqueOffice_906', '896 sq.ft', '448 sq.ft', 896.0),
  ('9', 'Boutique Office', '907', '9_BoutiqueOffice_907', '870 sq.ft', '435 sq.ft', 870.0),
  ('9', 'Boutique Office', '908', '9_BoutiqueOffice_908', '870 sq.ft', '435 sq.ft', 870.0),
  ('9', 'Boutique Office', '909', '9_BoutiqueOffice_909', '952 sq.ft', '476 sq.ft', 952.0),
  ('9', 'Boutique Office', '910', '9_BoutiqueOffice_910', '986 sq.ft', '493 sq.ft', 986.0),
  ('8', 'Boutique Office', '801', '8_BoutiqueOffice_801', '1,054 sq.ft', '527 sq.ft', 1054.0),
  ('8', 'Boutique Office', '802', '8_BoutiqueOffice_802', '996 sq.ft', '498 sq.ft', 996.0),
  ('8', 'Boutique Office', '803', '8_BoutiqueOffice_803', '996 sq.ft', '498 sq.ft', 996.0),
  ('8', 'Boutique Office', '804', '8_BoutiqueOffice_804', '1,054 sq.ft', '527 sq.ft', 1054.0),
  ('8', 'Boutique Office', '805', '8_BoutiqueOffice_805', '904 sq.ft', '452 sq.ft', 904.0),
  ('8', 'Boutique Office', '806', '8_BoutiqueOffice_806', '896 sq.ft', '448 sq.ft', 896.0),
  ('8', 'Boutique Office', '807', '8_BoutiqueOffice_807', '870 sq.ft', '435 sq.ft', 870.0),
  ('8', 'Boutique Office', '808', '8_BoutiqueOffice_808', '952 sq.ft', '476 sq.ft', 952.0),
  ('8', 'Boutique Office', '809', '8_BoutiqueOffice_809', '952 sq.ft', '476 sq.ft', 952.0),
  ('8', 'Boutique Office', '810', '8_BoutiqueOffice_810', '986 sq.ft', '493 sq.ft', 986.0),
  ('13', 'Presidential Office', '1301', '13_PresidentialOffice_1301', '7,126 sq.ft', '3,563 sq.ft', 7126.0)
) as u(floor, unit_type, unit_number, svg_id, super_area, carpet_area, area)
join public.buildings b on b.name = 'BetterSide Building'
join public.floors f on f.building_id = b.id and f.floor_number = u.floor
on conflict (floor_id, svg_id) do update set
  unit_type = excluded.unit_type,
  unit_number = excluded.unit_number,
  super_area = coalesce(excluded.super_area, public.units.super_area),
  carpet_area = coalesce(excluded.carpet_area, public.units.carpet_area),
  area = coalesce(excluded.area, public.units.area),
  updated_at = now();

-- End of migration.
-- Existing unit statuses and buyer fields are preserved on conflict.


-- ============================================================
-- DATA API PRIVILEGES
-- RLS remains the security boundary. These GRANTs allow the
-- authenticated role to reach the tables through PostgREST.
-- ============================================================

grant usage on schema public to anon, authenticated;

grant select on public.status_categories to anon, authenticated;
grant insert, update, delete on public.status_categories to authenticated;

grant select on public.buildings to anon, authenticated;
grant select on public.floors to anon, authenticated;
grant select on public.units to anon, authenticated;

grant insert on public.visitors to anon, authenticated;
grant select, update, delete on public.visitors to authenticated;

grant insert on public.property_requests to anon, authenticated;
grant select, delete on public.property_requests to authenticated;

grant select, update, insert, delete on public.profiles to authenticated;
