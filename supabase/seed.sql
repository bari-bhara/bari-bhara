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
