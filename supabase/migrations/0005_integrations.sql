-- =========================================================================
-- 0005_integrations.sql
-- Suporte a leads vindos de fontes externas (Meta Lead Ads, formulários de
-- landing page): dedupe por ID externo + chave de API pública por org.
-- =========================================================================

-- external_lead_id: ID do lead na origem (ex.: leadgen_id do Meta). Permite
-- reprocessar o mesmo webhook (Meta reenvia em caso de timeout) sem duplicar.
alter table leads add column external_lead_id text;

create unique index leads_org_external_id_unique
  on leads (organization_id, external_lead_id)
  where external_lead_id is not null;

-- Chave pública por organização, para identificar de qual organização é um
-- lead recebido via API pública de captura (landing pages externas). Não é
-- segredo de autenticação forte (não dá acesso de leitura a nada, só
-- permite CRIAR leads) — mas ainda assim fica de fora do que a RLS expõe
-- por padrão a qualquer membro; só quem gerencia integrações vê/regenera.
alter table organizations add column public_api_key text;

update organizations
set public_api_key = replace(gen_random_uuid()::text, '-', '')
where public_api_key is null;

alter table organizations alter column public_api_key set not null;
alter table organizations alter column public_api_key set default replace(gen_random_uuid()::text, '-', '');
alter table organizations add constraint organizations_public_api_key_unique unique (public_api_key);

create index organizations_public_api_key_idx on organizations (public_api_key);
