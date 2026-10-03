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
