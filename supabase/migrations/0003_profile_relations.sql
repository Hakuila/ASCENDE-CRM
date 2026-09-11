-- =========================================================================
-- 0003_profile_relations.sql
-- Troca as FKs que apontavam para auth.users(id) por profiles(id).
--
-- profiles.id é sempre igual a auth.users.id (criado pelo trigger
-- handle_new_auth_user assim que o usuário se cadastra/é convidado), então
-- essa troca não muda nenhuma regra de negócio — só permite que o
-- PostgREST (Supabase) faça o embed automático em consultas como
-- `leads.select('owner:profiles(id, name)')`, que exige uma FK direta
-- entre as duas tabelas específicas.
-- =========================================================================

alter table memberships drop constraint memberships_user_id_fkey;
alter table memberships add constraint memberships_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table leads drop constraint leads_owner_id_fkey;
alter table leads add constraint leads_owner_id_fkey
  foreign key (owner_id) references profiles(id) on delete set null;

alter table deals drop constraint deals_owner_id_fkey;
alter table deals add constraint deals_owner_id_fkey
  foreign key (owner_id) references profiles(id) on delete set null;

alter table activities drop constraint activities_author_id_fkey;
alter table activities add constraint activities_author_id_fkey
  foreign key (author_id) references profiles(id) on delete set null;

alter table tasks drop constraint tasks_assigned_to_fkey;
alter table tasks add constraint tasks_assigned_to_fkey
  foreign key (assigned_to) references profiles(id) on delete set null;

alter table notifications drop constraint notifications_user_id_fkey;
alter table notifications add constraint notifications_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;
