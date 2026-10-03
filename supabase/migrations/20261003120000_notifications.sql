-- Phase 8 — Notifications (payment reminders)
-- One row per channel delivery (ADR 0005). Server actions insert 'pending'
-- rows, hand them to a provider, then record 'sent' or 'failed'.
-- See docs/plans/0001-initial-architecture-and-roadmap.md (Phase 8 detail).
--
-- Custom SQLSTATEs raised here (others in earlier phases):
--   BB004  tenant or charge not found in the organization
--   BB013  a delivered (sent/failed) notification can't change status
--   BB014  the tenant can't be reached on this channel (no login / no email)

create type public.notification_type as enum ('payment_reminder');
create type public.notification_channel as enum ('in_app', 'email', 'sms', 'whatsapp');
create type public.notification_status as enum ('pending', 'sent', 'failed');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  tenant_id uuid not null,
  -- Both filled from the tenant record by trigger; never taken from the client,
  -- so a landlord can't address someone who isn't their tenant.
  recipient_user_id uuid references auth.users (id) on delete set null,
  recipient_email text not null default '' check (char_length(recipient_email) <= 254),
  type public.notification_type not null,
  channel public.notification_channel not null,
  charge_id uuid,
  subject text not null check (char_length(subject) between 1 and 200),
  message text not null check (char_length(message) between 1 and 4000),
  status public.notification_status not null default 'pending',
  sent_at timestamptz,
  read_at timestamptz,
  error text not null default '' check (char_length(error) <= 500),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (org_id, tenant_id) references public.tenants (org_id, id) on delete restrict,
  foreign key (org_id, charge_id) references public.charges (org_id, id) on delete restrict,
  check ((status = 'sent') = (sent_at is not null))
);

comment on table public.notifications is 'One row per channel delivery attempt (ADR 0005).';

create index notifications_org_id_created_at_idx on public.notifications (org_id, created_at desc);
create index notifications_tenant_id_org_id_created_at_idx on public.notifications (tenant_id, org_id, created_at desc);
create index notifications_charge_id_org_id_idx on public.notifications (charge_id, org_id);
create index notifications_recipient_user_id_created_at_idx
  on public.notifications (recipient_user_id, created_at desc)
  where channel = 'in_app';
create index notifications_created_by_idx on public.notifications (created_by);

-------------------------------------------------------------------------------
-- Rules
-------------------------------------------------------------------------------

create function private.prepare_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant public.tenants;
begin
  if tg_op = 'INSERT' then
    select * into v_tenant from public.tenants where id = new.tenant_id and org_id = new.org_id;
    if v_tenant.id is null then
      raise exception 'Tenant not found.' using errcode = 'BB004';
    end if;
    if new.charge_id is not null and not exists (
      select 1 from public.charges c
      join public.tenancies tc on tc.id = c.tenancy_id
      where c.id = new.charge_id and tc.tenant_id = new.tenant_id
    ) then
      raise exception 'Charge not found for this tenant.' using errcode = 'BB004';
    end if;

    new.recipient_user_id := null;
    new.recipient_email := '';
    if new.channel = 'in_app' then
      if v_tenant.user_id is null then
        raise exception 'This tenant has no app login.' using errcode = 'BB014';
      end if;
      new.recipient_user_id := v_tenant.user_id;
    elsif new.channel = 'email' then
      if v_tenant.email = '' then
        raise exception 'This tenant has no email address.' using errcode = 'BB014';
      end if;
      new.recipient_email := v_tenant.email;
    else
      raise exception 'This channel isn''t available yet.' using errcode = 'BB014';
    end if;

    new.status := 'pending';
    new.sent_at := null;
    new.read_at := null;
    new.error := '';
    return new;
  end if;

  -- Deliveries are recorded once: pending → sent | failed.
  if new.status is distinct from old.status then
    if old.status <> 'pending' then
      raise exception 'This notification was already delivered.' using errcode = 'BB013';
    end if;
    new.sent_at := case when new.status = 'sent' then now() end;
  end if;
  return new;
end;
$$;

create trigger notifications_prepare
  before insert or update on public.notifications
  for each row execute function private.prepare_notification();

-- One REMINDER_SENT entry per tenant per send, whatever the channels.
create function private.log_notifications_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
begin
  for v_row in
    select org_id, tenant_id, array_agg(distinct channel::text order by channel::text) as channels,
      (array_agg(charge_id) filter (where charge_id is not null))[1] as charge_id
    from new_rows
    where type = 'payment_reminder'
    group by org_id, tenant_id
  loop
    perform private.log_activity(
      v_row.org_id, 'REMINDER_SENT', 'tenant', v_row.tenant_id,
      jsonb_build_object('channels', v_row.channels, 'charge_id', v_row.charge_id)
    );
  end loop;
  return null;
end;
$$;

create trigger notifications_log_created
  after insert on public.notifications
  referencing new table as new_rows
  for each statement execute function private.log_notifications_created();

revoke execute on function private.prepare_notification(), private.log_notifications_created()
from public, anon, authenticated;

-------------------------------------------------------------------------------
-- Tenant RPC
-------------------------------------------------------------------------------

-- Marks the caller's in-app notifications read (all, or just p_ids).
-- An RPC rather than an update grant, so tenants can't touch delivery fields.
create function public.mark_notifications_read(p_ids uuid[] default null)
returns int
language sql
volatile
security definer
set search_path = ''
as $$
  with updated as (
    update public.notifications
    set read_at = now()
    where recipient_user_id = (select auth.uid())
      and channel = 'in_app'
      and read_at is null
      and (p_ids is null or id = any (p_ids))
    returning 1
  )
  select count(*)::int from updated;
$$;

revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-------------------------------------------------------------------------------
-- Grants and RLS
-------------------------------------------------------------------------------

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant insert (org_id, tenant_id, type, channel, charge_id, subject, message) on public.notifications to authenticated;
grant update (status, error) on public.notifications to authenticated;

alter table public.notifications enable row level security;

create policy "Members see their org's notifications; tenants see their in-app ones"
  on public.notifications for select
  to authenticated
  using (
    org_id in (select private.user_org_ids())
    or (channel = 'in_app' and recipient_user_id = (select auth.uid()))
  );

create policy "Members can create notifications in their organization"
  on public.notifications for insert
  to authenticated
  with check (org_id in (select private.user_org_ids()));

create policy "Members can record delivery results in their organization"
  on public.notifications for update
  to authenticated
  using (org_id in (select private.user_org_ids()))
  with check (org_id in (select private.user_org_ids()));
