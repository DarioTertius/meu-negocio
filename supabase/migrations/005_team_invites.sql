-- ============================================================================
-- MEU NEGÓCIO — 005: equipe e convites de usuários
-- ============================================================================

create table invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role member_role not null default 'seller',
  created_by uuid,
  claimed_by uuid,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index idx_invites_org_email_open
  on invites (organization_id, lower(email)) where claimed_at is null;

alter table invites enable row level security;
create policy "tenant select" on invites for select using (organization_id in (select user_org_ids()));
create policy "tenant insert" on invites for insert with check (organization_id in (select user_org_ids()));
create policy "tenant delete" on invites for delete using (organization_id in (select user_org_ids()));

create policy "profiles: colegas de empresa" on profiles for select
  using (id in (select user_id from organization_members
                where organization_id in (select user_org_ids())));

create or replace function public.claim_invites()
returns integer
language plpgsql security definer set search_path = public as $$
declare v_email text; v_count integer := 0; inv record;
begin
  if auth.uid() is null then return 0; end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is null then return 0; end if;

  for inv in
    select id, organization_id, role from invites
    where lower(email) = v_email and claimed_at is null
    for update
  loop
    insert into organization_members (organization_id, user_id, role)
    values (inv.organization_id, auth.uid(), inv.role)
    on conflict do nothing;

    update invites set claimed_at = now(), claimed_by = auth.uid() where id = inv.id;

    insert into audit_logs (organization_id, user_id, action, entity, entity_id)
    values (inv.organization_id, auth.uid(), 'claim', 'invite', inv.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

create or replace function public.my_role(p_org uuid)
returns member_role
language sql stable security definer set search_path = public as $$
  select role from organization_members
  where organization_id = p_org and user_id = auth.uid()
$$;

create or replace function public.create_invite(p_org uuid, p_email text, p_role member_role)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if my_role(p_org) not in ('owner','admin') then
    raise exception 'apenas o dono ou administrador pode convidar usuários';
  end if;
  if p_role = 'owner' then raise exception 'não é possível convidar como dono'; end if;
  if coalesce(trim(p_email),'') = '' or position('@' in p_email) = 0 then
    raise exception 'e-mail inválido';
  end if;
  if exists (
    select 1 from organization_members m join auth.users u on u.id = m.user_id
    where m.organization_id = p_org and lower(u.email) = lower(trim(p_email))
  ) then
    raise exception 'este e-mail já faz parte da equipe';
  end if;

  insert into invites (organization_id, email, role, created_by)
  values (p_org, lower(trim(p_email)), p_role, auth.uid())
  returning id into v_id;

  insert into audit_logs (organization_id, user_id, action, entity, entity_id, detail)
  values (p_org, auth.uid(), 'create', 'invite', v_id, jsonb_build_object('role', p_role));
  return v_id;
exception when unique_violation then
  raise exception 'já existe um convite pendente para este e-mail';
end $$;

create or replace function public.remove_member(p_org uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_role(p_org) not in ('owner','admin') then
    raise exception 'apenas o dono ou administrador pode remover usuários';
  end if;
  if (select role from organization_members where organization_id = p_org and user_id = p_user) = 'owner' then
    raise exception 'o dono da empresa não pode ser removido';
  end if;
  if p_user = auth.uid() then raise exception 'você não pode remover a si mesmo'; end if;

  delete from organization_members where organization_id = p_org and user_id = p_user;
  insert into audit_logs (organization_id, user_id, action, entity, entity_id)
  values (p_org, auth.uid(), 'remove', 'member', p_user);
end $$;

create or replace function public.set_member_role(p_org uuid, p_user uuid, p_role member_role)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_role(p_org) not in ('owner','admin') then
    raise exception 'apenas o dono ou administrador pode alterar perfis';
  end if;
  if p_role = 'owner' then raise exception 'não é possível promover a dono'; end if;
  if (select role from organization_members where organization_id = p_org and user_id = p_user) = 'owner' then
    raise exception 'o perfil do dono não pode ser alterado';
  end if;

  update organization_members set role = p_role
  where organization_id = p_org and user_id = p_user;

  insert into audit_logs (organization_id, user_id, action, entity, entity_id, detail)
  values (p_org, auth.uid(), 'set_role', 'member', p_user, jsonb_build_object('role', p_role));
end $$;