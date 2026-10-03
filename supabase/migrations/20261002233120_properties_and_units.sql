-- Phase 2 — Properties & units
-- Buildings and the flats in them, owned by an organization.
-- See docs/plans/0001-initial-architecture-and-roadmap.md (Phase 2 detail) and docs/adr/0003.

-------------------------------------------------------------------------------
-- Types
-------------------------------------------------------------------------------

-- 'occupied' is maintained by the Phase 3 occupancy trigger from active tenancies.
create type public.unit_status as enum ('vacant', 'occupied', 'maintenance', 'inactive');

-------------------------------------------------------------------------------
-- Tables
-------------------------------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  address text not null default '' check (char_length(address) <= 300),
  city text not null default '' check (char_length(city) <= 80),
  rent_due_day smallint not null default 5 check (rent_due_day between 1 and 28),
  notes text not null default '' check (char_length(notes) <= 1000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target for child composite FKs; also serves as the org_id index.
  unique (org_id, id)
);

comment on table public.properties is 'A building. Archive instead of deleting once it has units.';

create table public.units (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  property_id uuid not null,
  unit_number text not null check (char_length(unit_number) between 1 and 20),
  floor text not null default '' check (char_length(floor) <= 20),
  unit_type text not null default '' check (char_length(unit_type) <= 40),
  bedrooms smallint check (bedrooms between 0 and 20),
  default_rent numeric(12, 2) not null default 0 check (default_rent >= 0),
  status public.unit_status not null default 'vacant',
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Cross-org references are impossible: the property must belong to the same org.
  foreign key (org_id, property_id) references public.properties (org_id, id) on delete restrict,
  unique (property_id, unit_number),
  -- Target for Phase 3+ composite FKs; also serves as the org_id index.
  unique (org_id, id)
);

comment on table public.units is 'A rentable flat or space inside a property.';

-- FK (org_id, property_id) index, and the per-property status filter.
create index units_org_id_property_id_idx on public.units (org_id, property_id);
create index units_property_id_status_idx on public.units (property_id, status);

create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function private.set_updated_at();

create trigger units_set_updated_at
  before update on public.units
  for each row execute function private.set_updated_at();

-------------------------------------------------------------------------------
-- Views
-------------------------------------------------------------------------------

-- One row per property with unit counts, so the property list is one query.
-- security_invoker: the caller's RLS on properties and units applies.
create view public.property_overview
with (security_invoker = true)
as
select
  p.id,
  p.org_id,
  p.name,
  p.address,
  p.city,
  p.rent_due_day,
  p.archived_at,
  p.created_at,
  coalesce(c.unit_count, 0)::int as unit_count,
  coalesce(c.occupied_count, 0)::int as occupied_count,
  coalesce(c.vacant_count, 0)::int as vacant_count
from public.properties p
left join lateral (
  select
    count(*) as unit_count,
    count(*) filter (where u.status = 'occupied') as occupied_count,
    count(*) filter (where u.status = 'vacant') as vacant_count
  from public.units u
  where u.property_id = p.id
) c on true;

-------------------------------------------------------------------------------
-- Grants (table and column level)
-------------------------------------------------------------------------------

revoke all on public.properties, public.units, public.property_overview from anon, authenticated;

grant select, delete on public.properties to authenticated;
grant insert (org_id, name, address, city, rent_due_day, notes) on public.properties to authenticated;
grant update (name, address, city, rent_due_day, notes, archived_at) on public.properties to authenticated;

-- org_id and property_id are not updatable: a unit never moves between properties.
grant select, delete on public.units to authenticated;
grant insert (org_id, property_id, unit_number, floor, unit_type, bedrooms, default_rent, status, notes)
  on public.units to authenticated;
grant update (unit_number, floor, unit_type, bedrooms, default_rent, status, notes)
  on public.units to authenticated;

grant select on public.property_overview to authenticated;

-------------------------------------------------------------------------------
-- Row Level Security
-- Tenant read access arrives with tenancies in Phase 3.
-------------------------------------------------------------------------------

alter table public.properties enable row level security;
alter table public.units enable row level security;

-- properties
create policy "Members can view their organization's properties"
  on public.properties for select
  to authenticated
  using (org_id in (select private.user_org_ids()));

create policy "Members can add properties to their organization"
  on public.properties for insert
  to authenticated
  with check (org_id in (select private.user_org_ids()));

create policy "Members can update their organization's properties"
  on public.properties for update
  to authenticated
  using (org_id in (select private.user_org_ids()))
  with check (org_id in (select private.user_org_ids()));

create policy "Members can delete their organization's properties"
  on public.properties for delete
  to authenticated
  using (org_id in (select private.user_org_ids()));

-- units
create policy "Members can view their organization's units"
  on public.units for select
  to authenticated
  using (org_id in (select private.user_org_ids()));

create policy "Members can add units to their organization"
  on public.units for insert
  to authenticated
  with check (org_id in (select private.user_org_ids()));

create policy "Members can update their organization's units"
  on public.units for update
  to authenticated
  using (org_id in (select private.user_org_ids()))
  with check (org_id in (select private.user_org_ids()));

create policy "Members can delete their organization's units"
  on public.units for delete
  to authenticated
  using (org_id in (select private.user_org_ids()));
