-- Phase 1 — Foundation
-- Profiles + roles, organizations (data owner), memberships, auth hooks, RLS.
-- See docs/plans/0001-initial-architecture-and-roadmap.md §3 and docs/adr/0003.

-------------------------------------------------------------------------------
-- Privileges baseline
-------------------------------------------------------------------------------

-- New objects created by migrations must be granted explicitly. Nothing is
-- reachable through the Data API by default.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

-- Internal helpers live in an unexposed schema.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, supabase_auth_admin;

-------------------------------------------------------------------------------
-- Types
-------------------------------------------------------------------------------

create type public.user_role as enum ('landlord', 'tenant');
create type public.org_member_role as enum ('owner', 'manager');

-------------------------------------------------------------------------------
-- Shared trigger functions
-------------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-------------------------------------------------------------------------------
-- Tables
-------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth user. role is set at signup and is immutable for users.';

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  currency text not null default 'BDT' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Asia/Dhaka' check (char_length(timezone) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is 'Owner of all business data. A landlord signup creates one automatically.';

create table public.organization_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_member_role not null default 'manager',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- PK covers org_id lookups; RLS helpers look up by user_id.
create index organization_members_user_id_idx on public.organization_members (user_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function private.set_updated_at();

-------------------------------------------------------------------------------
-- RLS helper functions
-- security definer so policies can read memberships without recursing through
-- organization_members' own RLS. Each filters on auth.uid() internally.
-------------------------------------------------------------------------------

create function private.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id
  from public.organization_members
  where user_id = (select auth.uid());
$$;

create function private.is_org_owner(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members
    where org_id = p_org_id
      and user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

revoke execute on function private.user_org_ids() from public, anon;
revoke execute on function private.is_org_owner(uuid) from public, anon;
grant execute on function private.user_org_ids() to authenticated;
grant execute on function private.is_org_owner(uuid) to authenticated;

-------------------------------------------------------------------------------
-- New user bootstrap
-- Role comes from signup metadata, restricted to landlord|tenant and defaulting
-- to the least-privileged role. Metadata is never used for authorization after
-- this point: profiles.role is the source of truth.
-------------------------------------------------------------------------------

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_full_name text;
  v_org_name text;
  v_org_id uuid;
begin
  v_role := case new.raw_user_meta_data ->> 'role'
    when 'landlord' then 'landlord'::public.user_role
    else 'tenant'::public.user_role
  end;
  v_full_name := left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120);

  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, v_full_name);

  if v_role = 'landlord' then
    v_org_name := left(btrim(coalesce(new.raw_user_meta_data ->> 'organization_name', '')), 120);
    if v_org_name = '' then
      v_org_name := case when v_full_name = '' then 'My Properties' else v_full_name || '''s Properties' end;
    end if;

    insert into public.organizations (name)
    values (left(v_org_name, 120))
    returning id into v_org_id;

    insert into public.organization_members (org_id, user_id, role)
    values (v_org_id, new.id, 'owner');
  end if;

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-------------------------------------------------------------------------------
-- Custom access token hook: adds app_metadata.user_role to the JWT.
-- Used only for optimistic redirects in proxy.ts — never for authorization.
-------------------------------------------------------------------------------

create function private.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_claims jsonb := event -> 'claims';
  v_role public.user_role;
begin
  select role into v_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  if v_role is not null then
    if jsonb_typeof(v_claims -> 'app_metadata') is null then
      v_claims := jsonb_set(v_claims, '{app_metadata}', '{}'::jsonb);
    end if;
    v_claims := jsonb_set(v_claims, '{app_metadata,user_role}', to_jsonb(v_role));
  end if;

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

revoke execute on function private.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function private.custom_access_token_hook(jsonb) to supabase_auth_admin;

-------------------------------------------------------------------------------
-- Grants (table and column level)
-------------------------------------------------------------------------------

revoke all on public.profiles, public.organizations, public.organization_members from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

grant select on public.organizations to authenticated;
grant update (name, currency, timezone) on public.organizations to authenticated;

grant select on public.organization_members to authenticated;

-- The token hook runs as supabase_auth_admin.
grant select on public.profiles to supabase_auth_admin;

-------------------------------------------------------------------------------
-- Row Level Security
-------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- profiles
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Auth admin can read profiles for token hook"
  on public.profiles for select
  to supabase_auth_admin
  using (true);

-- organizations
create policy "Members can view their organizations"
  on public.organizations for select
  to authenticated
  using (id in (select private.user_org_ids()));

create policy "Owners can update their organizations"
  on public.organizations for update
  to authenticated
  using ((select private.is_org_owner(id)))
  with check ((select private.is_org_owner(id)));

-- organization_members
create policy "Members can view memberships of their organizations"
  on public.organization_members for select
  to authenticated
  using (org_id in (select private.user_org_ids()));
