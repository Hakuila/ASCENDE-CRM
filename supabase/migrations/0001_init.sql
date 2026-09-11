-- =========================================================================
-- CRM SaaS B2B — Migration inicial (0001_init.sql)
-- Multi-tenant via organization_id + Row Level Security (RLS)
-- =========================================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------------------
-- ENUMS
-- -------------------------------------------------------------------------
create type membership_role as enum ('client_admin', 'salesperson');
create type lead_stage_kind as enum ('open', 'won', 'lost'); -- classifica a pipeline_stage
create type deal_status as enum ('open', 'won', 'lost');
create type activity_type as enum (
  'created', 'status_change', 'call', 'whatsapp', 'email',
  'meeting', 'proposal', 'sale', 'note'
);
create type task_priority as enum ('low', 'medium', 'high');
create type integration_provider as enum ('meta_ads', 'google_ads', 'whatsapp');

-- -------------------------------------------------------------------------
-- PLATFORM ADMINS (equipe da agência — acesso cross-tenant)
-- -------------------------------------------------------------------------
create table platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- ORGANIZATIONS (tenants — clientes que usam o CRM)
-- -------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  cnpj text,
  logo_url text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- PROFILES (espelha auth.users)
-- -------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- MEMBERSHIPS (usuário <-> organização, com role)
-- -------------------------------------------------------------------------
create table memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role membership_role not null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index idx_memberships_user on memberships(user_id);
create index idx_memberships_org on memberships(organization_id);

-- -------------------------------------------------------------------------
-- COMPANIES (empresas/contas dentro de uma organização)
-- -------------------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  document text,
  email text,
  phone text,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_companies_org on companies(organization_id);

-- -------------------------------------------------------------------------
-- PIPELINES / PIPELINE_STAGES (configurável por organização)
-- -------------------------------------------------------------------------
create table pipelines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null default 'Pipeline padrão',
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pipelines_org on pipelines(organization_id);

create table pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  name text not null,
  kind lead_stage_kind not null default 'open',
  order_index int not null,
  created_at timestamptz not null default now(),
  unique (pipeline_id, order_index)
);

create index idx_pipeline_stages_org on pipeline_stages(organization_id);
create index idx_pipeline_stages_pipeline on pipeline_stages(pipeline_id);

-- -------------------------------------------------------------------------
-- LEAD_SOURCES (origens configuráveis por organização)
-- -------------------------------------------------------------------------
create table lead_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index idx_lead_sources_org on lead_sources(organization_id);

-- -------------------------------------------------------------------------
-- CAMPAIGNS
-- -------------------------------------------------------------------------
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  platform text not null, -- 'meta_ads' | 'google_ads' | outro (texto livre no MVP)
  name text not null,
  external_id text,
  spend numeric(12,2) not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  leads_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_campaigns_org on campaigns(organization_id);

-- -------------------------------------------------------------------------
-- LEADS
-- -------------------------------------------------------------------------
create table leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  pipeline_id uuid references pipelines(id) on delete set null,
  stage_id uuid references pipeline_stages(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,

  name text not null,
  email text,
  phone text,
  whatsapp text,

  source text,
  medium text,
  campaign text,
  adset text,
  ad text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,

  value numeric(12,2),
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_leads_org on leads(organization_id);
create index idx_leads_stage on leads(stage_id);
create index idx_leads_owner on leads(owner_id);
create index idx_leads_campaign on leads(campaign_id);
create index idx_leads_org_created on leads(organization_id, created_at desc);

-- -------------------------------------------------------------------------
-- DEALS (oportunidades — criadas quando o lead vira negócio concreto)
-- -------------------------------------------------------------------------
create table deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  pipeline_id uuid references pipelines(id) on delete set null,
  stage_id uuid references pipeline_stages(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,

  title text not null,
  value numeric(12,2),
  expected_close_date date,
  status deal_status not null default 'open',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_deals_org on deals(organization_id);
create index idx_deals_lead on deals(lead_id);
create index idx_deals_status on deals(organization_id, status);

-- -------------------------------------------------------------------------
-- ACTIVITIES (histórico do lead)
-- -------------------------------------------------------------------------
create table activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  type activity_type not null,
  description text,
  created_at timestamptz not null default now()
);

create index idx_activities_org on activities(organization_id);
create index idx_activities_lead on activities(lead_id, created_at desc);

-- -------------------------------------------------------------------------
-- TASKS
-- -------------------------------------------------------------------------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  due_date timestamptz,
  priority task_priority not null default 'medium',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_org on tasks(organization_id);
create index idx_tasks_assigned on tasks(assigned_to, completed);
create index idx_tasks_due on tasks(organization_id, due_date) where completed = false;

-- -------------------------------------------------------------------------
-- INTEGRATIONS (config por organização)
-- -------------------------------------------------------------------------
create table integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider integration_provider not null,
  is_active boolean not null default false,
  config jsonb not null default '{}'::jsonb, -- tokens/segredos NUNCA aqui em texto puro; usar Vault/segredo do backend
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create index idx_integrations_org on integrations(organization_id);

-- -------------------------------------------------------------------------
-- NOTIFICATIONS
-- -------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id, read_at);

-- =========================================================================
-- TRIGGER: updated_at automático
-- =========================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations','companies','pipelines','campaigns',
    'leads','deals','tasks','integrations'
  ]
  loop
    execute format(
      'create trigger trg_set_updated_at before update on %I
       for each row execute function set_updated_at();', t
    );
  end loop;
end $$;

-- =========================================================================
-- FUNÇÕES DE APOIO PARA RLS
-- =========================================================================

-- Usuário é da equipe da agência (acesso cross-tenant)?
create or replace function is_platform_admin(uid uuid)
returns boolean as $$
  select exists (
    select 1 from platform_admins pa where pa.user_id = uid
  );
$$ language sql stable security definer;

-- Usuário tem algum membership ativo na organização?
create or replace function has_org_access(org_id uuid, uid uuid)
returns boolean as $$
  select is_platform_admin(uid) or exists (
    select 1 from memberships m
    where m.organization_id = org_id and m.user_id = uid
  );
$$ language sql stable security definer;

-- Usuário é client_admin daquela organização?
create or replace function is_org_admin(org_id uuid, uid uuid)
returns boolean as $$
  select is_platform_admin(uid) or exists (
    select 1 from memberships m
    where m.organization_id = org_id
      and m.user_id = uid
      and m.role = 'client_admin'
  );
$$ language sql stable security definer;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table memberships enable row level security;
alter table companies enable row level security;
alter table pipelines enable row level security;
alter table pipeline_stages enable row level security;
alter table lead_sources enable row level security;
alter table campaigns enable row level security;
alter table leads enable row level security;
alter table deals enable row level security;
alter table activities enable row level security;
alter table tasks enable row level security;
alter table integrations enable row level security;
alter table notifications enable row level security;
alter table platform_admins enable row level security;

-- platform_admins: cada admin só enxerga a própria linha (usado pelo app
-- para saber "eu sou da agência?"). Inserir/remover admins é feito só via
-- service role (script/console administrativo), nunca pelo client.
create policy platform_admins_select_self on platform_admins
  for select using (user_id = auth.uid());

create policy platform_admins_write_service_only on platform_admins
  for insert with check (false);

create policy platform_admins_update_service_only on platform_admins
  for update using (false);

create policy platform_admins_delete_service_only on platform_admins
  for delete using (false);

-- organizations: membros da própria org, ou staff da agência (todas)
create policy organizations_select on organizations
  for select using (has_org_access(id, auth.uid()));

create policy organizations_write on organizations
  for all using (is_platform_admin(auth.uid()))
  with check (is_platform_admin(auth.uid()));

-- profiles: o próprio usuário, ou qualquer pessoa que compartilhe uma organização com ele
create policy profiles_select on profiles
  for select using (
    id = auth.uid()
    or is_platform_admin(auth.uid())
    or exists (
      select 1 from memberships m1
      join memberships m2 on m1.organization_id = m2.organization_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    )
  );

create policy profiles_update_self on profiles
  for update using (id = auth.uid());

-- memberships: visível para quem pertence à mesma organização
create policy memberships_select on memberships
  for select using (has_org_access(organization_id, auth.uid()));

create policy memberships_write on memberships
  for all using (is_org_admin(organization_id, auth.uid()))
  with check (is_org_admin(organization_id, auth.uid()));

-- Template padrão de policy para as tabelas com organization_id direto
do $$
declare
  t text;
begin
  foreach t in array array[
    'companies','pipelines','pipeline_stages','lead_sources',
    'campaigns','leads','deals','activities','tasks',
    'integrations','notifications'
  ]
  loop
    execute format(
      'create policy %I_select on %I for select using (has_org_access(organization_id, auth.uid()));',
      t, t
    );
    execute format(
      'create policy %I_insert on %I for insert with check (has_org_access(organization_id, auth.uid()));',
      t, t
    );
    execute format(
      'create policy %I_update on %I for update using (has_org_access(organization_id, auth.uid())) with check (has_org_access(organization_id, auth.uid()));',
      t, t
    );
    execute format(
      'create policy %I_delete on %I for delete using (is_org_admin(organization_id, auth.uid()));',
      t, t
    );
  end loop;
end $$;

-- =========================================================================
-- SEED MÍNIMO DE DEMONSTRAÇÃO (organização + pipeline padrão)
-- Usuários e leads de demo devem ser inseridos via script separado
-- (precisam de auth.users já criados) — ver supabase/seed/README.md
-- =========================================================================
insert into organizations (id, name, legal_name, is_demo)
values ('00000000-0000-0000-0000-000000000001', 'Agência Demo', 'Agência Demo LTDA', true);

insert into pipelines (id, organization_id, name, is_default)
values ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Pipeline padrão', true);

insert into pipeline_stages (organization_id, pipeline_id, name, kind, order_index) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Novo', 'open', 1),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Contato realizado', 'open', 2),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Qualificado', 'open', 3),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Proposta enviada', 'open', 4),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Negociação', 'open', 5),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Ganho', 'won', 6),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Perdido', 'lost', 7);
