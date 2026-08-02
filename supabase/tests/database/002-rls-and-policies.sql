-- RLS is enabled, and the policies are exactly the ones designed.
--
-- Behavioural tests (003 onwards) prove access works as intended. This file
-- proves nothing extra was added: an accidental FOR ALL policy, or one granted
-- TO public, would pass every behavioural test while quietly widening access.

-- Remote runs connect as cli_login_postgres, and pgTAP lives in the extensions
-- schema. See 000-setup.sql for why both lines are required.
set role postgres;
set search_path = public, extensions, tests;

begin;
select plan(30);

-- ---------------------------------------------------------------------------
-- RLS enabled on every public table (4)
-- ---------------------------------------------------------------------------
select is(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.profiles'::regclass),
  true, 'RLS is enabled on profiles');
select is(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.goals'::regclass),
  true, 'RLS is enabled on goals');
select is(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.goal_actions'::regclass),
  true, 'RLS is enabled on goal_actions');
select is(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.check_ins'::regclass),
  true, 'RLS is enabled on check_ins');

-- Nothing in public may be left unprotected, including tables added later.
select is_empty(
  $$ select c.relname
       from pg_catalog.pg_class c
       join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relrowsecurity = false $$,
  'no table in the public schema is without RLS');

-- ---------------------------------------------------------------------------
-- Exact policy sets (4)
-- ---------------------------------------------------------------------------
-- policies_are fails if a policy is missing OR if an extra one exists.
select policies_are('public', 'profiles',
  array['profiles_select_own', 'profiles_update_own'],
  'profiles has exactly SELECT and UPDATE policies, no INSERT or DELETE');

select policies_are('public', 'goals',
  array['goals_select_own', 'goals_insert_own', 'goals_update_own'],
  'goals has no DELETE policy: deletion is archival');

select policies_are('public', 'goal_actions',
  array['goal_actions_select_own', 'goal_actions_insert_own',
        'goal_actions_update_own', 'goal_actions_delete_own'],
  'goal_actions has all four policies');

select policies_are('public', 'check_ins',
  array['check_ins_select_own', 'check_ins_insert_own',
        'check_ins_update_own', 'check_ins_delete_own'],
  'check_ins has all four policies');

-- ---------------------------------------------------------------------------
-- Each policy covers exactly one command (13)
-- ---------------------------------------------------------------------------
-- A FOR ALL policy would report 'a' here and grant far more than its name says.
select policy_cmd_is('public', 'profiles', 'profiles_select_own', 'select',
  'profiles_select_own is SELECT only');
select policy_cmd_is('public', 'profiles', 'profiles_update_own', 'update',
  'profiles_update_own is UPDATE only');

select policy_cmd_is('public', 'goals', 'goals_select_own', 'select',
  'goals_select_own is SELECT only');
select policy_cmd_is('public', 'goals', 'goals_insert_own', 'insert',
  'goals_insert_own is INSERT only');
select policy_cmd_is('public', 'goals', 'goals_update_own', 'update',
  'goals_update_own is UPDATE only');

select policy_cmd_is('public', 'goal_actions', 'goal_actions_select_own', 'select',
  'goal_actions_select_own is SELECT only');
select policy_cmd_is('public', 'goal_actions', 'goal_actions_insert_own', 'insert',
  'goal_actions_insert_own is INSERT only');
select policy_cmd_is('public', 'goal_actions', 'goal_actions_update_own', 'update',
  'goal_actions_update_own is UPDATE only');
select policy_cmd_is('public', 'goal_actions', 'goal_actions_delete_own', 'delete',
  'goal_actions_delete_own is DELETE only');

select policy_cmd_is('public', 'check_ins', 'check_ins_select_own', 'select',
  'check_ins_select_own is SELECT only');
select policy_cmd_is('public', 'check_ins', 'check_ins_insert_own', 'insert',
  'check_ins_insert_own is INSERT only');
select policy_cmd_is('public', 'check_ins', 'check_ins_update_own', 'update',
  'check_ins_update_own is UPDATE only');
select policy_cmd_is('public', 'check_ins', 'check_ins_delete_own', 'delete',
  'check_ins_delete_own is DELETE only');

-- ---------------------------------------------------------------------------
-- Every policy targets authenticated and nothing else (4 samples + sweep)
-- ---------------------------------------------------------------------------
select policy_roles_are('public', 'profiles', 'profiles_select_own',
  array['authenticated'], 'profiles_select_own targets authenticated only');
select policy_roles_are('public', 'goals', 'goals_update_own',
  array['authenticated'], 'goals_update_own targets authenticated only');
select policy_roles_are('public', 'goal_actions', 'goal_actions_delete_own',
  array['authenticated'], 'goal_actions_delete_own targets authenticated only');
select policy_roles_are('public', 'check_ins', 'check_ins_insert_own',
  array['authenticated'], 'check_ins_insert_own targets authenticated only');

-- Sweep: no policy anywhere may reach anon or PUBLIC.
--
-- polroles = '{0}' is how Postgres records TO PUBLIC. The role names are
-- resolved inside an EXISTS over unnest, rather than by passing a set-returning
-- expression into pg_get_userbyid, so each OID is looked up as a scalar.
select is_empty(
  $$ select p.polname
       from pg_catalog.pg_policy p
       join pg_catalog.pg_class c on c.oid = p.polrelid
       join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and (
          p.polroles = '{0}'::oid[]
          or exists (
            select 1
            from unnest(p.polroles) as role_oid
            where pg_catalog.pg_get_userbyid(role_oid) = 'anon'
          )
        ) $$,
  'no policy grants access to anon or to PUBLIC');

-- ---------------------------------------------------------------------------
-- UPDATE policies carry WITH CHECK (3)
-- ---------------------------------------------------------------------------
-- Without WITH CHECK, an UPDATE can rewrite user_id and hand the row to another
-- account. Behavioural proof is case 11 in 004; this is the structural proof.
select isnt(
  (select polwithcheck from pg_catalog.pg_policy where polname = 'goals_update_own'),
  null, 'goals_update_own has a WITH CHECK expression');
select isnt(
  (select polwithcheck from pg_catalog.pg_policy where polname = 'goal_actions_update_own'),
  null, 'goal_actions_update_own has a WITH CHECK expression');
select isnt(
  (select polwithcheck from pg_catalog.pg_policy where polname = 'check_ins_update_own'),
  null, 'check_ins_update_own has a WITH CHECK expression');

select * from finish();
rollback;
