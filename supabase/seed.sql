-- Development seed data. Local only — all people and contact details are fictional.
-- Every account's password is: Password123!
--
--   landlord.a@example.com  Landlord A (owns "Green View Properties")
--   landlord.b@example.com  Landlord B (separate org; used to verify isolation)
--   tenant.a@example.com    Tenant A
--   tenant.b@example.com    Tenant B
--
-- Profiles, organizations and memberships are created by the
-- on_auth_user_created trigger from raw_user_meta_data.

do $$
declare
  v_user record;
begin
  for v_user in
    select *
    from (values
      ('11111111-1111-1111-1111-111111111111'::uuid, 'landlord.a@example.com', '{"role":"landlord","full_name":"Karim Hossain","organization_name":"Green View Properties"}'::jsonb),
      ('22222222-2222-2222-2222-222222222222'::uuid, 'landlord.b@example.com', '{"role":"landlord","full_name":"Nasrin Akter","organization_name":"Lakeside Homes"}'::jsonb),
      ('33333333-3333-3333-3333-333333333333'::uuid, 'tenant.a@example.com',   '{"role":"tenant","full_name":"Tanvir Ahmed"}'::jsonb),
      ('44444444-4444-4444-4444-444444444444'::uuid, 'tenant.b@example.com',   '{"role":"tenant","full_name":"Farzana Islam"}'::jsonb)
    ) as t (id, email, meta)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    )
    values (
      '00000000-0000-0000-0000-000000000000', v_user.id, 'authenticated', 'authenticated',
      v_user.email, extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, v_user.meta, now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    )
    values (
      gen_random_uuid(), v_user.id, v_user.id::text,
      jsonb_build_object('sub', v_user.id::text, 'email', v_user.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end;
$$;

update public.profiles set phone = '+8801700000001' where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set phone = '+8801700000002' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set phone = '+8801700000003' where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set phone = '+8801700000004' where id = '44444444-4444-4444-4444-444444444444';

-------------------------------------------------------------------------------
-- Properties & units (Phase 2). Fixed ids so tests and manual checks can use them.
--   aaaaaaaa-0000-0000-0000-00000000000{1,2}  Landlord A's properties
--   bbbbbbbb-0000-0000-0000-000000000001      Landlord B's property
-- No unit is 'occupied' yet: that status comes from tenancies in Phase 3.
-------------------------------------------------------------------------------

insert into public.properties (id, org_id, name, address, city, rent_due_day)
select v.id, m.org_id, v.name, v.address, v.city, v.rent_due_day
from (values
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Green View Tower', 'House 12, Road 5, Dhanmondi', 'Dhaka', 5::smallint),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Rose Garden Villa', 'Plot 7, Sector 4, Uttara', 'Dhaka', 10::smallint),
  ('bbbbbbbb-0000-0000-0000-000000000001'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'Lakeside Apartments', '45 Lake Road, Gulshan 2', 'Dhaka', 5::smallint)
) as v (id, owner_id, name, address, city, rent_due_day)
join public.organization_members m on m.user_id = v.owner_id and m.role = 'owner';

insert into public.units (org_id, property_id, unit_number, floor, unit_type, bedrooms, default_rent, status)
select p.org_id, p.id, v.unit_number, v.floor, v.unit_type, v.bedrooms, v.default_rent, v.status::public.unit_status
from (values
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'A1', '1', '2 bed flat', 2, 18000, 'vacant'),
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'A2', '1', '3 bed flat', 3, 25000, 'vacant'),
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'B1', '2', '2 bed flat', 2, 18500, 'vacant'),
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'B2', '2', '3 bed flat', 3, 25500, 'maintenance'),
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'G1', 'G', 'Shop', null, 30000, 'inactive'),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, '1A', '1', '2 bed flat', 2, 15000, 'vacant'),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, '2A', '2', '2 bed flat', 2, 15000, 'vacant'),
  ('bbbbbbbb-0000-0000-0000-000000000001'::uuid, '101', '1', '3 bed flat', 3, 40000, 'vacant'),
  ('bbbbbbbb-0000-0000-0000-000000000001'::uuid, '102', '1', '3 bed flat', 3, 40000, 'vacant'),
  ('bbbbbbbb-0000-0000-0000-000000000001'::uuid, '201', '2', 'Penthouse', 4, 75000, 'maintenance')
) as v (property_id, unit_number, floor, unit_type, bedrooms, default_rent, status)
join public.properties p on p.id = v.property_id;

-------------------------------------------------------------------------------
-- Tenants & tenancies (Phase 3). Unit status follows tenancies via triggers.
--   cccccccc-…  Landlord A's tenants; Tanvir is linked to tenant.a@example.com
--   dddddddd-…  Landlord B's tenants; Farzana is NOT linked yet
-- Local-only invite code for Farzana (log in as tenant.b, go to /tenant/join):
--   B4R1B-H4RA5
-------------------------------------------------------------------------------

insert into public.tenants (id, org_id, full_name, phone, email, user_id)
select v.id, p.org_id, v.full_name, v.phone, v.email, v.user_id
from (values
  ('cccccccc-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'Tanvir Ahmed',  '+8801711000001', 'tenant.a@example.com', '33333333-3333-3333-3333-333333333333'::uuid),
  ('cccccccc-0000-0000-0000-000000000002'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'Rahim Uddin',   '+8801711000002', '',                     null),
  ('cccccccc-0000-0000-0000-000000000003'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'Sumaiya Khan',  '+8801711000003', 'sumaiya@example.com',  null),
  ('cccccccc-0000-0000-0000-000000000004'::uuid, 'aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'Nusrat Jahan',  '+8801711000004', '',                     null),
  ('dddddddd-0000-0000-0000-000000000001'::uuid, 'bbbbbbbb-0000-0000-0000-000000000001'::uuid, 'Imran Hossain', '+8801722000001', '',                     null),
  ('dddddddd-0000-0000-0000-000000000002'::uuid, 'bbbbbbbb-0000-0000-0000-000000000001'::uuid, 'Farzana Islam', '+8801722000002', 'tenant.b@example.com', null)
) as v (id, property_id, full_name, phone, email, user_id)
join public.properties p on p.id = v.property_id;

insert into public.tenancies (
  org_id, tenant_id, unit_id, monthly_rent, security_deposit, move_in_date,
  move_out_date, move_out_reason, status
)
select
  u.org_id, v.tenant_id, u.id, v.monthly_rent, v.security_deposit, v.move_in_date::date,
  v.move_out_date::date, v.move_out_reason, v.status::public.tenancy_status
from (values
  ('cccccccc-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'A1',  18000, 36000, '2026-01-01', null,         '',            'active'),
  ('cccccccc-0000-0000-0000-000000000002'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'A2',  25000, 50000, '2025-06-01', null,         '',            'active'),
  ('cccccccc-0000-0000-0000-000000000003'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'B1',  18000, 36000, '2025-01-01', '2026-08-31', 'Lease ended', 'moved_out'),
  ('cccccccc-0000-0000-0000-000000000004'::uuid, 'aaaaaaaa-0000-0000-0000-000000000002'::uuid, '1A',  15000, 30000, '2026-03-15', null,         '',            'active'),
  ('dddddddd-0000-0000-0000-000000000001'::uuid, 'bbbbbbbb-0000-0000-0000-000000000001'::uuid, '101', 40000, 80000, '2025-11-01', null,         '',            'active'),
  ('dddddddd-0000-0000-0000-000000000002'::uuid, 'bbbbbbbb-0000-0000-0000-000000000001'::uuid, '102', 40000, 80000, '2026-09-01', null,         '',            'active')
) as v (tenant_id, property_id, unit_number, monthly_rent, security_deposit, move_in_date, move_out_date, move_out_reason, status)
join public.units u on u.property_id = v.property_id and u.unit_number = v.unit_number;

insert into public.tenant_invites (org_id, tenant_id, code_hash, expires_at)
select org_id, id, encode(extensions.digest('B4R1BH4RA5', 'sha256'), 'hex'), now() + interval '30 days'
from public.tenants
where id = 'dddddddd-0000-0000-0000-000000000002';

-------------------------------------------------------------------------------
-- Rent, bills & payments (Phase 4). Relative to current_date so the
-- previous month's unpaid charges are always overdue.
--   m2 = two months ago, m1 = last month, m0 = this month
-- Landlord A:
--   Tanvir (A1, 18000): m2 paid, m1 paid, m0 partly paid (10000);
--                       m1 electricity bill 2350 unpaid → overdue
--   Rahim  (A2, 25000): m2 paid (plus one voided duplicate payment);
--                       m1 unpaid → overdue; m0 unpaid; m1 water bill paid
--   Nusrat (1A, 15000): m2, m1 paid; m0 unpaid
-- Landlord B:
--   Imran   (101, 40000): m2, m1 paid; m0 unpaid
--   Farzana (102, 40000): moved in this Sept; m1 partly paid (20000)
-------------------------------------------------------------------------------

do $$
declare
  m0 date := date_trunc('month', current_date)::date;
  m1 date := (date_trunc('month', current_date) - interval '1 month')::date;
  m2 date := (date_trunc('month', current_date) - interval '2 months')::date;
  v_duplicate_id uuid;
begin
  perform public.generate_monthly_rent(m2);
  perform public.generate_monthly_rent(m1);
  perform public.generate_monthly_rent(m0);

  insert into public.charges (org_id, tenancy_id, charge_type_id, billing_month, amount, due_date, description)
  select tc.org_id, tc.id, ct.id, m1, v.amount, m1 + 24, v.description
  from (values
    ('cccccccc-0000-0000-0000-000000000001'::uuid, 'electricity', 2350, 'Meter reading 10452'),
    ('cccccccc-0000-0000-0000-000000000002'::uuid, 'water',        600, '')
  ) as v (tenant_id, type_key, amount, description)
  join public.tenancies tc on tc.tenant_id = v.tenant_id and tc.status = 'active'
  join public.charge_types ct on ct.org_id is null and ct.key = v.type_key;

  -- A duplicate entry for Rahim's m2 rent, recorded then voided (before the real one).
  insert into public.payments (org_id, charge_id, amount, paid_on, method, reference)
  select c.org_id, c.id, 25000, m2 + 5, 'cash', ''
  from public.charges c
  join public.tenancies tc on tc.id = c.tenancy_id
  where tc.tenant_id = 'cccccccc-0000-0000-0000-000000000002' and c.category = 'rent' and c.billing_month = m2
  returning id into v_duplicate_id;

  update public.payments
  set voided_at = now(), void_reason = 'Recorded twice'
  where id = v_duplicate_id;

  insert into public.payments (org_id, charge_id, amount, paid_on, method, reference)
  select c.org_id, c.id, v.amount, c.billing_month + v.day_offset, v.method::public.payment_method, v.reference
  from (values
    ('cccccccc-0000-0000-0000-000000000001'::uuid, 'rent',  m2, 18000, 3, 'cash',          ''),
    ('cccccccc-0000-0000-0000-000000000001'::uuid, 'rent',  m1, 18000, 4, 'bkash',         'BK7Q2M1X'),
    ('cccccccc-0000-0000-0000-000000000001'::uuid, 'rent',  m0, 10000, 1, 'bkash',         'BK9P4L2Z'),
    ('cccccccc-0000-0000-0000-000000000002'::uuid, 'rent',  m2, 25000, 5, 'bank_transfer', 'DBBL-55120'),
    ('cccccccc-0000-0000-0000-000000000002'::uuid, 'water', m1,   600, 26, 'cash',         ''),
    ('cccccccc-0000-0000-0000-000000000004'::uuid, 'rent',  m2, 15000, 2, 'nagad',         'NG-30091'),
    ('cccccccc-0000-0000-0000-000000000004'::uuid, 'rent',  m1, 15000, 3, 'nagad',         'NG-31447'),
    ('dddddddd-0000-0000-0000-000000000001'::uuid, 'rent',  m2, 40000, 4, 'bank_transfer', 'CITY-8812'),
    ('dddddddd-0000-0000-0000-000000000001'::uuid, 'rent',  m1, 40000, 4, 'bank_transfer', 'CITY-9020'),
    ('dddddddd-0000-0000-0000-000000000002'::uuid, 'rent',  m1, 20000, 6, 'cash',          '')
  ) as v (tenant_id, type_key, billing_month, amount, day_offset, method, reference)
  join public.tenancies tc on tc.tenant_id = v.tenant_id and tc.status = 'active'
  join public.charge_types ct on ct.org_id is null and ct.key = v.type_key
  join public.charges c on c.tenancy_id = tc.id and c.charge_type_id = ct.id and c.billing_month = v.billing_month;

end;
$$;

-------------------------------------------------------------------------------
-- Maintenance (Phase 5). Comments carry explicit authors (no session in seed).
--   Tanvir (A1):  pending "Kitchen sink is leaking" + a tenant comment
--   Rahim (A2):   in progress "AC not cooling" + internal note + public reply
--   Nusrat (1A):  resolved "Front door lock is jammed"
--   Imran (B 101): pending "No internet since yesterday"
-------------------------------------------------------------------------------

do $$
declare
  c_landlord_a constant uuid := '11111111-1111-1111-1111-111111111111';
  c_tenant_a constant uuid := '33333333-3333-3333-3333-333333333333';
  v_sink uuid;
  v_ac uuid;
  v_lock uuid;
begin
  insert into public.maintenance_requests (org_id, unit_id, tenancy_id, category, title, description, created_by, created_at)
  select tc.org_id, tc.unit_id, tc.id, 'plumbing', 'Kitchen sink is leaking',
    'Water drips from the pipe under the sink. I put a bucket under it for now.', c_tenant_a, now() - interval '2 days'
  from public.tenancies tc
  where tc.tenant_id = 'cccccccc-0000-0000-0000-000000000001' and tc.status = 'active'
  returning id into v_sink;

  insert into public.maintenance_updates (request_id, author_id, body, created_at)
  values (v_sink, c_tenant_a, 'It got worse this morning. Please send someone soon.', now() - interval '1 day');

  insert into public.maintenance_requests (org_id, unit_id, tenancy_id, category, title, description, created_at)
  select tc.org_id, tc.unit_id, tc.id, 'air_conditioning', 'AC not cooling',
    'The bedroom AC runs but blows warm air.', now() - interval '5 days'
  from public.tenancies tc
  where tc.tenant_id = 'cccccccc-0000-0000-0000-000000000002' and tc.status = 'active'
  returning id into v_ac;

  update public.maintenance_requests set status = 'in_progress', assigned_to = 'CoolTech Services' where id = v_ac;
  insert into public.maintenance_updates (request_id, author_id, body, is_internal, created_at) values
    (v_ac, c_landlord_a, 'CoolTech quoted 3,500 for a gas refill. Approved.', true, now() - interval '3 days'),
    (v_ac, c_landlord_a, 'A technician from CoolTech will visit on Saturday morning.', false, now() - interval '3 days');

  insert into public.maintenance_requests (org_id, unit_id, tenancy_id, category, title, description, created_at)
  select tc.org_id, tc.unit_id, tc.id, 'door_lock', 'Front door lock is jammed', '', now() - interval '20 days'
  from public.tenancies tc
  where tc.tenant_id = 'cccccccc-0000-0000-0000-000000000004' and tc.status = 'active'
  returning id into v_lock;
  update public.maintenance_requests set status = 'resolved' where id = v_lock;

  insert into public.maintenance_requests (org_id, unit_id, tenancy_id, category, title, description, created_at)
  select tc.org_id, tc.unit_id, tc.id, 'internet', 'No internet since yesterday', '', now() - interval '1 day'
  from public.tenancies tc
  where tc.tenant_id = 'dddddddd-0000-0000-0000-000000000001' and tc.status = 'active';
end;
$$;
