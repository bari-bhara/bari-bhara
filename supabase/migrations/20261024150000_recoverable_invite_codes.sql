-- Feedback round 1, Phase D — invite codes stay visible to the landlord until
-- used or expired. See docs/plans/0003-feedback-round-1.md (Phase D) and ADR 0011.
-- Claiming still matches code_hash; this adds an encrypted copy for display.

-- The encryption key lives in Supabase Vault, not in the table or the migration.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'invite_code_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'invite_code_key',
      'Encrypts tenant invite codes so landlords can see them until used (ADR 0011).'
    );
  end if;
end;
$$;

alter table public.tenant_invites add column code_encrypted bytea;

comment on column public.tenant_invites.code_encrypted is
  'pgp_sym_encrypt(code, Vault invite_code_key). Read only through get_tenant_invite_code().';

-- The column grant on tenant_invites lists columns explicitly, so landlords
-- can't select code_encrypted directly.

create function private.invite_code_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'invite_code_key';
$$;

revoke execute on function private.invite_code_key() from public, anon, authenticated;

-- As before, plus the encrypted copy.
create or replace function public.create_tenant_invite(p_tenant_id uuid)
returns table (invite_code text, invite_expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  -- Crockford base32: no I, L, O or U.
  c_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_org_id uuid;
  v_user_id uuid;
  v_bytes bytea;
  v_code text := '';
  v_expires_at timestamptz;
begin
  select t.org_id, t.user_id
  into v_org_id, v_user_id
  from public.tenants t
  where t.id = p_tenant_id
    and t.org_id in (select private.user_org_ids());

  if v_org_id is null then
    raise exception 'Tenant not found.' using errcode = 'BB004';
  end if;
  if v_user_id is not null then
    raise exception 'This tenant already has an app login.' using errcode = 'BB005';
  end if;

  delete from public.tenant_invites
  where tenant_id = p_tenant_id and used_at is null;

  -- 10 characters x 5 bits = 50 bits. 256 is a multiple of 32, so byte % 32 is unbiased.
  v_bytes := extensions.gen_random_bytes(10);
  for i in 0..9 loop
    v_code := v_code || substr(c_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;

  insert into public.tenant_invites (org_id, tenant_id, code_hash, code_encrypted, created_by)
  values (
    v_org_id,
    p_tenant_id,
    encode(extensions.digest(v_code, 'sha256'), 'hex'),
    extensions.pgp_sym_encrypt(v_code, private.invite_code_key()),
    (select auth.uid())
  )
  returning expires_at into v_expires_at;

  perform private.log_activity(v_org_id, 'TENANT_INVITE_CREATED', 'tenant', p_tenant_id);

  return query select v_code, v_expires_at;
end;
$$;

-- The tenant's active invite code, for members of its organization only.
-- No row when there's no unused, unexpired code (or it predates this change).
create function public.get_tenant_invite_code(p_tenant_id uuid)
returns table (invite_code text, invite_expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select extensions.pgp_sym_decrypt(i.code_encrypted, private.invite_code_key()), i.expires_at
  from public.tenant_invites i
  where i.tenant_id = p_tenant_id
    and i.org_id in (select private.user_org_ids())
    and i.used_at is null
    and i.expires_at > now()
    and i.code_encrypted is not null
  order by i.created_at desc
  limit 1;
$$;

revoke execute on function public.get_tenant_invite_code(uuid) from public, anon;
grant execute on function public.get_tenant_invite_code(uuid) to authenticated;
