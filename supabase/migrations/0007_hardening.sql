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
-- ============================================================================
-- P0-07: token de integração (Meta Ads) fora do JSONB, via Supabase Vault
--
-- Problema: page_access_token era gravado em texto puro dentro de
-- integrations.config (jsonb) — qualquer leitura da tabela (incluindo
-- backups, réplicas, um bug de RLS futuro, etc.) expõe o token do Meta em
-- claro. Tokens de API de terceiros são segredo, não configuração.
--
-- Solução: Supabase Vault (extensão de criptografia at-rest nativa do
-- projeto) guarda o valor cifrado; a tabela integrations passa a guardar
-- apenas o ID do segredo (access_token_secret_id), que sozinho não serve
-- para nada sem passar pelas funções abaixo.
--
-- Acesso ao valor decifrado é restrito à service_role (nunca ao usuário
-- autenticado comum) — na prática, só o job/webhook que efetivamente chama
-- a API do Meta (rodando com lib/supabase/admin.ts, ver P1-07) consegue
-- decifrar o token.
-- ============================================================================

-- Normalmente já vem habilitada em projetos Supabase; o "if not exists"
-- evita erro caso já esteja.
create extension if not exists supabase_vault with schema vault;

alter table public.integrations
  add column if not exists access_token_secret_id uuid;

comment on column public.integrations.access_token_secret_id is
  'P0-07: referência ao segredo no Supabase Vault (vault.secrets). O valor '
  'em si NUNCA fica em texto puro nesta tabela — ver funções '
  'set_integration_secret / get_integration_secret.';

-- Grava ou rotaciona o token cifrado. Quem chama precisa ser admin da
-- organização (mesma regra de canManageIntegrations aplicada em app, +
-- reforço aqui no banco).
create or replace function public.set_integration_secret(
  p_organization_id uuid,
  p_provider text,
  p_secret text
) returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_existing_secret_id uuid;
  v_new_secret_id uuid;
begin
  if not public.is_org_admin(p_organization_id, auth.uid()) then
    raise exception 'Apenas administradores podem configurar integrações.';
  end if;

  select access_token_secret_id into v_existing_secret_id
  from public.integrations
  where organization_id = p_organization_id and provider = p_provider;

  if not found then
    raise exception 'Integração % não encontrada para esta organização. Salve a configuração antes de definir o token.', p_provider;
  end if;

  if v_existing_secret_id is not null then
    -- Token já existia (ex.: reconexão) — rotaciona o valor no mesmo segredo.
    perform vault.update_secret(v_existing_secret_id, p_secret);
  else
    v_new_secret_id := vault.create_secret(
      p_secret,
      p_organization_id::text || ':' || p_provider,
      'Token de acesso da integração ' || p_provider
    );
    update public.integrations
      set access_token_secret_id = v_new_secret_id
      where organization_id = p_organization_id and provider = p_provider;
  end if;
end;
$$;

comment on function public.set_integration_secret(uuid, text, text) is
  'P0-07: grava/rotaciona no Vault o segredo de uma integração. Só admins '
  'da organização (is_org_admin) podem chamar.';

revoke execute on function public.set_integration_secret(uuid, text, text) from public;
grant execute on function public.set_integration_secret(uuid, text, text) to authenticated;

-- Decifra o token. Restrito à service_role: NUNCA exposto ao client
-- autenticado como usuário comum, mesmo admin de organização — a UI não
-- precisa (e não deve) reexibir o token depois de salvo.
create or replace function public.get_integration_secret(
  p_organization_id uuid,
  p_provider text
) returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
  v_decrypted text;
begin
  select access_token_secret_id into v_secret_id
  from public.integrations
  where organization_id = p_organization_id and provider = p_provider;

  if v_secret_id is null then
    return null;
  end if;

  select decrypted_secret into v_decrypted
  from vault.decrypted_secrets
  where id = v_secret_id;

  return v_decrypted;
end;
$$;

comment on function public.get_integration_secret(uuid, text) is
  'P0-07: decifra o token de uma integração. Só a service_role pode '
  'executar — nunca conceder a authenticated/anon.';

revoke execute on function public.get_integration_secret(uuid, text) from public, authenticated, anon;
grant execute on function public.get_integration_secret(uuid, text) to service_role;

-- ----------------------------------------------------------------------------
-- Backfill: migra qualquer page_access_token já salvo em config (texto
-- puro) para o Vault, então remove a chave do JSONB.
--
-- ATENÇÃO: isto roda como o dono da migration (geralmente postgres/service
-- role via CLI), então tem permissão de chamar vault.create_secret
-- diretamente. Se sua ferramenta de migration rodar com um role sem essa
-- permissão, rode este bloco manualmente com a service role.
-- ----------------------------------------------------------------------------

do $$
declare
  r record;
  v_secret_id uuid;
begin
  for r in
    select organization_id, provider, config->>'page_access_token' as token
    from public.integrations
    where config ? 'page_access_token'
      and config->>'page_access_token' is not null
      and config->>'page_access_token' <> ''
  loop
    v_secret_id := vault.create_secret(
      r.token,
      r.organization_id::text || ':' || r.provider,
      'Token migrado do config JSONB (P0-07)'
    );

    update public.integrations
      set access_token_secret_id = v_secret_id,
          config = config - 'page_access_token'
      where organization_id = r.organization_id and provider = r.provider;
  end loop;
end $$;

-- ============================================================================
-- P0-08: uma organização por usuário (regra do MVP)
--
-- Hoje só existe unique(organization_id, user_id) em memberships — isso
-- impede duplicar a MESMA combinação, mas não impede o mesmo usuário
-- pertencer a DUAS organizações diferentes. As duas funções de criação de
-- organização (create_organization_with_admin, create_organization_for_user)
-- já checam isso em nível de aplicação, mas qualquer outro caminho que
-- insira direto em memberships (ex.: um futuro fluxo de convite para
-- adicionar um salesperson a uma organização) não passa por nenhuma delas
-- — e getSession() já pressupõe uma organização só (usa .maybeSingle()).
--
-- Esta constraint fecha a lacuna para QUALQUER caminho de escrita, atual
-- ou futuro, sem depender de cada função de aplicação lembrar de checar.
--
-- Caso o produto precise de multi-organização no futuro, a migração de
-- saída é: remover esta constraint + implementar conceito de "organização
-- ativa" na sessão (cookie/param indicando qual das organizações do
-- usuário está em uso), como o próprio plano de ajustes sugere.
-- ----------------------------------------------------------------------------
-- ATENÇÃO: se algum usuário já estiver em mais de uma organização hoje,
-- este comando falha. Rode antes:
--
--   select user_id, count(*) from public.memberships
--   group by user_id having count(*) > 1;
--
-- e decida manualmente qual organização cada usuário deve manter.
-- ============================================================================

alter table public.memberships
  add constraint memberships_one_org_per_user unique (user_id);

-- ============================================================================
-- P1-02: rate limiting persistido (login, recuperação, API pública, webhooks)
--
-- Um contador em memória (Map/objeto no processo Node) NÃO funciona em
-- ambiente serverless: cada invocação pode cair numa instância diferente,
-- sem estado compartilhado, então o limite nunca é atingido de verdade.
-- Persistimos os contadores no Postgres, com incremento atômico via
-- INSERT ... ON CONFLICT (evita race condition entre requisições
-- concorrentes que um "SELECT então UPDATE" teria).
--
-- Algoritmo: fixed window (janela fixa) — simples e suficiente para os
-- casos de uso aqui (login, recuperação de senha, API pública, webhook).
-- ============================================================================

create table if not exists public.rate_limit_hits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (key, window_start)
);

comment on table public.rate_limit_hits is
  'P1-02: contadores de rate limiting por janela fixa. Não é acessada '
  'diretamente pelo client — só através de check_rate_limit(). Linhas '
  'antigas devem ser podadas periodicamente (ver cleanup_rate_limit_hits).';

create or replace function public.check_rate_limit(
  p_key text,
  p_window_seconds int,
  p_max_requests int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  -- Arredonda "agora" para o início da janela atual (ex.: janela de 60s
  -- às 14:32:47 vira 14:32:00) — todas as requisições da mesma janela
  -- incrementam a mesma linha.
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_hits (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
    do update set count = public.rate_limit_hits.count + 1
  returning count into v_count;

  return jsonb_build_object(
    'allowed', v_count <= p_max_requests,
    'remaining', greatest(p_max_requests - v_count, 0)
  );
end;
$$;

comment on function public.check_rate_limit(text, int, int) is
  'P1-02: incrementa atomicamente o contador de <p_key> na janela atual de '
  '<p_window_seconds>s e retorna {allowed, remaining} contra o limite '
  '<p_max_requests>. Restrita à service_role — chamada só a partir de '
  'lib/rate-limit.ts (Route Handlers e middleware), nunca do client.';

revoke all on function public.check_rate_limit(text, int, int) from public, authenticated, anon;
grant execute on function public.check_rate_limit(text, int, int) to service_role;

-- Poda linhas antigas — sem isso a tabela cresce indefinidamente. Rodar
-- periodicamente (ex.: via pg_cron, se disponível no seu plano Supabase,
-- ou uma Edge Function agendada). Não agendamos automaticamente aqui para
-- não presumir que pg_cron está habilitado no projeto.
create or replace function public.cleanup_rate_limit_hits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limit_hits where window_start < now() - interval '1 day';
$$;

comment on function public.cleanup_rate_limit_hits() is
  'P1-02: remove contadores de rate limit com mais de 1 dia. Agendar via '
  'pg_cron (select cron.schedule(...)) ou uma Edge Function com cron '
  'trigger — não roda sozinha.';

revoke all on function public.cleanup_rate_limit_hits() from public, authenticated, anon;
grant execute on function public.cleanup_rate_limit_hits() to service_role;