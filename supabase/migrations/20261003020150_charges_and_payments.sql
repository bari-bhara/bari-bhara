-- Phase 4 — Rent, utility bills and payments
-- See docs/plans/0001-initial-architecture-and-roadmap.md (Phase 4 detail) and docs/adr/0004.
--
-- Custom SQLSTATEs raised here (mapped to messages in the app; BB001–BB005 are in Phase 3):
--   BB004  not found (or not in the caller's organization)
--   BB006  the charge is void and can't change or take payments
--   BB007  a charge with live payments can't be voided
--   BB008  overpayment: payments would exceed the charge amount
--   BB009  the payment is already void

-------------------------------------------------------------------------------
-- Types
-------------------------------------------------------------------------------

create type public.charge_category as enum ('rent', 'utility');
create type public.charge_status as enum ('unpaid', 'partially_paid', 'paid', 'void');
create type public.payment_method as enum ('cash', 'bank_transfer', 'bkash', 'nagad', 'card', 'other');

-------------------------------------------------------------------------------
-- Tables
-------------------------------------------------------------------------------

create table public.charge_types (
  id uuid primary key default gen_random_uuid(),
  -- null = system default, visible to everyone.
  org_id uuid references public.organizations (id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  label text not null check (char_length(label) between 1 and 60),
  category public.charge_category not null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (org_id, key),
  -- Exactly one rent type: the system 'rent'. Custom types are utilities.
  check ((category = 'rent') = (org_id is null and key = 'rent'))
);

comment on table public.charge_types is 'Kinds of charge: system defaults plus per-organization utility types.';

insert into public.charge_types (key, label, category) values
  ('rent', 'Rent', 'rent'),
  ('electricity', 'Electricity', 'utility'),
  ('gas', 'Gas', 'utility'),
  ('water', 'Water', 'utility'),
  ('internet', 'Internet', 'utility'),
  ('other', 'Other', 'utility');

create table public.charges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  tenancy_id uuid not null,
  -- Filled from the tenancy by trigger.
  unit_id uuid not null,
  charge_type_id uuid not null references public.charge_types (id) on delete restrict,
  -- Copied from the charge type by trigger, for filtering and the rent index.
  category public.charge_category not null,
  billing_month date not null check (billing_month = date_trunc('month', billing_month)::date),
  amount numeric(12, 2) not null check (amount > 0),
  due_date date not null,
  -- Sum of live payments, maintained by trigger.
  amount_paid numeric(12, 2) not null default 0,
  -- Derived by trigger from amount_paid; users may only set 'void'.
  status public.charge_status not null default 'unpaid',
  -- Tenant-visible. charges has no landlord-only columns (ADR 0007).
  description text not null default '' check (char_length(description) <= 200),
  voided_at timestamptz,
  void_reason text not null default '' check (char_length(void_reason) <= 200),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, tenancy_id) references public.tenancies (org_id, id) on delete restrict,
  foreign key (org_id, unit_id) references public.units (org_id, id) on delete restrict,
  check (amount_paid >= 0 and amount_paid <= amount),
  check ((status = 'void') = (voided_at is not null)),
  unique (org_id, id)
);

comment on table public.charges is 'Rent and utility bills (ADR 0004). Voided, never deleted.';

-- Rent generation is idempotent; a voided rent charge can be generated again.
create unique index charges_one_rent_per_month
  on public.charges (tenancy_id, billing_month)
  where category = 'rent' and status <> 'void';
create index charges_tenancy_id_org_id_idx on public.charges (tenancy_id, org_id);
create index charges_unit_id_org_id_idx on public.charges (unit_id, org_id);
create index charges_charge_type_id_idx on public.charges (charge_type_id);
create index charges_created_by_idx on public.charges (created_by);
create index charges_org_id_billing_month_idx on public.charges (org_id, billing_month);
-- Overdue and outstanding lookups.
create index charges_open_by_due_date_idx
  on public.charges (org_id, due_date)
  where status in ('unpaid', 'partially_paid');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  charge_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  paid_on date not null,
  method public.payment_method not null,
  reference text not null default '' check (char_length(reference) <= 100),
  recorded_by uuid default auth.uid() references auth.users (id) on delete set null,
  voided_at timestamptz,
  void_reason text not null default '' check (char_length(void_reason) <= 200),
  created_at timestamptz not null default now(),
  foreign key (org_id, charge_id) references public.charges (org_id, id) on delete restrict
);

comment on table public.payments is 'Money received against a charge. Corrected by voiding, never deleted.';

create index payments_charge_id_org_id_idx on public.payments (charge_id, org_id);
create index payments_recorded_by_idx on public.payments (recorded_by);
create index payments_org_id_paid_on_idx on public.payments (org_id, paid_on desc);

create trigger charges_set_updated_at
  before update on public.charges
  for each row execute function private.set_updated_at();

-------------------------------------------------------------------------------
-- Helpers
-------------------------------------------------------------------------------

-- Today's date in the organization's time zone. Security definer so tenants,
-- who can't read organizations, still get correct overdue status.
create function private.org_today(p_org_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone o.timezone)::date
  from public.organizations o
  where o.id = p_org_id;
$$;

-- Tenant records linked to the caller's login.
create function private.user_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.tenants where user_id = (select auth.uid());
$$;

-- Tenancies (current and past) of the caller's tenant records.
create function private.user_tenancy_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tc.id
  from public.tenancies tc
  join public.tenants t on t.id = tc.tenant_id
  where t.user_id = (select auth.uid());
$$;

-- Organizations the caller rents from.
create function private.user_tenant_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct org_id from public.tenants where user_id = (select auth.uid());
$$;

revoke execute on function
  private.org_today(uuid),
  private.user_tenant_ids(),
  private.user_tenancy_ids(),
  private.user_tenant_org_ids()
from public, anon;
grant execute on function
  private.org_today(uuid),
  private.user_tenant_ids(),
  private.user_tenancy_ids(),
  private.user_tenant_org_ids()
to authenticated;

-------------------------------------------------------------------------------
-- Charge rules
-------------------------------------------------------------------------------

-- Fills derived columns on insert; derives status on update. The only status a
-- user can set is 'void', and only while no live payments remain.
create function private.prepare_charge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type_org_id uuid;
  v_category public.charge_category;
begin
  if tg_op = 'INSERT' then
    select unit_id into new.unit_id
    from public.tenancies
    where id = new.tenancy_id and org_id = new.org_id;
    if new.unit_id is null then
      raise exception 'Tenancy not found.' using errcode = 'BB004';
    end if;

    select org_id, category into v_type_org_id, v_category
    from public.charge_types
    where id = new.charge_type_id;
    if v_category is null or (v_type_org_id is not null and v_type_org_id <> new.org_id) then
      raise exception 'Charge type not found.' using errcode = 'BB004';
    end if;

    new.category := v_category;
    new.amount_paid := 0;
    new.status := 'unpaid';
    new.voided_at := null;
    return new;
  end if;

  if old.status = 'void' then
    raise exception 'This charge is void and can''t be changed.' using errcode = 'BB006';
  end if;

  if new.status = 'void' then
    if new.amount_paid > 0 then
      raise exception 'Void this charge''s payments first.' using errcode = 'BB007';
    end if;
    new.voided_at := now();
    return new;
  end if;

  new.status := case
    when new.amount_paid = 0 then 'unpaid'
    when new.amount_paid < new.amount then 'partially_paid'
    else 'paid'
  end;
  return new;
end;
$$;

create trigger charges_prepare
  before insert or update on public.charges
  for each row execute function private.prepare_charge();

create function private.log_charge_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.category = 'utility' then
    perform private.log_activity(
      new.org_id, 'BILL_CREATED', 'charge', new.id,
      jsonb_build_object('tenancy_id', new.tenancy_id, 'amount', new.amount, 'billing_month', new.billing_month)
    );
  elsif tg_op = 'UPDATE' and old.status <> 'void' and new.status = 'void' then
    perform private.log_activity(
      new.org_id, 'CHARGE_VOIDED', 'charge', new.id,
      jsonb_build_object('tenancy_id', new.tenancy_id, 'amount', new.amount, 'reason', new.void_reason)
    );
  end if;
  return null;
end;
$$;

create trigger charges_log_activity
  after insert or update of status on public.charges
  for each row execute function private.log_charge_activity();

-------------------------------------------------------------------------------
-- Payment rules
-------------------------------------------------------------------------------

-- Payments are recorded once and can only be voided, once.
create function private.guard_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.charges where id = new.charge_id and status = 'void') then
      raise exception 'This charge is void and can''t take payments.' using errcode = 'BB006';
    end if;
    new.voided_at := null;
    return new;
  end if;

  if old.voided_at is not null then
    raise exception 'This payment is already void.' using errcode = 'BB009';
  end if;
  if new.voided_at is not null then
    new.voided_at := now();
  end if;
  return new;
end;
$$;

create trigger payments_guard
  before insert or update on public.payments
  for each row execute function private.guard_payment();

-- Recomputes the charge's amount_paid from live payments, rejecting overpayment.
-- Locks the charge so concurrent payments are applied one at a time.
create function private.apply_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_amount numeric(12, 2);
  v_paid numeric(12, 2);
begin
  select amount into v_amount
  from public.charges
  where id = new.charge_id
  for update;

  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where charge_id = new.charge_id and voided_at is null;

  if v_paid > v_amount then
    raise exception 'This payment is more than the amount due.' using errcode = 'BB008';
  end if;

  update public.charges set amount_paid = v_paid where id = new.charge_id;

  if tg_op = 'INSERT' then
    perform private.log_activity(
      new.org_id, 'PAYMENT_RECORDED', 'payment', new.id,
      jsonb_build_object('charge_id', new.charge_id, 'amount', new.amount, 'method', new.method)
    );
  elsif old.voided_at is null and new.voided_at is not null then
    perform private.log_activity(
      new.org_id, 'PAYMENT_VOIDED', 'payment', new.id,
      jsonb_build_object('charge_id', new.charge_id, 'amount', new.amount, 'reason', new.void_reason)
    );
  end if;
  return null;
end;
$$;

create trigger payments_apply
  after insert or update of voided_at on public.payments
  for each row execute function private.apply_payment();

revoke execute on function
  private.prepare_charge(),
  private.log_charge_activity(),
  private.guard_payment(),
  private.apply_payment()
from public, anon, authenticated;

-------------------------------------------------------------------------------
-- Views
-------------------------------------------------------------------------------

-- Every balance read goes through this view (ADR 0004). Overdue is derived,
-- never stored: unpaid or partly paid, and due before today in the org's zone.
create view public.charge_balances
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
  end as effective_status
from public.charges c
join public.charge_types ct on ct.id = c.charge_type_id;

-- Landlord lists: balances with tenant, unit and property names.
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

-- Landlord payment list: payments with what they paid for and who paid.
create view public.payment_overview
with (security_invoker = true)
as
select
  py.id,
  py.org_id,
  py.charge_id,
  py.amount,
  py.paid_on,
  py.method,
  py.reference,
  py.voided_at,
  py.void_reason,
  py.created_at,
  c.category,
  c.billing_month,
  ct.label as type_label,
  t.id as tenant_id,
  t.full_name as tenant_name,
  u.unit_number,
  p.name as property_name
from public.payments py
join public.charges c on c.id = py.charge_id
join public.charge_types ct on ct.id = c.charge_type_id
join public.tenancies tc on tc.id = c.tenancy_id
join public.tenants t on t.id = tc.tenant_id
join public.units u on u.id = c.unit_id
join public.properties p on p.id = u.property_id;

-------------------------------------------------------------------------------
-- RPCs
-------------------------------------------------------------------------------

-- generate_monthly_rent() runs as the caller, who can't call log_activity()
-- directly. This narrow wrapper logs only for organizations the caller belongs to.
create function private.log_rent_generated(p_org_id uuid, p_month date, p_count int, p_property_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- No user means a direct database session (seed, admin); API callers always have one.
  if (select auth.uid()) is not null and p_org_id not in (select private.user_org_ids()) then
    raise exception 'Not a member of this organization.' using errcode = 'BB004';
  end if;
  perform private.log_activity(
    p_org_id, 'RENT_GENERATED', 'organization', p_org_id,
    jsonb_build_object('billing_month', p_month, 'count', p_count, 'property_id', p_property_id)
  );
end;
$$;

revoke execute on function private.log_rent_generated(uuid, date, int, uuid) from public, anon;
grant execute on function private.log_rent_generated(uuid, date, int, uuid) to authenticated;

-- Creates the month's rent for every active tenancy (moved in by the month's
-- end) in one property, or in all of the caller's active properties. Runs
-- with the caller's privileges and RLS. Idempotent; returns how many it created.
create function public.generate_monthly_rent(p_month date, p_property_id uuid default null)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_month date := date_trunc('month', p_month)::date;
  v_month_end date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  v_rent_type_id uuid;
  v_org_ids uuid[];
  v_org record;
begin
  select id into v_rent_type_id from public.charge_types where org_id is null and key = 'rent';

  with created as (
    insert into public.charges (org_id, tenancy_id, charge_type_id, billing_month, amount, due_date, description)
    select
      tc.org_id,
      tc.id,
      v_rent_type_id,
      v_month,
      tc.monthly_rent,
      make_date(extract(year from v_month)::int, extract(month from v_month)::int, p.rent_due_day),
      'Rent for ' || to_char(v_month, 'FMMonth YYYY')
    from public.tenancies tc
    join public.units u on u.id = tc.unit_id
    join public.properties p on p.id = u.property_id
    where tc.status = 'active'
      and tc.monthly_rent > 0
      and tc.move_in_date <= v_month_end
      and p.archived_at is null
      and (p_property_id is null or p.id = p_property_id)
    on conflict (tenancy_id, billing_month) where category = 'rent' and status <> 'void' do nothing
    returning org_id
  )
  select coalesce(array_agg(org_id), '{}') into v_org_ids from created;

  for v_org in select o as org_id, count(*)::int as n from unnest(v_org_ids) o group by o loop
    perform private.log_rent_generated(v_org.org_id, v_month, v_org.n, p_property_id);
  end loop;

  return cardinality(v_org_ids);
end;
$$;

revoke execute on function public.generate_monthly_rent(date, uuid) from public, anon;
grant execute on function public.generate_monthly_rent(date, uuid) to authenticated;

-------------------------------------------------------------------------------
-- Grants (table and column level)
-------------------------------------------------------------------------------

revoke all on
  public.charge_types, public.charges, public.payments,
  public.charge_balances, public.charge_overview, public.payment_overview
from anon, authenticated;

-- Custom types get a UI later; until then they're read-only.
grant select on public.charge_types to authenticated;

-- No delete: void instead. Amounts are fixed once created; void and re-create to correct.
grant select on public.charges to authenticated;
grant insert (org_id, tenancy_id, charge_type_id, billing_month, amount, due_date, description)
  on public.charges to authenticated;
grant update (status, void_reason) on public.charges to authenticated;

grant select on public.payments to authenticated;
grant insert (org_id, charge_id, amount, paid_on, method, reference) on public.payments to authenticated;
grant update (voided_at, void_reason) on public.payments to authenticated;

grant select on public.charge_balances, public.charge_overview, public.payment_overview to authenticated;

-------------------------------------------------------------------------------
-- Row Level Security
-- Landlords/managers: their organizations. Tenants: read-only, their own
-- non-void charges and payments (no landlord-only columns here; ADR 0007).
-------------------------------------------------------------------------------

alter table public.charge_types enable row level security;
alter table public.charges enable row level security;
alter table public.payments enable row level security;

-- charge_types
create policy "Users can view system and their organizations' charge types"
  on public.charge_types for select
  to authenticated
  using (
    org_id is null
    or org_id in (select private.user_org_ids())
    or org_id in (select private.user_tenant_org_ids())
  );

-- charges
create policy "Members and the charged tenant can view charges"
  on public.charges for select
  to authenticated
  using (
    org_id in (select private.user_org_ids())
    or (status <> 'void' and tenancy_id in (select private.user_tenancy_ids()))
  );

create policy "Members can add charges to their organization"
  on public.charges for insert
  to authenticated
  with check (org_id in (select private.user_org_ids()));

create policy "Members can update their organization's charges"
  on public.charges for update
  to authenticated
  using (org_id in (select private.user_org_ids()))
  with check (org_id in (select private.user_org_ids()));

-- payments
create policy "Members and the paying tenant can view payments"
  on public.payments for select
  to authenticated
  using (
    org_id in (select private.user_org_ids())
    or (
      voided_at is null
      and charge_id in (
        select c.id from public.charges c
        where c.tenancy_id in (select private.user_tenancy_ids())
      )
    )
  );

create policy "Members can record payments in their organization"
  on public.payments for insert
  to authenticated
  with check (org_id in (select private.user_org_ids()));

create policy "Members can void payments in their organization"
  on public.payments for update
  to authenticated
  using (org_id in (select private.user_org_ids()))
  with check (org_id in (select private.user_org_ids()));
