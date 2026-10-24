-- Feedback round 1, Phase A — tenant ID documents, bill month guard, editable
-- scheduled notices, property on the tenant notice inbox.
-- See docs/plans/0003-feedback-round-1.md (Phase A).
--
-- Custom SQLSTATEs raised here (others in earlier phases):
--   BB004  not found (or not the caller's)
--   BB015  bill month is outside the tenancy (before move-in or after move-out)
--   BB016  document path doesn't match its tenant, or the file wasn't uploaded
--   BB017  too many documents on one tenant
--   BB018  notice is already published and can't be edited

-------------------------------------------------------------------------------
-- Tenant ID documents (landlord-only: tenants can't read them)
-------------------------------------------------------------------------------

create type public.tenant_document_kind as enum ('nid', 'birth_certificate', 'passport', 'other');

create table public.tenant_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  tenant_id uuid not null,
  kind public.tenant_document_kind not null,
  -- {org_id}/{tenant_id}/{file} in the tenant-documents bucket.
  storage_path text not null unique check (char_length(storage_path) <= 300),
  -- The uploaded file's original name, for display.
  file_name text not null default '' check (char_length(file_name) <= 200),
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (org_id, tenant_id) references public.tenants (org_id, id) on delete cascade
);

comment on table public.tenant_documents is
  'Identity documents (NID, birth certificate…) a landlord keeps for a tenant. Members only.';

create index tenant_documents_tenant_id_org_id_idx on public.tenant_documents (tenant_id, org_id);
create index tenant_documents_uploaded_by_idx on public.tenant_documents (uploaded_by);

-- For storage policies: "{org_id}/{tenant_id}/{file}" where the tenant is in
-- that org and the caller is a member of it. Malformed paths are refused.
create function private.can_access_tenant_document_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_org text := split_part(p_name, '/', 1);
  v_tenant text := split_part(p_name, '/', 2);
begin
  if v_org !~ c_uuid or v_tenant !~ c_uuid or split_part(p_name, '/', 3) = '' then
    return false;
  end if;
  return v_org::uuid in (select private.user_org_ids())
    and exists (
      select 1 from public.tenants t
      where t.id = v_tenant::uuid and t.org_id = v_org::uuid
    );
end;
$$;

revoke execute on function private.can_access_tenant_document_path(text) from public, anon;
grant execute on function private.can_access_tenant_document_path(text) to authenticated;

-- Org from the tenant; the path must match it and exist in storage; max 10.
create function private.prepare_tenant_document()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select org_id into new.org_id from public.tenants where id = new.tenant_id;
  if new.org_id is null then
    raise exception 'Tenant not found.' using errcode = 'BB004';
  end if;
  if split_part(new.storage_path, '/', 1) <> new.org_id::text
    or split_part(new.storage_path, '/', 2) <> new.tenant_id::text
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'tenant-documents' and name = new.storage_path
    )
  then
    raise exception 'Document upload not found for this tenant.' using errcode = 'BB016';
  end if;
  if (select count(*) from public.tenant_documents where tenant_id = new.tenant_id) >= 10 then
    raise exception 'A tenant can have at most 10 documents.' using errcode = 'BB017';
  end if;
  new.uploaded_by := coalesce((select auth.uid()), new.uploaded_by);
  return new;
end;
$$;

create trigger tenant_documents_prepare
  before insert on public.tenant_documents
  for each row execute function private.prepare_tenant_document();

revoke execute on function private.prepare_tenant_document() from public, anon, authenticated;

revoke all on public.tenant_documents from anon, authenticated;
grant select, delete on public.tenant_documents to authenticated;
-- org_id and uploaded_by are filled by the trigger.
grant insert (tenant_id, kind, storage_path, file_name) on public.tenant_documents to authenticated;

alter table public.tenant_documents enable row level security;

create policy "Members can view their organization's tenant documents"
  on public.tenant_documents for select
  to authenticated
  using (org_id in (select private.user_org_ids()));

create policy "Members can add tenant documents"
  on public.tenant_documents for insert
  to authenticated
  with check (org_id in (select private.user_org_ids()));

create policy "Members can delete tenant documents"
  on public.tenant_documents for delete
  to authenticated
  using (org_id in (select private.user_org_ids()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-documents', 'tenant-documents', false, 5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "Tenant documents: members can read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'tenant-documents' and private.can_access_tenant_document_path(name));

create policy "Tenant documents: members can upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'tenant-documents' and private.can_access_tenant_document_path(name));

create policy "Tenant documents: members can delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'tenant-documents' and private.can_access_tenant_document_path(name));

-------------------------------------------------------------------------------
-- Bills can't be for a month before move-in (or after move-out)
-------------------------------------------------------------------------------

create or replace function private.prepare_charge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type_org_id uuid;
  v_category public.charge_category;
  v_move_in date;
  v_move_out date;
begin
  if tg_op = 'INSERT' then
    select unit_id, move_in_date, move_out_date into new.unit_id, v_move_in, v_move_out
    from public.tenancies
    where id = new.tenancy_id and org_id = new.org_id;
    if new.unit_id is null then
      raise exception 'Tenancy not found.' using errcode = 'BB004';
    end if;

    if new.billing_month < date_trunc('month', v_move_in)::date
      or (v_move_out is not null and new.billing_month > date_trunc('month', v_move_out)::date)
    then
      raise exception 'The bill month must fall within the tenancy (from the move-in month).'
        using errcode = 'BB015';
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

-------------------------------------------------------------------------------
-- Notices: editable until they're published
-------------------------------------------------------------------------------

grant update (title, body, audience, property_id, publish_at, expires_at) on public.notices to authenticated;
grant delete on public.notice_units to authenticated;

-- Only scheduled notices: once tenants can see one, its read receipts must
-- stay about the text they read.
create policy "Members can edit their organization's scheduled notices"
  on public.notices for update
  to authenticated
  using (org_id in (select private.user_org_ids()) and publish_at > now())
  with check (org_id in (select private.user_org_ids()));

create policy "Members can remove targets from their organization's notices"
  on public.notice_units for delete
  to authenticated
  using (org_id in (select private.user_org_ids()));

-- Updates a scheduled notice and replaces its unit targets atomically.
create function public.update_notice(
  p_id uuid,
  p_title text,
  p_body text,
  p_audience public.notice_audience,
  p_property_id uuid,
  p_unit_ids uuid[],
  p_publish_at timestamptz,
  p_expires_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_publish_at timestamptz;
begin
  select org_id, publish_at into v_org_id, v_publish_at
  from public.notices
  where id = p_id
  for update;
  if v_org_id is null then
    raise exception 'Notice not found.' using errcode = 'BB004';
  end if;
  if v_publish_at <= now() then
    raise exception 'This notice is already published and can''t be edited.' using errcode = 'BB018';
  end if;
  if p_audience = 'units' and coalesce(cardinality(p_unit_ids), 0) = 0 then
    raise exception 'Choose at least one unit.' using errcode = 'BB012';
  end if;

  update public.notices set
    title = btrim(p_title),
    body = btrim(p_body),
    audience = p_audience,
    property_id = case when p_audience = 'property' then p_property_id end,
    publish_at = coalesce(p_publish_at, now()),
    expires_at = p_expires_at
  where id = p_id;

  delete from public.notice_units where notice_id = p_id;
  if p_audience = 'units' then
    insert into public.notice_units (notice_id, unit_id, org_id)
    select p_id, unit_id, v_org_id from unnest(p_unit_ids) as unit_id
    on conflict do nothing;
  end if;
end;
$$;

revoke execute on function
  public.update_notice(uuid, text, text, public.notice_audience, uuid, uuid[], timestamptz, timestamptz)
from public, anon;
grant execute on function
  public.update_notice(uuid, text, text, public.notice_audience, uuid, uuid[], timestamptz, timestamptz)
to authenticated;

-- Tenant inbox: which property a notice is about (null for all homes or units).
create or replace view public.my_notices
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
  ) as is_read,
  n.property_id
from public.notices n;

-- my_tenancies() gains property_id and org_id, so tenant pages can label
-- property notices and other org-scoped rows with the home they belong to.
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
  org_id uuid
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
    o.id
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
