-- =========================================================================
-- 0006_org_self_service_settings.sql
--
-- A policy original de `organizations` só permitia escrita para
-- platform_admin — mas o client_admin precisa poder editar os dados da
-- própria empresa (nome, CNPJ, logo), conforme a spec original do produto.
-- Criar/excluir uma organização inteira continua exclusivo da agência.
-- =========================================================================

drop policy if exists organizations_write on organizations;

create policy organizations_update on organizations
  for update using (is_org_admin(id, auth.uid()))
  with check (is_org_admin(id, auth.uid()));

create policy organizations_insert on organizations
  for insert with check (is_platform_admin(auth.uid()));

create policy organizations_delete on organizations
  for delete using (is_platform_admin(auth.uid()));
