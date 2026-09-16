-- ============================================================================
-- Migration 0007 — Hardening (ASCENDE CRM)
-- Este arquivo é incremental: novos itens do plano de ajustes serão
-- adicionados aqui conforme os demais arquivos forem revisados.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- P0-01: Reorder transacional das etapas do Pipeline
--
-- Problema original: o client fazia dois updates sequenciais trocando
-- order_index entre duas etapas. Como pipeline_stages tem
-- UNIQUE (pipeline_id, order_index), o primeiro update podia colidir com o
-- valor que a outra linha ainda tinha, quebrando a troca (ou pior, expondo
-- uma janela onde os dados ficam inconsistentes se o segundo update falhar).
--
-- Solução: um único RPC, executado numa única transação de banco, que:
--   1) trava as duas linhas envolvidas (FOR UPDATE),
--   2) move a etapa de origem para um valor temporário fora do range válido,
--   3) só então atribui os valores finais — nunca há colisão.
--
-- A função roda como SECURITY INVOKER (padrão): a autorização por
-- organização continua sendo garantida pelas policies de RLS já existentes
-- em pipeline_stages (SELECT/UPDATE escopados por organization_id). O
-- controle de "é admin da agência/cliente" já é feito na camada de aplicação
-- (requireAdminSession/canManagePipelineSettings) antes de chamar este RPC.
-- ----------------------------------------------------------------------------

create or replace function public.reorder_pipeline_stage(
  p_stage_id uuid,
  p_direction text
) returns void
language plpgsql
as $$
declare
  v_pipeline_id uuid;
  v_order_index int;
  v_target_id uuid;
  v_target_order int;
begin
  if p_direction not in ('up', 'down') then
    raise exception 'Direção inválida: use ''up'' ou ''down''.';
  end if;

  -- SELECT ... FOR UPDATE já respeita a RLS de SELECT em pipeline_stages:
  -- se a etapa não pertencer à organização do usuário atual, esta consulta
  -- simplesmente não retorna a linha (v_pipeline_id fica null abaixo).
  select pipeline_id, order_index
    into v_pipeline_id, v_order_index
  from public.pipeline_stages
  where id = p_stage_id
  for update;

  if v_pipeline_id is null then
    raise exception 'Etapa não encontrada ou sem permissão de acesso.';
  end if;

  if p_direction = 'up' then
    select id, order_index into v_target_id, v_target_order
    from public.pipeline_stages
    where pipeline_id = v_pipeline_id
      and order_index < v_order_index
    order by order_index desc
    limit 1
    for update;
  else
    select id, order_index into v_target_id, v_target_order
    from public.pipeline_stages
    where pipeline_id = v_pipeline_id
      and order_index > v_order_index
    order by order_index asc
    limit 1
    for update;
  end if;

  -- Já está na ponta (primeira/última etapa): nada a fazer, não é erro.
  if v_target_id is null then
    return;
  end if;

  -- Passo intermediário: valor bem fora do range de order_index em uso,
  -- garantindo que nunca colide com v_target_order durante a troca.
  update public.pipeline_stages
    set order_index = -abs(v_order_index) - 1000000
    where id = p_stage_id;

  update public.pipeline_stages
    set order_index = v_order_index
    where id = v_target_id;

  update public.pipeline_stages
    set order_index = v_target_order
    where id = p_stage_id;
end;
$$;

comment on function public.reorder_pipeline_stage(uuid, text) is
  'P0-01: troca a posição (order_index) de uma etapa com a etapa adjacente '
  '(up/down) de forma transacional, evitando colisão com a constraint '
  'UNIQUE (pipeline_id, order_index). Autorização por organização via RLS '
  'de pipeline_stages; permissão de admin verificada na camada de aplicação.';

grant execute on function public.reorder_pipeline_stage(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- P0-02: closed_at em deals
--
-- updated_at é sobrescrito por qualquer edição do Deal (título, valor,
-- etc.), então não serve como data de fechamento real. closed_at é
-- preenchido apenas quando o Deal é marcado como won/lost
-- (ver lib/deals/actions.ts, markDealStatusAction) e nunca mais alterado.
-- ----------------------------------------------------------------------------

alter table public.deals
  add column if not exists closed_at timestamptz;

comment on column public.deals.closed_at is
  'P0-02: preenchido apenas quando o Deal é marcado como won/lost. '
  'Usar esta coluna (não updated_at) para relatórios de fechamento/receita.';

-- Backfill: Deals já fechados (won/lost) antes desta migration não têm
-- closed_at. Usamos updated_at como melhor aproximação histórica disponível
-- — não é exato (updated_at pode ter mudado por outro motivo depois do
-- fechamento), mas é preferível a perder o histórico de vendas nos
-- relatórios. Fechamentos a partir de agora usam o valor real
-- (lib/deals/actions.ts já preenche closed_at corretamente).
update public.deals
  set closed_at = updated_at
  where status in ('won', 'lost')
    and closed_at is null;

-- ----------------------------------------------------------------------------
-- P1-10: no máximo um Deal aberto por Lead
--
-- A interface trabalha com uma "oportunidade principal" por Lead, mas o
-- banco permitia múltiplos Deals com status = 'open' simultaneamente.
-- Índice único parcial garante a regra mesmo sob concorrência (a checagem
-- em createDealAction é apenas uma otimização de UX; esta constraint é a
-- garantia real).
--
-- ATENÇÃO: se já existirem Leads com mais de um Deal 'open' hoje, este
-- comando falha. Rode a query abaixo antes de aplicar a migration para
-- identificar e resolver duplicados manualmente:
--
--   select lead_id, count(*) from public.deals
--   where status = 'open' group by lead_id having count(*) > 1;
-- ----------------------------------------------------------------------------

create unique index if not exists deals_one_open_per_lead
  on public.deals (lead_id)
  where status = 'open';

-- ----------------------------------------------------------------------------
-- P0-05: integridade cross-tenant completa
--
-- RLS por organização (has_org_access/is_org_admin) só valida a própria
-- linha sendo lida/escrita — ela NÃO impede que, por bug de aplicação, um
-- registro seja gravado com organization_id = A enquanto uma de suas FKs
-- aponta para um registro de organization_id = B (ex.: um Deal da
-- organização A referenciando um pipeline_stage da organização B). Como
-- não há FK composta nativa no Postgres que valide "mesma organização"
-- automaticamente, resolvemos isso com duas triggers genéricas
-- reutilizáveis, parametrizadas por tabela/coluna:
--
--   1) enforce_same_organization(ref_table, ref_column)
--      Garante que o registro referenciado por NEW.<ref_column> em
--      <ref_table> tem o mesmo organization_id do registro atual.
--
--   2) enforce_org_membership(user_column)
--      Garante que o usuário referenciado por NEW.<user_column> é membro
--      da organização do registro atual (via memberships) OU é staff da
--      agência (is_platform_admin) — necessário porque platform_admins
--      não têm linha em memberships para cada organização de cliente que
--      atendem, mas podem legitimamente ser owner/assignee/author em
--      registros de qualquer organização.
--
-- Isso substitui a trigger específica trg_deals_same_org criada
-- anteriormente (mesma checagem, agora generalizada).
-- ----------------------------------------------------------------------------

drop trigger if exists trg_deals_same_org on public.deals;
drop function if exists public.enforce_same_organization_deals_leads();

create or replace function public.enforce_same_organization()
returns trigger
language plpgsql
as $$
declare
  v_ref_table text := TG_ARGV[0];
  v_ref_column text := TG_ARGV[1];
  v_fk_value uuid;
  v_ref_org uuid;
begin
  execute format('select ($1).%I', v_ref_column) into v_fk_value using new;

  -- FK nullable e não preenchida nesta linha: nada a checar.
  if v_fk_value is null then
    return new;
  end if;

  execute format('select organization_id from public.%I where id = $1', v_ref_table)
    into v_ref_org
    using v_fk_value;

  if v_ref_org is null then
    raise exception '% referenciado em % não existe.', v_ref_column, v_ref_table;
  end if;

  if v_ref_org <> new.organization_id then
    raise exception
      'Registro de % não pode referenciar um % de outra organização.',
      TG_TABLE_NAME, v_ref_table;
  end if;

  return new;
end;
$$;

comment on function public.enforce_same_organization() is
  'P0-05: trigger genérica — recusa insert/update quando NEW.<coluna FK> '
  '(2º argumento da trigger) aponta para uma linha de <tabela> (1º '
  'argumento) cujo organization_id difere do organization_id da linha atual.';

create or replace function public.enforce_org_membership()
returns trigger
language plpgsql
as $$
declare
  v_user_column text := TG_ARGV[0];
  v_user_id uuid;
  v_is_valid boolean;
begin
  execute format('select ($1).%I', v_user_column) into v_user_id using new;

  if v_user_id is null then
    return new;
  end if;

  select
    exists (
      select 1 from public.memberships m
      where m.user_id = v_user_id and m.organization_id = new.organization_id
    )
    or public.is_platform_admin(v_user_id)
  into v_is_valid;

  if not v_is_valid then
    raise exception
      'Usuário informado em %.% não pertence a esta organização.',
      TG_TABLE_NAME, v_user_column;
  end if;

  return new;
end;
$$;

comment on function public.enforce_org_membership() is
  'P0-05: trigger genérica — recusa insert/update quando NEW.<coluna de '
  'usuário> (argumento da trigger) não é membro da organização da linha '
  'nem staff da agência (platform_admins).';

-- LEADS: company_id, pipeline_id, stage_id e campaign_id precisam ser da
-- mesma organização; owner_id precisa ser membro dela (ou platform_admin).
create trigger trg_leads_company_same_org
  before insert or update of company_id, organization_id on public.leads
  for each row execute function public.enforce_same_organization('companies', 'company_id');

create trigger trg_leads_pipeline_same_org
  before insert or update of pipeline_id, organization_id on public.leads
  for each row execute function public.enforce_same_organization('pipelines', 'pipeline_id');

create trigger trg_leads_stage_same_org
  before insert or update of stage_id, organization_id on public.leads
  for each row execute function public.enforce_same_organization('pipeline_stages', 'stage_id');

create trigger trg_leads_campaign_same_org
  before insert or update of campaign_id, organization_id on public.leads
  for each row execute function public.enforce_same_organization('campaigns', 'campaign_id');

create trigger trg_leads_owner_same_org
  before insert or update of owner_id, organization_id on public.leads
  for each row execute function public.enforce_org_membership('owner_id');

-- DEALS: lead_id, pipeline_id e stage_id da mesma organização; owner_id
-- membro dela (ou platform_admin).
create trigger trg_deals_lead_same_org
  before insert or update of lead_id, organization_id on public.deals
  for each row execute function public.enforce_same_organization('leads', 'lead_id');

create trigger trg_deals_pipeline_same_org
  before insert or update of pipeline_id, organization_id on public.deals
  for each row execute function public.enforce_same_organization('pipelines', 'pipeline_id');

create trigger trg_deals_stage_same_org
  before insert or update of stage_id, organization_id on public.deals
  for each row execute function public.enforce_same_organization('pipeline_stages', 'stage_id');

create trigger trg_deals_owner_same_org
  before insert or update of owner_id, organization_id on public.deals
  for each row execute function public.enforce_org_membership('owner_id');

-- ACTIVITIES: lead_id da mesma organização; author_id membro dela (ou
-- platform_admin).
create trigger trg_activities_lead_same_org
  before insert or update of lead_id, organization_id on public.activities
  for each row execute function public.enforce_same_organization('leads', 'lead_id');

create trigger trg_activities_author_same_org
  before insert or update of author_id, organization_id on public.activities
  for each row execute function public.enforce_org_membership('author_id');

-- TASKS: lead_id da mesma organização; assigned_to membro dela (ou
-- platform_admin).
create trigger trg_tasks_lead_same_org
  before insert or update of lead_id, organization_id on public.tasks
  for each row execute function public.enforce_same_organization('leads', 'lead_id');

create trigger trg_tasks_assigned_same_org
  before insert or update of assigned_to, organization_id on public.tasks
  for each row execute function public.enforce_org_membership('assigned_to');

-- PIPELINE_STAGES: pipeline_id da mesma organização (ex.: impede criar uma
-- etapa em organization_id = A apontando para um pipeline de B).
create trigger trg_pipeline_stages_pipeline_same_org
  before insert or update of pipeline_id, organization_id on public.pipeline_stages
  for each row execute function public.enforce_same_organization('pipelines', 'pipeline_id');

-- NOTIFICATIONS: user_id precisa ser membro da organização (ou platform_admin).
create trigger trg_notifications_user_same_org
  before insert or update of user_id, organization_id on public.notifications
  for each row execute function public.enforce_org_membership('user_id');

-- ----------------------------------------------------------------------------
-- Nota (P1-09): estas triggers garantem apenas a MESMA ORGANIZAÇÃO. Elas
-- não garantem, por exemplo, que deals.stage_id pertença ao MESMO
-- pipeline_id do próprio deal (um stage de outro pipeline da mesma
-- organização passaria por aqui). Esse nível de consistência mais fino é
-- tratado na camada de aplicação (lib/pipeline/actions.ts,
-- lib/leads/actions.ts) como parte do item P1-09.
-- ----------------------------------------------------------------------------