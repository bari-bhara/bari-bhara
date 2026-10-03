-- Phase 3 — Tenants, tenancies, invites, occupancy, activity log
-- See docs/plans/0001-initial-architecture-and-roadmap.md (Phase 3 detail),
-- docs/adr/0002 (invite codes), 0003 (RLS) and 0007 (tenant reads).
--
-- Custom SQLSTATEs raised here (mapped to messages in the app):
--   BB001  unit not available for a new tenancy (inactive, or property archived)
--   BB002  a moved-out tenancy can't be changed
--   BB003  unit status must match occupancy ('occupied' iff an active tenancy exists)
--   BB004  not found (or not in the caller's organization)
--   BB005  tenant already has an app login

-------------------------------------------------------------------------------
-- Types
-------------------------------------------------------------------------------

create type public.tenancy_status as enum ('active', 'moved_out');

-------------------------------------------------------------------------------
-- Tables
-------------------------------------------------------------------------------

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  phone text not null default '' check (char_length(phone) <= 30),
  email text not null default '' check (char_length(email) <= 254),
  -- Landlord-only. Tenants never read this table directly (ADR 0007).
  notes text not null default '' check (char_length(notes) <= 1000),
  -- Set only by claim_tenant_invite(); not writable through the API.
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  -- One tenant record per login per organization.
  unique (org_id, user_id)
);

comment on table public.tenants is 'A person renting (or who rented). May exist without a login.';

create index tenants_user_id_idx on public.tenants (user_id);
create index tenants_org_id_full_name_idx on public.tenants (org_id, full_name);

create table public.tenancies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  tenant_id uuid not null,
  unit_id uuid not null,
  monthly_rent numeric(12, 2) not null check (monthly_rent >= 0),
  security_deposit numeric(12, 2) not null default 0 check (security_deposit >= 0),
  move_in_date date not null,
  move_out_date date,
  move_out_reason text not null default '' check (char_length(move_out_reason) <= 120),
  -- Landlord-only (ADR 0007).
  move_out_notes text not null default '' check (char_length(move_out_notes) <= 1000),
  status public.tenancy_status not null default 'active',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, tenant_id) references public.tenants (org_id, id) on delete restrict,
  foreign key (org_id, unit_id) references public.units (org_id, id) on delete restrict,
  check (move_out_date is null or move_out_date >= move_in_date),
  check ((status = 'moved_out') = (move_out_date is not null)),
  unique (org_id, id)
);

comment on table public.tenancies is 'A tenant living in a unit over a period. Ended by moving out; never deleted.';

-- At most one current tenancy per unit.
create unique index tenancies_one_active_per_unit on public.tenancies (unit_id) where status = 'active';
-- FK indexes (also serve lookups by tenant and by unit).
create index tenancies_tenant_id_org_id_idx on public.tenancies (tenant_id, org_id);
create index tenancies_unit_id_org_id_idx on public.tenancies (unit_id, org_id);
create index tenancies_created_by_idx on public.tenancies (created_by);

create table public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  tenant_id uuid not null,
  -- sha256 of the normalized code. The plaintext is returned once and never stored.
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (org_id, tenant_id) references public.tenants (org_id, id) on delete cascade
);

comment on table public.tenant_invites is 'One-time codes a tenant uses to link their login to their tenant record (ADR 0002).';

create index tenant_invites_tenant_id_org_id_idx on public.tenant_invites (tenant_id, org_id);
create index tenant_invites_used_by_idx on public.tenant_invites (used_by);
create index tenant_invites_created_by_idx on public.tenant_invites (created_by);

-- Failed claim attempts per user, for the lockout. Not exposed through the API.
create table private.invite_claim_failures (
  user_id uuid primary key references auth.users (id) on delete cascade,
  failed_count int not null default 0,
  last_failed_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  event_type text not null check (event_type ~ '^[A-Z][A-Z_]*$'),
  entity_type text not null check (char_length(entity_type) between 1 and 40),
  entity_id uuid not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

comment on table public.activity_log is 'Audit trail and dashboard activity. Written only by security-definer triggers and RPCs.';

create index activity_log_org_id_created_at_idx on public.activity_log (org_id, created_at desc);
create index activity_log_entity_id_idx on public.activity_log (entity_id);
create index activity_log_actor_id_idx on public.activity_log (actor_id);

create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function private.set_updated_at();

create trigger tenancies_set_updated_at
  before update on public.tenancies
  for each row execute function private.set_updated_at();

-------------------------------------------------------------------------------
-- Activity log
-------------------------------------------------------------------------------

create function private.log_activity(
  p_org_id uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity_log (org_id, actor_id, event_type, entity_type, entity_id, metadata)
  values (p_org_id, (select auth.uid()), p_event_type, p_entity_type, p_entity_id, p_metadata);
$$;

create function private.log_tenant_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.log_activity(
    new.org_id, 'TENANT_CREATED', 'tenant', new.id,
    jsonb_build_object('full_name', new.full_name)
  );
  return null;
end;
$$;

create trigger tenants_log_created
  after insert on public.tenants
  for each row execute function private.log_tenant_created();

create function private.log_tenancy_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status = 'active' then
    perform private.log_activity(
      new.org_id, 'TENANT_MOVED_IN', 'tenancy', new.id,
      jsonb_build_object('tenant_id', new.tenant_id, 'unit_id', new.unit_id, 'move_in_date', new.move_in_date)
    );
  elsif tg_op = 'UPDATE' and old.status = 'active' and new.status = 'moved_out' then
    perform private.log_activity(
      new.org_id, 'TENANT_MOVED_OUT', 'tenancy', new.id,
      jsonb_build_object(
        'tenant_id', new.tenant_id, 'unit_id', new.unit_id,
        'move_out_date', new.move_out_date, 'reason', new.move_out_reason
      )
    );
  end if;
  return null;
end;
$$;

create trigger tenancies_log_activity
  after insert or update of status on public.tenancies
  for each row execute function private.log_tenancy_activity();

-------------------------------------------------------------------------------
-- Tenancy rules and occupancy
-------------------------------------------------------------------------------

-- New tenancies need an available unit; ended tenancies are history and frozen.
create function private.guard_tenancy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unit_status public.unit_status;
  v_archived_at timestamptz;
begin
  if tg_op = 'INSERT' then
    if new.status = 'active' then
      select u.status, p.archived_at
      into v_unit_status, v_archived_at
      from public.units u
      join public.properties p on p.id = u.property_id
      where u.id = new.unit_id;

      if v_unit_status = 'inactive' then
        raise exception 'This unit is inactive.' using errcode = 'BB001';
      end if;
      if v_archived_at is not null then
        raise exception 'This property is archived.' using errcode = 'BB001';
      end if;
    end if;
    return new;
  end if;

  if old.status = 'moved_out'
    and (new.status, new.move_in_date, new.move_out_date, new.monthly_rent, new.security_deposit)
      is distinct from
        (old.status, old.move_in_date, old.move_out_date, old.monthly_rent, old.security_deposit)
  then
    raise exception 'A moved-out tenancy can''t be changed.' using errcode = 'BB002';
  end if;
  return new;
end;
$$;

create trigger tenancies_guard
  before insert or update on public.tenancies
  for each row execute function private.guard_tenancy();

-- Keeps units.status in step with active tenancies.
create function private.sync_unit_occupancy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.tenancies
    where unit_id = new.unit_id and status = 'active'
  ) then
    update public.units set status = 'occupied'
    where id = new.unit_id and status <> 'occupied';
  else
    update public.units set status = 'vacant'
    where id = new.unit_id and status = 'occupied';
  end if;
  return null;
end;
$$;

create trigger tenancies_sync_unit_occupancy
  after insert or update of status on public.tenancies
  for each row execute function private.sync_unit_occupancy();

-- 'occupied' iff the unit has an active tenancy, however the status is written.
create function private.enforce_unit_occupancy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_has_active boolean;
begin
  v_has_active := tg_op = 'UPDATE' and exists (
    select 1 from public.tenancies
    where unit_id = new.id and status = 'active'
  );

  if new.status = 'occupied' and not v_has_active then
    raise exception 'A unit becomes occupied when a tenant moves in.' using errcode = 'BB003';
  end if;
  if new.status <> 'occupied' and v_has_active then
    raise exception 'An occupied unit becomes vacant when its tenant moves out.' using errcode = 'BB003';
  end if;
  return new;
end;
$$;

create trigger units_enforce_occupancy
  before insert or update of status on public.units
  for each row execute function private.enforce_unit_occupancy();

revoke execute on function
  private.log_activity(uuid, text, text, uuid, jsonb),
  private.log_tenant_created(),
  private.log_tenancy_activity(),
  private.guard_tenancy(),
  private.sync_unit_occupancy(),
  private.enforce_unit_occupancy()
from public, anon, authenticated;

-------------------------------------------------------------------------------
-- Views
-------------------------------------------------------------------------------

-- Each tenant with their current tenancy, or their latest one if they've moved out.
create view public.tenant_overview
with (security_invoker = true)
as
select
  t.id,
  t.org_id,
  t.full_name,
  t.phone,
  t.email,
  (t.user_id is not null) as has_login,
  t.created_at,
  tc.id as tenancy_id,
  tc.status as tenancy_status,
  tc.monthly_rent,
  tc.move_in_date,
  tc.move_out_date,
  u.id as unit_id,
  u.unit_number,
  p.id as property_id,
  p.name as property_name
from public.tenants t
left join lateral (
  select x.*
  from public.tenancies x
  where x.tenant_id = t.id
  order by (x.status = 'active') desc, x.move_in_date desc
  limit 1
) tc on true
left join public.units u on u.id = tc.unit_id
left join public.properties p on p.id = u.property_id;

-------------------------------------------------------------------------------
-- RPCs
-------------------------------------------------------------------------------

-- Creates a tenant and their first tenancy in one transaction, under the
-- caller's privileges and RLS.
create function public.add_tenant(
  p_unit_id uuid,
  p_full_name text,
  p_phone text,
  p_email text,
  p_notes text,
  p_monthly_rent numeric,
  p_security_deposit numeric,
  p_move_in_date date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_tenant_id uuid;
begin
  select org_id into v_org_id from public.units where id = p_unit_id;
  if v_org_id is null then
    raise exception 'Unit not found.' using errcode = 'BB004';
  end if;

  insert into public.tenants (org_id, full_name, phone, email, notes)
  values (v_org_id, p_full_name, p_phone, p_email, p_notes)
  returning id into v_tenant_id;

  insert into public.tenancies (org_id, tenant_id, unit_id, monthly_rent, security_deposit, move_in_date)
  values (v_org_id, v_tenant_id, p_unit_id, p_monthly_rent, p_security_deposit, p_move_in_date);

  return v_tenant_id;
end;
$$;

-- Issues a new invite code for an unlinked tenant, replacing any unused one.
-- Returns the plaintext once; only its hash is stored.
create function public.create_tenant_invite(p_tenant_id uuid)
returns table (invite_code text, invite_expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  -- Crockford base32: no I, L, O or U.
  c_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_org_id uuid;
  v_user_id uuid;
  v_bytes bytea;
  v_code text := '';
  v_expires_at timestamptz;
begin
  select t.org_id, t.user_id
  into v_org_id, v_user_id
  from public.tenants t
  where t.id = p_tenant_id
    and t.org_id in (select private.user_org_ids());

  if v_org_id is null then
    raise exception 'Tenant not found.' using errcode = 'BB004';
  end if;
  if v_user_id is not null then
    raise exception 'This tenant already has an app login.' using errcode = 'BB005';
  end if;

  delete from public.tenant_invites
  where tenant_id = p_tenant_id and used_at is null;

  -- 10 characters x 5 bits = 50 bits. 256 is a multiple of 32, so byte % 32 is unbiased.
  v_bytes := extensions.gen_random_bytes(10);
  for i in 0..9 loop
    v_code := v_code || substr(c_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;

  insert into public.tenant_invites (org_id, tenant_id, code_hash, created_by)
  values (v_org_id, p_tenant_id, encode(extensions.digest(v_code, 'sha256'), 'hex'), (select auth.uid()))
  returning expires_at into v_expires_at;

  perform private.log_activity(v_org_id, 'TENANT_INVITE_CREATED', 'tenant', p_tenant_id);

  return query select v_code, v_expires_at;
end;
$$;

-- Links the calling tenant's login to the tenant record behind a valid code.
-- Returns a status instead of raising, so the failure count isn't rolled back:
--   linked | invalid | locked | not_tenant | already_linked
create function public.claim_tenant_invite(p_code text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_max_failures constant int := 10;
  c_lockout constant interval := interval '24 hours';
  v_user_id uuid := (select auth.uid());
  v_role public.user_role;
  v_failures private.invite_claim_failures;
  v_code text;
  v_invite public.tenant_invites;
  v_tenant public.tenants;
begin
  select role into v_role from public.profiles where id = v_user_id;
  if v_role is distinct from 'tenant' then
    return 'not_tenant';
  end if;

  select * into v_failures from private.invite_claim_failures where user_id = v_user_id;
  if found
    and v_failures.failed_count >= c_max_failures
    and v_failures.last_failed_at > now() - c_lockout
  then
    return 'locked';
  end if;

  -- Forgiving input: case, spaces and dashes don't matter; O/I/L read as 0/1/1.
  v_code := translate(upper(regexp_replace(coalesce(p_code, ''), '[[:space:]-]', '', 'g')), 'OIL', '011');

  select * into v_invite
  from public.tenant_invites
  where code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex')
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    insert into private.invite_claim_failures as f (user_id, failed_count, last_failed_at)
    values (v_user_id, 1, now())
    on conflict (user_id) do update set
      failed_count = case
        when f.last_failed_at < now() - c_lockout then 1
        else f.failed_count + 1
      end,
      last_failed_at = now();
    return 'invalid';
  end if;

  select * into v_tenant from public.tenants where id = v_invite.tenant_id for update;
  if v_tenant.user_id is not null
    or exists (
      select 1 from public.tenants
      where org_id = v_tenant.org_id and user_id = v_user_id
    )
  then
    return 'already_linked';
  end if;

  update public.tenants set user_id = v_user_id where id = v_tenant.id;
  update public.tenant_invites set used_at = now(), used_by = v_user_id where id = v_invite.id;
  delete from private.invite_claim_failures where user_id = v_user_id;

  perform private.log_activity(v_tenant.org_id, 'TENANT_LINKED', 'tenant', v_tenant.id);
  return 'linked';
end;
$$;

-- The calling tenant's tenancies, current first, with tenant-safe columns only
-- (no landlord notes). See ADR 0007.
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
  timezone text
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
    o.timezone
  from public.tenants t
  join public.tenancies tc on tc.tenant_id = t.id
  join public.units u on u.id = tc.unit_id
  join public.properties p on p.id = u.property_id
  join public.organizations o on o.id = t.org_id
  where t.user_id = (select auth.uid())
  order by (tc.status = 'active') desc, tc.move_in_date desc;
$$;

revoke execute on function
  public.add_tenant(uuid, text, text, text, text, numeric, numeric, date),
  public.create_tenant_invite(uuid),
  public.claim_tenant_invite(text),
  public.my_tenancies()
from public, anon;

grant execute on function
  public.add_tenant(uuid, text, text, text, text, numeric, numeric, date),
  public.create_tenant_invite(uuid),
  public.claim_tenant_invite(text),
  public.my_tenancies()
to authenticated;

-------------------------------------------------------------------------------
-- Grants (table and column level)
-------------------------------------------------------------------------------

revoke all on
  public.tenants, public.tenancies, public.tenant_invites, public.activity_log, public.tenant_overview
from anon, authenticated;
revoke all on private.invite_claim_failures from public, anon, authenticated;

-- No delete: tenant records and tenancies are history.
grant select on public.tenants to authenticated;
grant insert (org_id, full_name, phone, email, notes) on public.tenants to authenticated;
grant update (full_name, phone, email, notes) on public.tenants to authenticated;

-- Status only moves active → moved_out (guard trigger); unit and tenant never change.
grant select on public.tenancies to authenticated;
grant insert (org_id, tenant_id, unit_id, monthly_rent, security_deposit, move_in_date)
  on public.tenancies to authenticated;
grant update (monthly_rent, security_deposit, status, move_out_date, move_out_reason, move_out_notes)
  on public.tenancies to authenticated;

-- Everything except code_hash. Written only by the invite RPCs.
grant select (id, org_id, tenant_id, expires_at, used_at, used_by, created_by, created_at)
  on public.tenant_invites to authenticated;

grant select on public.activity_log to authenticated;
grant select on public.tenant_overview to authenticated;

-------------------------------------------------------------------------------
-- Row Level Security
-- Landlord/manager access only. Tenants read through my_tenancies() (ADR 0007).
-------------------------------------------------------------------------------

alter table public.tenants enable row level security;
alter table public.tenancies enable row level security;
alter table public.tenant_invites enable row level security;
alter table public.activity_log enable row level security;
alter table private.invite_claim_failures enable row level security;

-- tenants
create policy "Members can view their organization's tenants"
  on public.tenants for select
  to authenticated
  using (org_id in (select private.user_org_ids()));

create policy "Members can add tenants to their organization"
  on public.tenants for insert
  to authenticated
  with check (org_id in (select private.user_org_ids()));

create policy "Members can update their organization's tenants"
  on public.tenants for update
  to authenticated
  using (org_id in (select private.user_org_ids()))
  with check (org_id in (select private.user_org_ids()));

-- tenancies
create policy "Members can view their organization's tenancies"
  on public.tenancies for select
  to authenticated
  using (org_id in (select private.user_org_ids()));

create policy "Members can add tenancies to their organization"
  on public.tenancies for insert
  to authenticated
  with check (org_id in (select private.user_org_ids()));

create policy "Members can update their organization's tenancies"
  on public.tenancies for update
  to authenticated
  using (org_id in (select private.user_org_ids()))
  with check (org_id in (select private.user_org_ids()));

-- tenant_invites
create policy "Members can view their organization's tenant invites"
  on public.tenant_invites for select
  to authenticated
  using (org_id in (select private.user_org_ids()));

-- activity_log
create policy "Members can view their organization's activity"
  on public.activity_log for select
  to authenticated
  using (org_id in (select private.user_org_ids()));
