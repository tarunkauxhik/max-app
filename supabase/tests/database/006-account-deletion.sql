-- Matrix case 22: account deletion is complete, and confined to one account.
--
-- max-security-review requires deletion to cover every row belonging to a user.
-- The cascade chain is auth.users -> profiles -> goals -> {goal_actions,
-- check_ins}. Cascades are not subject to RLS, which is what makes them a
-- complete deletion path rather than a filtered one.
--
-- User B exists throughout so the test proves deletion was targeted, not merely
-- thorough. A migration that widened a cascade would pass a delete-everything
-- test and fail this one.

-- Remote runs connect as cli_login_postgres, and pgTAP lives in the extensions
-- schema. See 000-setup.sql for why both lines are required.
set role postgres;
set search_path = public, extensions, tests;

begin;
select plan(8);

select tests.logout();

select tests.create_user('delete-me@example.test') as a_id \gset
select tests.create_user('keep-me@example.test') as b_id \gset

-- Give both users a complete set of rows.
select tests.authenticate_as(:'a_id');
insert into public.goals (user_id, title, minutes_per_day, duration_weeks, difficulty, start_date)
values (:'a_id', 'Goal belonging to A', 30, 8, 'steady', current_date)
returning id as a_goal_id \gset
insert into public.goal_actions (goal_id, user_id, scheduled_date, position, title)
values (:'a_goal_id', :'a_id', current_date, 1, 'Action belonging to A');
insert into public.check_ins (goal_id, user_id, check_in_date)
values (:'a_goal_id', :'a_id', current_date);

select tests.authenticate_as(:'b_id');
insert into public.goals (user_id, title, minutes_per_day, duration_weeks, difficulty, start_date)
values (:'b_id', 'Goal belonging to B', 20, 12, 'gentle', current_date)
returning id as b_goal_id \gset
insert into public.goal_actions (goal_id, user_id, scheduled_date, position, title)
values (:'b_goal_id', :'b_id', current_date, 1, 'Action belonging to B');
insert into public.check_ins (goal_id, user_id, check_in_date)
values (:'b_goal_id', :'b_id', current_date);

-- Deletion is an administrative act. RLS is bypassed here on purpose: this is
-- what the admin API does, and the point is that the cascade is complete
-- regardless of policy.
select tests.logout();

select isnt_empty(
  format($$ select 1 from public.profiles where id = %L $$, :'a_id'),
  'A has a profile before deletion');

delete from auth.users where id = :'a_id';

-- ---------------------------------------------------------------------------
-- A is gone, entirely (4)
-- ---------------------------------------------------------------------------
select is_empty(
  format($$ select 1 from public.profiles where id = %L $$, :'a_id'),
  'case 22a: A''s profile is gone');
select is_empty(
  format($$ select 1 from public.goals where user_id = %L $$, :'a_id'),
  'case 22b: A''s goals are gone');
select is_empty(
  format($$ select 1 from public.goal_actions where user_id = %L $$, :'a_id'),
  'case 22c: A''s goal_actions are gone');
select is_empty(
  format($$ select 1 from public.check_ins where user_id = %L $$, :'a_id'),
  'case 22d: A''s check_ins are gone');

-- ---------------------------------------------------------------------------
-- B is untouched (3)
-- ---------------------------------------------------------------------------
select isnt_empty(
  format($$ select 1 from public.profiles where id = %L $$, :'b_id'),
  'case 22e: B''s profile survives A''s deletion');
select isnt_empty(
  format($$ select 1 from public.goals where user_id = %L $$, :'b_id'),
  'case 22f: B''s goals survive');
select isnt_empty(
  format($$ select 1 from public.check_ins where user_id = %L $$, :'b_id'),
  'case 22g: B''s check_ins survive');

select * from finish();
rollback;
