-- =========================================================================
-- 0002_auth_functions.sql
-- Criação automática de profile + criação segura de organização no cadastro
-- =========================================================================

-- -------------------------------------------------------------------------
-- Cria automaticamente um profile quando um novo usuário se cadastra
-- -------------------------------------------------------------------------
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- -------------------------------------------------------------------------
-- Cria a organização + membership(client_admin) + pipeline padrão para
-- quem acabou de se cadastrar. security definer: roda com privilégios do
-- dono da função (bypassa a RLS de `organizations`, que normalmente só
-- permite escrita para platform_admin), mas continua validando que existe
-- um usuário autenticado e que ele ainda não pertence a nenhuma organização.
-- -------------------------------------------------------------------------
create or replace function create_organization_with_admin(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  new_pipeline_id uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from memberships where user_id = uid) then
    raise exception 'user_already_has_organization';
  end if;

  insert into organizations (name) values (org_name) returning id into new_org_id;

  insert into memberships (organization_id, user_id, role)
  values (new_org_id, uid, 'client_admin');

  insert into pipelines (organization_id, name, is_default)
  values (new_org_id, 'Pipeline padrão', true)
  returning id into new_pipeline_id;

  insert into pipeline_stages (organization_id, pipeline_id, name, kind, order_index) values
    (new_org_id, new_pipeline_id, 'Novo', 'open', 1),
    (new_org_id, new_pipeline_id, 'Contato realizado', 'open', 2),
    (new_org_id, new_pipeline_id, 'Qualificado', 'open', 3),
    (new_org_id, new_pipeline_id, 'Proposta enviada', 'open', 4),
    (new_org_id, new_pipeline_id, 'Negociação', 'open', 5),
    (new_org_id, new_pipeline_id, 'Ganho', 'won', 6),
    (new_org_id, new_pipeline_id, 'Perdido', 'lost', 7);

  return new_org_id;
end;
$$;

revoke all on function create_organization_with_admin(text) from public;
grant execute on function create_organization_with_admin(text) to authenticated;
