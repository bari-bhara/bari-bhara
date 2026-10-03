-- Phase 6 — Notices with audience targeting and read receipts
-- See docs/plans/0001-initial-architecture-and-roadmap.md (Phase 6 detail).
--
-- Targeting is evaluated live against tenants' *active* tenancies, so a tenant
-- who moves in later sees current notices with no fan-out rows.
--
-- Custom SQLSTATEs raised here (others in earlier phases):
--   BB012  a units notice needs at least one unit

-------------------------------------------------------------------------------
-- Types and tables
-------------------------------------------------------------------------------

create type public.notice_audience as enum ('all', 'property', 'units');

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  body text not null check (char_length(body) between 1 and 5000),
  audience public.notice_audience not null default 'all',
  property_id uuid,
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, property_id) references public.properties (org_id, id) on delete cascade,
  check ((audience = 'property') = (property_id is not null)),
  check (expires_at is null or expires_at > publish_at),
  unique (org_id, id)
);

comment on table public.notices is 'Announcements to all tenants, one property, or chosen units. No landlord-only columns.';

create index notices_org_id_publish_at_idx on public.notices (org_id, publish_at desc);
create index notices_property_id_org_id_idx on public.notices (property_id, org_id);
create index notices_created_by_idx on public.notices (created_by);

create table public.notice_units (
  notice_id uuid not null,
  unit_id uuid not null,
  org_id uuid not null,
  primary key (notice_id, unit_id),
  foreign key (org_id, notice_id) references public.notices (org_id, id) on delete cascade,
  foreign key (org_id, unit_id) references public.units (org_id, id) on delete cascade
);

create index notice_units_unit_id_org_id_idx on public.notice_units (unit_id, org_id);
create index notice_units_org_id_notice_id_idx on public.notice_units (org_id, notice_id);

create table public.notice_reads (
  notice_id uuid not null references public.notices (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notice_id, user_id)
);

create index notice_reads_user_id_idx on public.notice_reads (user_id);

create trigger notices_set_updated_at
  before update on public.notices
  for each row execute function private.set_updated_at();

-------------------------------------------------------------------------------
-- Targeting
-------------------------------------------------------------------------------

-- Notices the caller can see as a tenant: published, not expired, and aimed at
-- one of their active tenancies. Evaluated once per query in policies.
create function private.user_visible_notice_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct n.id
  from public.tenants t
  join public.tenancies tc on tc.tenant_id = t.id and tc.status = 'active'
  join public.units u on u.id = tc.unit_id
  join public.notices n on n.org_id = tc.org_id
  where t.user_id = (select auth.uid())
    and n.publish_at <= now()
    and (n.expires_at is null or n.expires_at > now())
    and (
      n.audience = 'all'
      or (n.audience = 'property' and n.property_id = u.property_id)
      or (
        n.audience = 'units'
        and exists (select 1 from public.notice_units nu where nu.notice_id = n.id and nu.unit_id = u.id)
      )
    );
$$;

-- Single-notice form of the same rule.
create function private.can_see_notice(p_notice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_notice_id in (select private.user_visible_notice_ids());
$$;

revoke execute on function private.user_visible_notice_ids(), private.can_see_notice(uuid) from public, anon;
grant execute on function private.user_visible_notice_ids(), private.can_see_notice(uuid) to authenticated;

create function private.log_notice_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.log_activity(
    new.org_id, 'NOTICE_CREATED', 'notice', new.id,
    jsonb_build_object('title', new.title, 'audience', new.audience, 'publish_at', new.publish_at)
  );
  return null;
end;
$$;

create trigger notices_log_created
  after insert on public.notices
  for each row execute function private.log_notice_created();

revoke execute on function private.log_notice_created() from public, anon, authenticated;

-------------------------------------------------------------------------------
-- Views
-------------------------------------------------------------------------------

-- Notices with the caller's read state. Tenants only get notices they can see.
create view public.my_notices
with (security_invoker = true)
as
select
  n.id,
  n.org_id,
  n.title,
  n.body,
  n.audience,
  n.publish_at,
  n.expires_at,
  n.created_at,
  exists (
    select 1 from public.notice_reads r
    where r.notice_id = n.id and r.user_id = (select auth.uid())
  ) as is_read
from public.notices n;

-- Landlord list: notices with targeting summary and read counts.
create view public.notice_overview
with (security_invoker = true)
as
select
  n.*,
  p.name as property_name,
  (select count(*) from public.notice_units nu where nu.notice_id = n.id)::int as unit_count,
  (select count(*) from public.notice_reads r where r.notice_id = n.id)::int as read_count
from public.notices n
left join public.properties p on p.id = n.property_id;

-------------------------------------------------------------------------------
-- RPC
-------------------------------------------------------------------------------

-- Creates a notice and its unit targets atomically, under the caller's RLS.
create function public.create_notice(
  p_org_id uuid,
  p_title text,
  p_body text,
  p_audience public.notice_audience,
  p_property_id uuid,
  p_unit_ids uuid[],
  p_publish_at timestamptz,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_audience = 'units' and coalesce(cardinality(p_unit_ids), 0) = 0 then
    raise exception 'Choose at least one unit.' using errcode = 'BB012';
  end if;

  insert into public.notices (org_id, title, body, audience, property_id, publish_at, expires_at)
  values (
    p_org_id, btrim(p_title), btrim(p_body), p_audience,
    case when p_audience = 'property' then p_property_id end,
    coalesce(p_publish_at, now()), p_expires_at
  )
  returning id into v_id;

  if p_audience = 'units' then
    -- Composite FKs reject units outside the organization.
    insert into public.notice_units (notice_id, unit_id, org_id)
    select v_id, unit_id, p_org_id from unnest(p_unit_ids) as unit_id
    on conflict do nothing;
  end if;

  return v_id;
end;
$$;

revoke execute on function
  public.create_notice(uuid, text, text, public.notice_audience, uuid, uuid[], timestamptz, timestamptz)
from public, anon;
grant execute on function
  public.create_notice(uuid, text, text, public.notice_audience, uuid, uuid[], timestamptz, timestamptz)
to authenticated;

-------------------------------------------------------------------------------
-- Grants
-------------------------------------------------------------------------------

revoke all on
  public.notices, public.notice_units, public.notice_reads, public.my_notices, public.notice_overview
from anon, authenticated;

-- No edit: delete and re-create.
grant select, delete on public.notices to authenticated;
grant insert (org_id, title, body, audience, property_id, publish_at, expires_at) on public.notices to authenticated;

grant select on public.notice_units to authenticated;
grant insert (notice_id, unit_id, org_id) on public.notice_units to authenticated;

grant select on public.notice_reads to authenticated;
grant insert (notice_id) on public.notice_reads to authenticated;

grant select on public.my_notices, public.notice_overview to authenticated;

-------------------------------------------------------------------------------
-- Row Level Security
-------------------------------------------------------------------------------

alter table public.notices enable row level security;
alter table public.notice_units enable row level security;
alter table public.notice_reads enable row level security;

create policy "Members see their org's notices; tenants see notices aimed at them"
  on public.notices for select
  to authenticated
  using (
    org_id in (select private.user_org_ids())
    or id in (select private.user_visible_notice_ids())
  );

create policy "Members can create notices in their organization"
  on public.notices for insert
  to authenticated
  with check (org_id in (select private.user_org_ids()));

create policy "Members can delete their organization's notices"
  on public.notices for delete
  to authenticated
  using (org_id in (select private.user_org_ids()));

create policy "Members can view their organization's notice targets"
  on public.notice_units for select
  to authenticated
  using (org_id in (select private.user_org_ids()));

create policy "Members can target their organization's notices"
  on public.notice_units for insert
  to authenticated
  with check (org_id in (select private.user_org_ids()));

create policy "Users see their own reads; members see reads of their org's notices"
  on public.notice_reads for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or notice_id in (
      select n.id from public.notices n where n.org_id in (select private.user_org_ids())
    )
  );

create policy "Tenants can mark visible notices as read"
  on public.notice_reads for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and notice_id in (select private.user_visible_notice_ids())
  );
