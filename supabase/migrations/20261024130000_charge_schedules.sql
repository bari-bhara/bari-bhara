-- Feedback round 1, Phase B — monthly charge schedules per unit, automatic
-- generation with pg_cron, dated rent changes, metered bills, prepaid meters.
-- See docs/plans/0003-feedback-round-1.md (Phase B), ADR 0009 and ADR 0010.
--
-- Custom SQLSTATEs raised here (others in earlier phases):
--   BB004  not found (or not the caller's)
--   BB019  a schedule change must start in a future month

create extension if not exists pg_cron with schema pg_catalog;

-------------------------------------------------------------------------------
-- Types
-------------------------------------------------------------------------------

-- A fixed monthly fee many buildings charge (lift, guard, cleaning).
insert into public.charge_types (key, label, category)
values ('service_charge', 'Service charge', 'utility')
on conflict do nothing;

-- Tells a tenant their rent or a fixed bill changes from a future month.
alter type public.notification_type add value if not exists 'charge_change';

-------------------------------------------------------------------------------
-- Unit charge schedule
-------------------------------------------------------------------------------

-- What a unit is billed each month. The amount for a type in a month is the
-- row with the latest effective_month on or before it; 0 ends an item. Rows
-- are a dated history, so raises never rewrite past months.
create table public.unit_charge_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  unit_id uuid not null,
  charge_type_id uuid not null references public.charge_types (id) on delete restrict,
  amount numeric(12, 2) not null check (amount >= 0),
  effective_month date not null check (effective_month = date_trunc('month', effective_month)::date),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (org_id, unit_id) references public.units (org_id, id) on delete cascade,
  unique (unit_id, charge_type_id, effective_month)
);

comment on table public.unit_charge_items is
  'Dated monthly amounts (rent, fixed bills) per unit. Generation bills the latest row on or before each month.';

create index unit_charge_items_org_id_unit_id_idx on public.unit_charge_items (org_id, unit_id);
create index unit_charge_items_charge_type_id_idx on public.unit_charge_items (charge_type_id);
create index unit_charge_items_created_by_idx on public.unit_charge_items (created_by);

-- The charge type must be the system's or the unit's organization's.
create function private.prepare_unit_charge_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type_org_id uuid;
  v_found boolean;
begin
  select true, org_id into v_found, v_type_org_id from public.charge_types where id = new.charge_type_id;
  if v_found is null or (v_type_org_id is not null and v_type_org_id <> new.org_id) then
    raise exception 'Charge type not found.' using errcode = 'BB004';
  end if;
  return new;
end;
$$;

create trigger unit_charge_items_prepare
  before insert or update on public.unit_charge_items
  for each row execute function private.prepare_unit_charge_item();

revoke execute on function private.prepare_unit_charge_item() from public, anon, authenticated;

-- Each type's amount for a unit in a month (amount 0 included, meaning "ended").
create function private.unit_items_for_month(p_unit_id uuid, p_month date)
returns table (charge_type_id uuid, amount numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct on (i.charge_type_id) i.charge_type_id, i.amount
  from public.unit_charge_items i
  where i.unit_id = p_unit_id and i.effective_month <= p_month
  order by i.charge_type_id, i.effective_month desc;
$$;

revoke execute on function private.unit_items_for_month(uuid, date) from public, anon;
grant execute on function private.unit_items_for_month(uuid, date) to authenticated;

-- A new tenancy's rent becomes the unit's rent from its move-in month.
-- Planned rent changes after that belonged to the previous tenancy.
create function private.schedule_tenancy_rent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := date_trunc('month', new.move_in_date)::date;
  v_rent_type_id uuid;
begin
  select id into v_rent_type_id from public.charge_types where org_id is null and key = 'rent';
  delete from public.unit_charge_items
  where unit_id = new.unit_id and charge_type_id = v_rent_type_id and effective_month > v_month;
  insert into public.unit_charge_items (org_id, unit_id, charge_type_id, amount, effective_month, created_by)
  values (new.org_id, new.unit_id, v_rent_type_id, new.monthly_rent, v_month, new.created_by)
  on conflict (unit_id, charge_type_id, effective_month) do update set amount = excluded.amount;
  return new;
end;
$$;

create trigger tenancies_schedule_rent
  after insert on public.tenancies
  for each row execute function private.schedule_tenancy_rent();

revoke execute on function private.schedule_tenancy_rent() from public, anon, authenticated;

-- Existing tenancies: their current rent, from their move-in month.
insert into public.unit_charge_items (org_id, unit_id, charge_type_id, amount, effective_month, created_by)
select tc.org_id, tc.unit_id, ct.id, tc.monthly_rent, date_trunc('month', tc.move_in_date)::date, tc.created_by
from public.tenancies tc
cross join public.charge_types ct
where tc.status = 'active' and ct.org_id is null and ct.key = 'rent'
on conflict do nothing;

revoke all on public.unit_charge_items from anon, authenticated;
grant select, delete on public.unit_charge_items to authenticated;
grant insert (org_id, unit_id, charge_type_id, amount, effective_month) on public.unit_charge_items to authenticated;
grant update (amount) on public.unit_charge_items to authenticated;

alter table public.unit_charge_items enable row level security;

create policy "Members can view their organization's charge schedules"
  on public.unit_charge_items for select
  to authenticated
  using (org_id in (select private.user_org_ids()));

-- Writes go through set_unit_charge_item(), which only allows future months.
create policy "Members can schedule charges in their organization"
  on public.unit_charge_items for insert
  to authenticated
  with check (org_id in (select private.user_org_ids()));

create policy "Members can change their organization's scheduled charges"
  on public.unit_charge_items for update
  to authenticated
  using (org_id in (select private.user_org_ids()))
  with check (org_id in (select private.user_org_ids()));

create policy "Members can cancel their organization's scheduled charges"
  on public.unit_charge_items for delete
  to authenticated
  using (org_id in (select private.user_org_ids()));

-- Sets a unit's monthly amount for a type from a month that hasn't started
-- yet (amount 0 ends it). Returns the amount it replaces (null if none).
create function public.set_unit_charge_item(
  p_unit_id uuid,
  p_charge_type_id uuid,
  p_amount numeric,
  p_effective_month date
)
returns numeric
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_month date := date_trunc('month', p_effective_month)::date;
  v_previous numeric;
begin
  select org_id into v_org_id from public.units where id = p_unit_id;
  if v_org_id is null then
    raise exception 'Unit not found.' using errcode = 'BB004';
  end if;
  if v_month <= date_trunc('month', private.org_today(v_org_id))::date then
    raise exception 'Changes start from next month or later.' using errcode = 'BB019';
  end if;

  select amount into v_previous
  from private.unit_items_for_month(p_unit_id, (v_month - interval '1 month')::date)
  where charge_type_id = p_charge_type_id;

  insert into public.unit_charge_items (org_id, unit_id, charge_type_id, amount, effective_month)
  values (v_org_id, p_unit_id, p_charge_type_id, p_amount, v_month)
  on conflict (unit_id, charge_type_id, effective_month) do update set amount = excluded.amount;

  return v_previous;
end;
$$;

revoke execute on function public.set_unit_charge_item(uuid, uuid, numeric, date) from public, anon;
grant execute on function public.set_unit_charge_item(uuid, uuid, numeric, date) to authenticated;

-------------------------------------------------------------------------------
-- Generation
-------------------------------------------------------------------------------

-- Creates a month's scheduled charges (rent and fixed bills) for active
-- tenancies of one organization, optionally one property. A type already
-- billed for that tenancy and month is skipped. With p_skip_voided, a voided
-- charge counts as billed too: the scheduler never re-creates what a landlord
-- voided, while the Generate button can.
create function private.create_scheduled_charges(
  p_org_id uuid,
  p_month date,
  p_property_id uuid,
  p_skip_voided boolean
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := date_trunc('month', p_month)::date;
  v_month_end date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  v_count int;
begin
  -- No user means the scheduler or a direct database session.
  if (select auth.uid()) is not null and p_org_id not in (select private.user_org_ids()) then
    raise exception 'Not a member of this organization.' using errcode = 'BB004';
  end if;

  insert into public.charges (org_id, tenancy_id, charge_type_id, billing_month, amount, due_date, description)
  select
    tc.org_id,
    tc.id,
    i.charge_type_id,
    v_month,
    i.amount,
    make_date(extract(year from v_month)::int, extract(month from v_month)::int, p.rent_due_day),
    ct.label || ' for ' || to_char(v_month, 'FMMonth YYYY')
  from public.tenancies tc
  join public.units u on u.id = tc.unit_id
  join public.properties p on p.id = u.property_id
  cross join lateral private.unit_items_for_month(tc.unit_id, v_month) i
  join public.charge_types ct on ct.id = i.charge_type_id
  where tc.org_id = p_org_id
    and tc.status = 'active'
    and tc.move_in_date <= v_month_end
    and p.archived_at is null
    and (p_property_id is null or p.id = p_property_id)
    and i.amount > 0
    and not exists (
      select 1 from public.charges c
      where c.tenancy_id = tc.id
        and c.charge_type_id = i.charge_type_id
        and c.billing_month = v_month
        and (p_skip_voided or c.status <> 'void')
    )
  on conflict do nothing;
  get diagnostics v_count = row_count;

  if v_count > 0 then
    perform private.log_rent_generated(p_org_id, v_month, v_count, p_property_id);
  end if;
  return v_count;
end;
$$;

revoke execute on function private.create_scheduled_charges(uuid, date, uuid, boolean) from public, anon;
grant execute on function private.create_scheduled_charges(uuid, date, uuid, boolean) to authenticated;

-- The Generate button: a month's rent and fixed bills in all the caller's
-- organizations (one property, optionally). Safe to repeat; returns the count.
create function public.generate_monthly_charges(p_month date, p_property_id uuid default null)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_total int := 0;
begin
  for v_org_id in select private.user_org_ids() loop
    v_total := v_total + private.create_scheduled_charges(v_org_id, p_month, p_property_id, false);
  end loop;
  -- Seed and admin sessions have no user: every organization.
  if (select auth.uid()) is null then
    for v_org_id in select id from public.organizations loop
      v_total := v_total + private.create_scheduled_charges(v_org_id, p_month, p_property_id, false);
    end loop;
  end if;
  return v_total;
end;
$$;

revoke execute on function public.generate_monthly_charges(date, uuid) from public, anon;
grant execute on function public.generate_monthly_charges(date, uuid) to authenticated;

-- Kept for callers of the Phase 4 name; rent now comes from the schedule.
create or replace function public.generate_monthly_rent(p_month date, p_property_id uuid default null)
returns int
language sql
security invoker
set search_path = ''
as $$
  select public.generate_monthly_charges(p_month, p_property_id);
$$;

-- The scheduler (pg_cron, hourly): each organization's current month, in its
-- own time zone, so charges appear early on the 1st wherever it is. Tenancies
-- that start mid-month are picked up within the hour. Also keeps each active
-- tenancy's monthly_rent equal to its scheduled rent, so pages show the rent
-- in force once a change takes effect.
create function private.run_charge_schedule()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org record;
  v_total int := 0;
  v_rent_type_id uuid;
begin
  for v_org in select id, private.org_today(id) as today from public.organizations loop
    v_total := v_total
      + private.create_scheduled_charges(v_org.id, date_trunc('month', v_org.today)::date, null, true);
  end loop;

  select id into v_rent_type_id from public.charge_types where org_id is null and key = 'rent';
  update public.tenancies tc
  set monthly_rent = scheduled.amount
  from (
    select t.id, i.amount
    from public.tenancies t
    cross join lateral private.unit_items_for_month(
      t.unit_id, date_trunc('month', private.org_today(t.org_id))::date
    ) i
    where t.status = 'active' and i.charge_type_id = v_rent_type_id
  ) scheduled
  where scheduled.id = tc.id
    and tc.monthly_rent <> scheduled.amount;

  return v_total;
end;
$$;

revoke execute on function private.run_charge_schedule() from public, anon, authenticated;

select cron.schedule('bari-bhara-charge-schedule', '7 * * * *', 'select private.run_charge_schedule()');

-------------------------------------------------------------------------------
-- Metered bills
-------------------------------------------------------------------------------

alter table public.charges
  add column meter_previous numeric(12, 2) check (meter_previous >= 0),
  add column meter_current numeric(12, 2) check (meter_current >= 0),
  add column unit_rate numeric(12, 4) check (unit_rate >= 0),
  add constraint charges_meter_reading_check check (
    (meter_previous is null and meter_current is null and unit_rate is null)
    or (meter_previous is not null and meter_current is not null and unit_rate is not null
        and meter_current >= meter_previous)
  );

comment on column public.charges.meter_previous is 'Metered bills: the reading at the start of the period.';

grant insert (meter_previous, meter_current, unit_rate) on public.charges to authenticated;

-- The balance views carry the readings (appended, so existing columns keep their order).
create or replace view public.charge_balances
with (security_invoker = true)
as
select
  c.id,
  c.org_id,
  c.tenancy_id,
  c.unit_id,
  c.charge_type_id,
  c.category,
  c.billing_month,
  c.amount,
  c.due_date,
  c.amount_paid,
  c.status,
  c.description,
  c.voided_at,
  c.void_reason,
  c.created_at,
  ct.key as type_key,
  ct.label as type_label,
  (case when c.status = 'void' then 0 else c.amount - c.amount_paid end)::numeric(12, 2) as outstanding,
  case
    when c.status in ('unpaid', 'partially_paid') and c.due_date < private.org_today(c.org_id) then 'overdue'
    else c.status::text
  end as effective_status,
  c.meter_previous,
  c.meter_current,
  c.unit_rate
from public.charges c
join public.charge_types ct on ct.id = c.charge_type_id;

-- charge_overview expanded b.* when it was created; rebuild it to pick up the new columns.
drop view public.charge_overview;
create view public.charge_overview
with (security_invoker = true)
as
select
  b.*,
  t.id as tenant_id,
  t.full_name as tenant_name,
  u.unit_number,
  p.id as property_id,
  p.name as property_name
from public.charge_balances b
join public.tenancies tc on tc.id = b.tenancy_id
join public.tenants t on t.id = tc.tenant_id
join public.units u on u.id = b.unit_id
join public.properties p on p.id = u.property_id;

revoke all on public.charge_overview from anon, authenticated;
grant select on public.charge_overview to authenticated;

-------------------------------------------------------------------------------
-- Prepaid meters
-------------------------------------------------------------------------------

alter table public.units
  add column electricity_account_no text not null default '' check (char_length(electricity_account_no) <= 40),
  add column electricity_meter_no text not null default '' check (char_length(electricity_meter_no) <= 40),
  add column gas_meter_no text not null default '' check (char_length(gas_meter_no) <= 40);

grant insert (electricity_account_no, electricity_meter_no, gas_meter_no) on public.units to authenticated;
grant update (electricity_account_no, electricity_meter_no, gas_meter_no) on public.units to authenticated;

-- Tenants top up prepaid meters themselves, so my_tenancies() shares the numbers.
drop function public.my_tenancies();

create function public.my_tenancies()
returns table (
  tenancy_id uuid,
  status public.tenancy_status,
  monthly_rent numeric,
  security_deposit numeric,
  move_in_date date,
  move_out_date date,
  unit_id uuid,
  unit_number text,
  floor text,
  unit_type text,
  bedrooms smallint,
  property_name text,
  property_address text,
  property_city text,
  rent_due_day smallint,
  organization_name text,
  currency text,
  timezone text,
  property_id uuid,
  org_id uuid,
  electricity_account_no text,
  electricity_meter_no text,
  gas_meter_no text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    tc.id,
    tc.status,
    tc.monthly_rent,
    tc.security_deposit,
    tc.move_in_date,
    tc.move_out_date,
    u.id,
    u.unit_number,
    u.floor,
    u.unit_type,
    u.bedrooms,
    p.name,
    p.address,
    p.city,
    p.rent_due_day,
    o.name,
    o.currency,
    o.timezone,
    p.id,
    o.id,
    u.electricity_account_no,
    u.electricity_meter_no,
    u.gas_meter_no
  from public.tenants t
  join public.tenancies tc on tc.tenant_id = t.id
  join public.units u on u.id = tc.unit_id
  join public.properties p on p.id = u.property_id
  join public.organizations o on o.id = t.org_id
  where t.user_id = (select auth.uid())
  order by (tc.status = 'active') desc, tc.move_in_date desc;
$$;

revoke execute on function public.my_tenancies() from public, anon;
grant execute on function public.my_tenancies() to authenticated;
