-- Phase 5 — Maintenance requests, updates and photos
-- See docs/plans/0001-initial-architecture-and-roadmap.md (Phase 5 detail) and docs/adr/0007.
--
-- Custom SQLSTATEs raised here (others in earlier phases):
--   BB004  not found (or not the caller's)
--   BB010  too many photos on one request
--   BB011  photo path doesn't match its request, or the file wasn't uploaded

-------------------------------------------------------------------------------
-- Types
-------------------------------------------------------------------------------

create type public.maintenance_category as enum (
  'plumbing', 'electrical', 'air_conditioning', 'water', 'door_lock', 'internet', 'appliance', 'other'
);
create type public.maintenance_status as enum ('pending', 'in_progress', 'resolved', 'cancelled');

-------------------------------------------------------------------------------
-- Tables
-------------------------------------------------------------------------------

create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  unit_id uuid not null,
  -- Set from the unit's current tenancy when a landlord raises the issue.
  tenancy_id uuid,
  tenant_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  category public.maintenance_category not null,
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  status public.maintenance_status not null default 'pending',
  -- Who's fixing it (free text, e.g. a plumber). Tenant-visible.
  assigned_to text not null default '' check (char_length(assigned_to) <= 120),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, unit_id) references public.units (org_id, id) on delete restrict,
  foreign key (org_id, tenancy_id) references public.tenancies (org_id, id) on delete restrict,
  foreign key (org_id, tenant_id) references public.tenants (org_id, id) on delete restrict,
  check ((status = 'resolved') = (resolved_at is not null)),
  unique (org_id, id)
);

comment on table public.maintenance_requests is 'Issues reported by tenants or raised by landlords. No landlord-only columns (ADR 0007).';

create index maintenance_requests_org_id_status_created_at_idx
  on public.maintenance_requests (org_id, status, created_at desc);
create index maintenance_requests_unit_id_org_id_idx on public.maintenance_requests (unit_id, org_id);
create index maintenance_requests_tenancy_id_org_id_idx on public.maintenance_requests (tenancy_id, org_id);
create index maintenance_requests_tenant_id_org_id_idx on public.maintenance_requests (tenant_id, org_id);
create index maintenance_requests_created_by_idx on public.maintenance_requests (created_by);

create table public.maintenance_updates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  request_id uuid not null,
  author_id uuid references auth.users (id) on delete set null,
  body text not null default '' check (char_length(body) <= 2000),
  -- Landlord-only notes. Tenants never see these rows (RLS).
  is_internal boolean not null default false,
  -- Set only by the status-change trigger.
  status_from public.maintenance_status,
  status_to public.maintenance_status,
  created_at timestamptz not null default now(),
  foreign key (org_id, request_id) references public.maintenance_requests (org_id, id) on delete cascade,
  -- A row is a comment, a status change, or both.
  check (status_to is not null or char_length(btrim(body)) > 0)
);

comment on table public.maintenance_updates is 'Comments, internal notes and status history for a request.';

create index maintenance_updates_request_id_created_at_idx
  on public.maintenance_updates (request_id, created_at);
create index maintenance_updates_org_id_request_id_idx on public.maintenance_updates (org_id, request_id);
create index maintenance_updates_author_id_idx on public.maintenance_updates (author_id);

create table public.maintenance_photos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  request_id uuid not null,
  -- {org_id}/{request_id}/{file} in the maintenance-photos bucket.
  storage_path text not null unique check (char_length(storage_path) <= 300),
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (org_id, request_id) references public.maintenance_requests (org_id, id) on delete cascade
);

create index maintenance_photos_request_id_org_id_idx on public.maintenance_photos (request_id, org_id);
create index maintenance_photos_uploaded_by_idx on public.maintenance_photos (uploaded_by);

create trigger maintenance_requests_set_updated_at
  before update on public.maintenance_requests
  for each row execute function private.set_updated_at();

-------------------------------------------------------------------------------
-- Access helper
-------------------------------------------------------------------------------

-- An org member, or the tenant the request belongs to.
create function private.can_access_maintenance_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.maintenance_requests r
    where r.id = p_request_id
      and (
        r.org_id in (select private.user_org_ids())
        or r.tenant_id in (select private.user_tenant_ids())
      )
  );
$$;

-- For storage policies: "{org_id}/{request_id}/{file}" where the request is in
-- that org and accessible to the caller. Malformed paths are simply refused.
create function private.can_access_maintenance_photo_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_org text := split_part(p_name, '/', 1);
  v_request text := split_part(p_name, '/', 2);
begin
  if v_org !~ c_uuid or v_request !~ c_uuid or split_part(p_name, '/', 3) = '' then
    return false;
  end if;
  return exists (
    select 1 from public.maintenance_requests r
    where r.id = v_request::uuid and r.org_id = v_org::uuid
  ) and private.can_access_maintenance_request(v_request::uuid);
end;
$$;

revoke execute on function
  private.can_access_maintenance_request(uuid),
  private.can_access_maintenance_photo_path(text)
from public, anon;
grant execute on function
  private.can_access_maintenance_request(uuid),
  private.can_access_maintenance_photo_path(text)
to authenticated;

-------------------------------------------------------------------------------
-- Request rules
-------------------------------------------------------------------------------

create function private.prepare_maintenance_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unit_id uuid;
begin
  if tg_op = 'INSERT' then
    if new.tenancy_id is null then
      -- Landlord-raised: link it to whoever lives there now, so they're informed.
      select id, tenant_id into new.tenancy_id, new.tenant_id
      from public.tenancies
      where unit_id = new.unit_id and status = 'active';
    else
      select unit_id, tenant_id into v_unit_id, new.tenant_id
      from public.tenancies
      where id = new.tenancy_id and org_id = new.org_id;
      if v_unit_id is distinct from new.unit_id then
        raise exception 'Tenancy not found for this unit.' using errcode = 'BB004';
      end if;
    end if;
    -- created_by isn't insertable by users; direct sessions (seed) may set it.
    new.created_by := coalesce((select auth.uid()), new.created_by);
    new.status := 'pending';
    new.resolved_at := null;
    return new;
  end if;

  if new.status is distinct from old.status then
    new.resolved_at := case when new.status = 'resolved' then now() end;
  end if;
  return new;
end;
$$;

create trigger maintenance_requests_prepare
  before insert or update on public.maintenance_requests
  for each row execute function private.prepare_maintenance_request();

-- History and activity for new requests and status changes.
create function private.log_maintenance_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_activity(
      new.org_id, 'MAINTENANCE_CREATED', 'maintenance_request', new.id,
      jsonb_build_object('title', new.title, 'category', new.category, 'unit_id', new.unit_id)
    );
  elsif new.status is distinct from old.status then
    insert into public.maintenance_updates (org_id, request_id, status_from, status_to)
    values (new.org_id, new.id, old.status, new.status);
    perform private.log_activity(
      new.org_id, 'MAINTENANCE_STATUS_CHANGED', 'maintenance_request', new.id,
      jsonb_build_object('title', new.title, 'from', old.status, 'to', new.status)
    );
  end if;
  return null;
end;
$$;

create trigger maintenance_requests_log
  after insert or update of status on public.maintenance_requests
  for each row execute function private.log_maintenance_request();

-- Org and author come from the request and the session, never from the client.
create function private.prepare_maintenance_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select org_id into new.org_id from public.maintenance_requests where id = new.request_id;
  if new.org_id is null then
    raise exception 'Request not found.' using errcode = 'BB004';
  end if;
  new.author_id := coalesce((select auth.uid()), new.author_id);
  return new;
end;
$$;

create trigger maintenance_updates_prepare
  before insert on public.maintenance_updates
  for each row execute function private.prepare_maintenance_update();

-- Photos: org from the request, path must match it and exist in storage, max 6.
create function private.prepare_maintenance_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select org_id into new.org_id from public.maintenance_requests where id = new.request_id;
  if new.org_id is null then
    raise exception 'Request not found.' using errcode = 'BB004';
  end if;
  if split_part(new.storage_path, '/', 1) <> new.org_id::text
    or split_part(new.storage_path, '/', 2) <> new.request_id::text
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'maintenance-photos' and name = new.storage_path
    )
  then
    raise exception 'Photo upload not found for this request.' using errcode = 'BB011';
  end if;
  if (select count(*) from public.maintenance_photos where request_id = new.request_id) >= 6 then
    raise exception 'A request can have at most 6 photos.' using errcode = 'BB010';
  end if;
  new.uploaded_by := coalesce((select auth.uid()), new.uploaded_by);
  return new;
end;
$$;

create trigger maintenance_photos_prepare
  before insert on public.maintenance_photos
  for each row execute function private.prepare_maintenance_photo();

revoke execute on function
  private.prepare_maintenance_request(),
  private.log_maintenance_request(),
  private.prepare_maintenance_update(),
  private.prepare_maintenance_photo()
from public, anon, authenticated;

-------------------------------------------------------------------------------
-- Views
-------------------------------------------------------------------------------

-- Landlord lists: requests with names and counts.
create view public.maintenance_overview
with (security_invoker = true)
as
select
  r.*,
  t.full_name as tenant_name,
  u.unit_number,
  p.id as property_id,
  p.name as property_name,
  (select count(*) from public.maintenance_photos ph where ph.request_id = r.id)::int as photo_count,
  (select count(*) from public.maintenance_updates mu where mu.request_id = r.id and mu.status_to is null)::int
    as comment_count
from public.maintenance_requests r
join public.units u on u.id = r.unit_id
join public.properties p on p.id = u.property_id
left join public.tenants t on t.id = r.tenant_id;

-------------------------------------------------------------------------------
-- RPCs (tenants)
-------------------------------------------------------------------------------

-- A tenant reports an issue in their current home. Always starts 'pending'.
create function public.create_maintenance_request(
  p_tenancy_id uuid,
  p_category public.maintenance_category,
  p_title text,
  p_description text
)
returns table (request_id uuid, request_org_id uuid)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_tenancy public.tenancies;
  v_id uuid;
begin
  select tc.* into v_tenancy
  from public.tenancies tc
  where tc.id = p_tenancy_id
    and tc.status = 'active'
    and tc.id in (select private.user_tenancy_ids());
  if v_tenancy.id is null then
    raise exception 'You can only report issues for your current home.' using errcode = 'BB004';
  end if;

  insert into public.maintenance_requests (org_id, unit_id, tenancy_id, category, title, description)
  values (v_tenancy.org_id, v_tenancy.unit_id, v_tenancy.id, p_category, btrim(p_title), btrim(p_description))
  returning id into v_id;

  return query select v_id, v_tenancy.org_id;
end;
$$;

-- The requesting tenant can cancel while it's still pending.
-- Returns: cancelled | not_found | not_pending
create function public.cancel_maintenance_request(p_request_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_status public.maintenance_status;
begin
  select status into v_status
  from public.maintenance_requests
  where id = p_request_id and tenant_id in (select private.user_tenant_ids())
  for update;

  if v_status is null then
    return 'not_found';
  end if;
  if v_status <> 'pending' then
    return 'not_pending';
  end if;

  update public.maintenance_requests set status = 'cancelled' where id = p_request_id;
  return 'cancelled';
end;
$$;

revoke execute on function
  public.create_maintenance_request(uuid, public.maintenance_category, text, text),
  public.cancel_maintenance_request(uuid)
from public, anon;
grant execute on function
  public.create_maintenance_request(uuid, public.maintenance_category, text, text),
  public.cancel_maintenance_request(uuid)
to authenticated;

-------------------------------------------------------------------------------
-- Grants
-------------------------------------------------------------------------------

revoke all on
  public.maintenance_requests, public.maintenance_updates, public.maintenance_photos,
  public.maintenance_overview
from anon, authenticated;

-- Landlords raise issues directly; tenants use create_maintenance_request().
grant select on public.maintenance_requests to authenticated;
grant insert (org_id, unit_id, category, title, description) on public.maintenance_requests to authenticated;
grant update (status, assigned_to) on public.maintenance_requests to authenticated;

-- Comments and notes. Status rows are written only by the trigger.
grant select on public.maintenance_updates to authenticated;
grant insert (request_id, body, is_internal) on public.maintenance_updates to authenticated;

grant select on public.maintenance_photos to authenticated;
grant insert (request_id, storage_path) on public.maintenance_photos to authenticated;

grant select on public.maintenance_overview to authenticated;

-------------------------------------------------------------------------------
-- Row Level Security
-------------------------------------------------------------------------------

alter table public.maintenance_requests enable row level security;
alter table public.maintenance_updates enable row level security;
alter table public.maintenance_photos enable row level security;

-- maintenance_requests
create policy "Members and the reporting tenant can view requests"
  on public.maintenance_requests for select
  to authenticated
  using (
    org_id in (select private.user_org_ids())
    or tenant_id in (select private.user_tenant_ids())
  );

create policy "Members can raise requests in their organization"
  on public.maintenance_requests for insert
  to authenticated
  with check (org_id in (select private.user_org_ids()));

create policy "Members can update their organization's requests"
  on public.maintenance_requests for update
  to authenticated
  using (org_id in (select private.user_org_ids()))
  with check (org_id in (select private.user_org_ids()));

-- maintenance_updates: tenants see and post only public rows on their own requests.
create policy "Members see all updates; tenants see public updates on their requests"
  on public.maintenance_updates for select
  to authenticated
  using (
    org_id in (select private.user_org_ids())
    or (
      not is_internal
      and request_id in (
        select r.id from public.maintenance_requests r
        where r.tenant_id in (select private.user_tenant_ids())
      )
    )
  );

create policy "Members comment on their org's requests; tenants comment publicly on their own"
  on public.maintenance_updates for insert
  to authenticated
  with check (
    org_id in (select private.user_org_ids())
    or (
      not is_internal
      and request_id in (
        select r.id from public.maintenance_requests r
        where r.tenant_id in (select private.user_tenant_ids())
      )
    )
  );

-- maintenance_photos
create policy "Members and the reporting tenant can view photos"
  on public.maintenance_photos for select
  to authenticated
  using ((select private.can_access_maintenance_request(request_id)));

create policy "Members and the reporting tenant can add photos"
  on public.maintenance_photos for insert
  to authenticated
  with check ((select private.can_access_maintenance_request(request_id)));

-------------------------------------------------------------------------------
-- Storage: private bucket, path-scoped policies. Served via signed URLs.
-------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'maintenance-photos', 'maintenance-photos', false, 5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Maintenance photos: members and the reporting tenant can read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'maintenance-photos' and private.can_access_maintenance_photo_path(name));

create policy "Maintenance photos: members and the reporting tenant can upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'maintenance-photos' and private.can_access_maintenance_photo_path(name));
