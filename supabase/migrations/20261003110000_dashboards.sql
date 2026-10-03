-- Phase 7 — Dashboards
-- One round-trip per dashboard: each RPC returns a single jsonb document.
-- Both are security invoker, so every figure is limited by the caller's RLS.
-- See docs/plans/0001-initial-architecture-and-roadmap.md (Phase 7 detail).

-------------------------------------------------------------------------------
-- Landlord
-------------------------------------------------------------------------------

create function public.landlord_dashboard(p_org_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_today date;
  v_month date;
begin
  if p_org_id is null or p_org_id not in (select private.user_org_ids()) then
    return null;
  end if;
  v_today := private.org_today(p_org_id);
  v_month := date_trunc('month', v_today)::date;

  return jsonb_build_object(
    'today', v_today,
    'month', v_month,

    'properties', (
      select count(*) from public.properties
      where org_id = p_org_id and archived_at is null
    ),

    'units', (
      select jsonb_build_object(
        'total', count(*),
        'occupied', count(*) filter (where u.status = 'occupied'),
        'vacant', count(*) filter (where u.status = 'vacant'),
        'maintenance', count(*) filter (where u.status = 'maintenance'),
        'inactive', count(*) filter (where u.status = 'inactive')
      )
      from public.units u
      join public.properties p on p.id = u.property_id
      where u.org_id = p_org_id and p.archived_at is null
    ),

    'current_tenants', (
      select count(distinct tenant_id) from public.tenancies
      where org_id = p_org_id and status = 'active'
    ),

    -- Charges billed for this month, and money received this month (any charge).
    'month_billed', (
      select coalesce(sum(amount), 0) from public.charge_balances
      where org_id = p_org_id and billing_month = v_month and status <> 'void'
    ),
    'month_collected', (
      select coalesce(sum(amount), 0) from public.payments
      where org_id = p_org_id and voided_at is null
        and paid_on >= v_month and paid_on < (v_month + interval '1 month')::date
    ),

    -- Everything still owed, and the overdue part of it (ADR 0004: derived).
    'outstanding', (
      select coalesce(sum(outstanding), 0) from public.charge_balances
      where org_id = p_org_id and status in ('unpaid', 'partially_paid')
    ),
    'overdue', (
      select jsonb_build_object('amount', coalesce(sum(outstanding), 0), 'count', count(*))
      from public.charge_balances
      where org_id = p_org_id and effective_status = 'overdue'
    ),

    'overdue_tenants', coalesce((
      select jsonb_agg(x order by x.amount desc, x.oldest_due)
      from (
        select
          t.id as tenant_id,
          t.full_name,
          p.name as property_name,
          u.unit_number,
          sum(b.outstanding) as amount,
          count(*) as charges,
          min(b.due_date) as oldest_due
        from public.charge_balances b
        join public.tenancies tc on tc.id = b.tenancy_id
        join public.tenants t on t.id = tc.tenant_id
        join public.units u on u.id = b.unit_id
        join public.properties p on p.id = u.property_id
        where b.org_id = p_org_id and b.effective_status = 'overdue'
        group by t.id, t.full_name, p.name, u.unit_number
        order by sum(b.outstanding) desc, min(b.due_date)
        limit 5
      ) x
    ), '[]'::jsonb),

    'vacant_units', coalesce((
      select jsonb_agg(x order by x.property_name, x.unit_number)
      from (
        select u.id as unit_id, u.unit_number, u.default_rent, p.name as property_name
        from public.units u
        join public.properties p on p.id = u.property_id
        where u.org_id = p_org_id and u.status = 'vacant' and p.archived_at is null
        order by p.name, u.unit_number
        limit 5
      ) x
    ), '[]'::jsonb),

    'maintenance', (
      select jsonb_build_object(
        'open', count(*) filter (where status in ('pending', 'in_progress')),
        'pending', count(*) filter (where status = 'pending')
      )
      from public.maintenance_requests
      where org_id = p_org_id
    ),
    'open_requests', coalesce((
      select jsonb_agg(x order by x.created_at desc)
      from (
        select r.id, r.title, r.status, r.created_at, u.unit_number, p.name as property_name
        from public.maintenance_requests r
        join public.units u on u.id = r.unit_id
        join public.properties p on p.id = u.property_id
        where r.org_id = p_org_id and r.status in ('pending', 'in_progress')
        order by r.created_at desc
        limit 5
      ) x
    ), '[]'::jsonb),

    'live_notices', (
      select count(*) from public.notices
      where org_id = p_org_id and publish_at <= now() and (expires_at is null or expires_at > now())
    ),

    -- Latest activity with a readable subject (who or what it was about).
    'activity', coalesce((
      select jsonb_agg(x order by x.created_at desc)
      from (
        select
          a.id,
          a.event_type,
          a.entity_type,
          a.entity_id,
          a.created_at,
          a.metadata,
          case
            when a.entity_type = 'tenant' then
              (select t.full_name from public.tenants t where t.id = a.entity_id)
            when a.event_type in ('TENANT_MOVED_IN', 'TENANT_MOVED_OUT') then
              (select t.full_name from public.tenants t where t.id = (a.metadata ->> 'tenant_id')::uuid)
            when a.event_type in ('BILL_CREATED', 'CHARGE_VOIDED') then
              (select t.full_name
               from public.tenancies tc join public.tenants t on t.id = tc.tenant_id
               where tc.id = (a.metadata ->> 'tenancy_id')::uuid)
            when a.event_type like 'PAYMENT\_%' then
              (select t.full_name
               from public.charges c
               join public.tenancies tc on tc.id = c.tenancy_id
               join public.tenants t on t.id = tc.tenant_id
               where c.id = (a.metadata ->> 'charge_id')::uuid)
            else a.metadata ->> 'title'
          end as subject,
          case
            when a.event_type in ('TENANT_MOVED_IN', 'TENANT_MOVED_OUT') then
              (select p.name || ' · Unit ' || u.unit_number
               from public.units u join public.properties p on p.id = u.property_id
               where u.id = (a.metadata ->> 'unit_id')::uuid)
            when a.event_type like 'MAINTENANCE\_%' then
              (select p.name || ' · Unit ' || u.unit_number
               from public.maintenance_requests r
               join public.units u on u.id = r.unit_id
               join public.properties p on p.id = u.property_id
               where r.id = a.entity_id)
          end as place
        from public.activity_log a
        where a.org_id = p_org_id
        order by a.created_at desc
        limit 10
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

-------------------------------------------------------------------------------
-- Tenant
-------------------------------------------------------------------------------

-- The signed-in tenant's balance and activity, across all their tenancies.
create function public.tenant_dashboard()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with mine as (
    select * from public.charge_balances
    where tenancy_id in (select private.user_tenancy_ids()) and status <> 'void'
  )
  select jsonb_build_object(
    'owed', (select coalesce(sum(outstanding), 0) from mine where status in ('unpaid', 'partially_paid')),
    'overdue', (select coalesce(sum(outstanding), 0) from mine where effective_status = 'overdue'),
    'next_due', (
      select jsonb_build_object(
        'id', id, 'type_label', type_label, 'billing_month', billing_month,
        'outstanding', outstanding, 'due_date', due_date, 'effective_status', effective_status
      )
      from mine
      where status in ('unpaid', 'partially_paid')
      order by due_date, billing_month
      limit 1
    ),
    'last_payment', (
      select jsonb_build_object('amount', py.amount, 'paid_on', py.paid_on)
      from public.payments py
      join mine c on c.id = py.charge_id
      where py.voided_at is null
      order by py.paid_on desc, py.created_at desc
      limit 1
    ),
    'open_requests', (
      select count(*) from public.maintenance_requests
      where tenant_id in (select private.user_tenant_ids()) and status in ('pending', 'in_progress')
    ),
    'unread_notices', (select count(*) from public.my_notices where not is_read)
  );
$$;

revoke execute on function public.landlord_dashboard(uuid), public.tenant_dashboard() from public, anon;
grant execute on function public.landlord_dashboard(uuid), public.tenant_dashboard() to authenticated;
