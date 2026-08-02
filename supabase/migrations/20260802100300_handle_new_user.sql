-- Profile creation on signup.
--
-- Last and alone, deliberately. A failure inside an AFTER INSERT trigger on
-- auth.users propagates to the signup transaction and blocks account creation
-- entirely. Isolating it means this migration can be reverted without
-- disturbing the schema, and its failure mode can be tested on its own.
--
-- The function is kept as small as it can possibly be for the same reason:
-- one insert, no branching, no reads.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- SECURITY DEFINER is required here, and only here. profiles has no INSERT
  -- policy by design, so this runs with the function owner's rights to create
  -- the row the new user cannot create for themselves.
  --
  -- raw_user_meta_data is deliberately NOT read. It is user-supplied and
  -- user-editable, so copying it into a profile would let a signup dictate its
  -- own profile contents. display_name starts null; the user sets it later
  -- through profiles_update_own, which is subject to RLS and constraints.
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT on auth.users. Creates the matching profile row. Idempotent; ignores user metadata.';

-- Callable only as a trigger. EXECUTE is checked when a trigger is created,
-- not when it fires, so revoking here does not affect the trigger below.
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Exceptions are not swallowed.
--
-- An EXCEPTION ... WHEN OTHERS block here would keep signups working when the
-- insert fails, at the cost of an auth.users row with no profile. Every
-- foreign key in this schema chains through profiles, so that user would then
-- be unable to create a goal, an action or a check-in, and the cause would be
-- invisible at the point of failure. Failing loudly at signup is the louder,
-- cheaper failure.
--
-- Test 007-handle-new-user.sql exercises this path explicitly rather than
-- assuming it.
