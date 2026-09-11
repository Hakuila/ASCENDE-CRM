-- =========================================================================
-- 0004_create_org_for_user.sql
--
-- create_organization_with_admin (migration 0002) usa auth.uid() — só
-- funciona quando quem chama É o próprio usuário que vai virar admin da
-- organização. Isso deixou de servir: agora o backend (service role) cria
-- a conta do cliente e a organização no mesmo passo, sem esperar o
-- cliente clicar em link nenhum. Esta função aceita o usuário-alvo
-- explicitamente e só pode ser chamada com a service role.
-- =========================================================================

create or replace function create_organization_for_user(org_name text, target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  new_pipeline_id uuid;
begin
  if exists (select 1 from memberships where user_id = target_user_id) then
    raise exception 'user_already_has_organization';
  end if;

  insert into organizations (name) values (org_name) returning id into new_org_id;

  insert into memberships (organization_id, user_id, role)
  values (new_org_id, target_user_id, 'client_admin');

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

-- Só a service role pode chamar (nunca o client anon/authenticated) —
-- diferente da 0002, essa função aceita QUALQUER target_user_id, então
-- não pode ficar acessível para usuários comuns.
revoke all on function create_organization_for_user(text, uuid) from public;
revoke all on function create_organization_for_user(text, uuid) from authenticated;
