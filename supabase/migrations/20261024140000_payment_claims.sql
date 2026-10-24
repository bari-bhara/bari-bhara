-- Feedback round 1, Phase C — tenants' "Already paid" claims, reviewed by the landlord.
-- See docs/plans/0003-feedback-round-1.md (Phase C).
--
-- Custom SQLSTATEs raised here (others in earlier phases):
--   BB004  not found (or not the caller's)
--   BB006  charge is void
--   BB008  more than the amount due
--   BB020  a claim is already waiting for review on this charge
--   BB021  payment date is in the future
--   BB022  claim was already reviewed

create type public.payment_claim_status as enum ('pending', 'approved', 'rejected');

-- Tells a tenant their landlord approved or rejected their claim.
alter type public.notification_type add value if not exists 'payment_claim_reviewed';

create table public.payment_claims (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  charge_id uuid not null,
  tenant_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  paid_on date not null,
  method public.payment_method not null,
  reference text not null default '' check (char_length(reference) <= 100),
  note text not null default '' check (char_length(note) <= 500),
  status public.payment_claim_status not null default 'pending',
  review_note text not null default '' check (char_length(review_note) <= 500),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  -- The payment an approval recorded.
  payment_id uuid references public.payments (id) on delete restrict,
  -- Set when the landlord's team was emailed, so the recipient list is handed out once.
  landlord_notified_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (org_id, charge_id) references public.charges (org_id, id) on delete restrict,
  foreign key (org_id, tenant_id) references public.tenants (org_id, id) on delete restrict,
  check ((status = 'pending') = (reviewed_at is null)),
  check ((status = 'approved') = (payment_id is not null))
);

comment on table public.payment_claims is
  'A tenant says they paid a charge; the landlord approves (records the payment) or rejects it.';

create unique index payment_claims_one_pending_per_charge
  on public.payment_claims (charge_id) where status = 'pending';
create index payment_claims_org_id_status_idx on public.payment_claims (org_id, status, created_at desc);
create index payment_claims_charge_id_org_id_idx on public.payment_claims (charge_id, org_id);
create index payment_claims_tenant_id_org_id_idx on public.payment_claims (tenant_id, org_id);
create index payment_claims_payment_id_idx on public.payment_claims (payment_id);
create index payment_claims_reviewed_by_idx on public.payment_claims (reviewed_by);
create index payment_claims_created_by_idx on public.payment_claims (created_by);

revoke all on public.payment_claims from anon, authenticated;
-- No direct writes: claims are made and reviewed through the RPCs below.
grant select on public.payment_claims to authenticated;

alter table public.payment_claims enable row level security;

create policy "Members see their organization's claims; tenants see their own"
  on public.payment_claims for select
  to authenticated
  using (
    org_id in (select private.user_org_ids())
    or tenant_id in (select private.user_tenant_ids())
  );

-- The calling tenant says they paid one of their open charges.
create function public.submit_payment_claim(
  p_charge_id uuid,
  p_amount numeric,
  p_paid_on date,
  p_method public.payment_method,
  p_reference text,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_charge record;
  v_tenant_id uuid;
  v_id uuid;
begin
  select c.id, c.org_id, c.status, c.amount - c.amount_paid as outstanding, tc.tenant_id
  into v_charge
  from public.charges c
  join public.tenancies tc on tc.id = c.tenancy_id
  where c.id = p_charge_id
    and c.tenancy_id in (select private.user_tenancy_ids())
  for update of c;

  if v_charge.id is null then
    raise exception 'Charge not found.' using errcode = 'BB004';
  end if;
  if v_charge.status = 'void' then
    raise exception 'This charge is void.' using errcode = 'BB006';
  end if;
  if p_amount > v_charge.outstanding then
    raise exception 'That''s more than the amount due.' using errcode = 'BB008';
  end if;
  if p_paid_on > private.org_today(v_charge.org_id) then
    raise exception 'The payment date can''t be in the future.' using errcode = 'BB021';
  end if;
  if exists (select 1 from public.payment_claims where charge_id = p_charge_id and status = 'pending') then
    raise exception 'A claim for this charge is already waiting for review.' using errcode = 'BB020';
  end if;
  v_tenant_id := v_charge.tenant_id;

  insert into public.payment_claims (org_id, charge_id, tenant_id, amount, paid_on, method, reference, note)
  values (
    v_charge.org_id, p_charge_id, v_tenant_id, p_amount, p_paid_on, p_method,
    btrim(coalesce(p_reference, '')), btrim(coalesce(p_note, ''))
  )
  returning id into v_id;

  perform private.log_activity(
    v_charge.org_id, 'PAYMENT_CLAIMED', 'charge', p_charge_id,
    -- charge_id lets the dashboard name the tenant (like other PAYMENT_* events).
    jsonb_build_object('amount', p_amount, 'claim_id', v_id, 'charge_id', p_charge_id)
  );
  return v_id;
end;
$$;

-- Emails of the organization's members, for the "new claim" email. Only the
-- tenant who made the claim gets them, once, right after submitting.
create function public.payment_claim_recipients(p_claim_id uuid)
returns table (email text, organization_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
begin
  update public.payment_claims
  set landlord_notified_at = now()
  where id = p_claim_id
    and created_by = (select auth.uid())
    and landlord_notified_at is null
    and created_at > now() - interval '10 minutes'
  returning org_id into v_org_id;

  if v_org_id is null then
    return;
  end if;
  return query
    select u.email::text, o.name
    from public.organization_members m
    join auth.users u on u.id = m.user_id
    join public.organizations o on o.id = m.org_id
    where m.org_id = v_org_id and u.email is not null;
end;
$$;

-- A member approves a claim (recording the payment) or rejects it with a note.
create function public.review_payment_claim(p_claim_id uuid, p_approve boolean, p_note text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim public.payment_claims;
  v_payment_id uuid;
begin
  select * into v_claim
  from public.payment_claims
  where id = p_claim_id
    and org_id in (select private.user_org_ids())
  for update;

  if v_claim.id is null then
    raise exception 'Claim not found.' using errcode = 'BB004';
  end if;
  if v_claim.status <> 'pending' then
    raise exception 'This claim was already reviewed.' using errcode = 'BB022';
  end if;

  if p_approve then
    -- The payment triggers check the charge isn't void and isn't overpaid.
    insert into public.payments (org_id, charge_id, amount, paid_on, method, reference)
    values (v_claim.org_id, v_claim.charge_id, v_claim.amount, v_claim.paid_on, v_claim.method, v_claim.reference)
    returning id into v_payment_id;
  end if;

  update public.payment_claims set
    status = case when p_approve then 'approved' else 'rejected' end::public.payment_claim_status,
    review_note = btrim(coalesce(p_note, '')),
    reviewed_by = (select auth.uid()),
    reviewed_at = now(),
    payment_id = v_payment_id
  where id = p_claim_id;

  perform private.log_activity(
    v_claim.org_id, 'PAYMENT_CLAIM_REVIEWED', 'charge', v_claim.charge_id,
    jsonb_build_object(
      'claim_id', p_claim_id, 'approved', p_approve, 'amount', v_claim.amount, 'charge_id', v_claim.charge_id
    )
  );
  return v_payment_id;
end;
$$;

revoke execute on function
  public.submit_payment_claim(uuid, numeric, date, public.payment_method, text, text),
  public.payment_claim_recipients(uuid),
  public.review_payment_claim(uuid, boolean, text)
from public, anon;
grant execute on function
  public.submit_payment_claim(uuid, numeric, date, public.payment_method, text, text),
  public.payment_claim_recipients(uuid),
  public.review_payment_claim(uuid, boolean, text)
to authenticated;

-- Landlord list: claims with tenant, home and charge names.
create view public.payment_claim_overview
with (security_invoker = true)
as
select
  pc.*,
  t.full_name as tenant_name,
  u.unit_number,
  p.name as property_name,
  c.category,
  c.billing_month,
  ct.label as type_label
from public.payment_claims pc
join public.tenants t on t.id = pc.tenant_id
join public.charges c on c.id = pc.charge_id
join public.charge_types ct on ct.id = c.charge_type_id
join public.units u on u.id = c.unit_id
join public.properties p on p.id = u.property_id;

revoke all on public.payment_claim_overview from anon, authenticated;
grant select on public.payment_claim_overview to authenticated;
