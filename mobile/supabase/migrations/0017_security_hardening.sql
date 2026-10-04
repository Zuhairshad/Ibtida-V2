-- 0017_security_hardening.sql
-- Fixes found while wiring the Expo app (mobile/) to this schema:
--
-- * join_circle_by_code(p_code, p_user_id) and contribute_to_goal(p_goal_id, p_user_id, p_amount)
--   were SECURITY DEFINER and trusted a caller-supplied user id, so any signed-in user could add
--   someone else to a circle or write progress in their name. The old signatures are neutralised
--   here and replaced (0019) by versions that only ever act as auth.uid().
-- * circle_members allowed a self-insert into ANY circle whose uuid you knew, bypassing the invite
--   code. Membership now only changes through the owner trigger and join_circle_by_code (0019).
-- * Any user could create a *global* community goal. Users may only create circle-scoped goals.
-- * community_goal_members rows of global goals were readable by every user, exposing individual
--   contributions. Participation rows are now owner-only; totals come from aggregate RPCs (0019).
-- * Progress could be written directly (insert/update own row with any number). It now only
--   changes through contribute_to_goal / log_dhikr, which bound the amount.
--
-- Written without DROP statements (policies are narrowed with ALTER POLICY) so it can be applied
-- through tooling that holds destructive statements for confirmation.

create or replace function public.join_circle_by_code(p_code text, p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'join_circle_by_code(code, user_id) was removed; call join_circle_by_code(code)' using errcode = '42501';
end;
$$;

create or replace function public.contribute_to_goal(p_goal_id uuid, p_user_id uuid, p_amount numeric)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'contribute_to_goal(goal, user_id, amount) was removed; call contribute_to_goal(goal, amount)' using errcode = '42501';
end;
$$;

revoke execute on function public.join_circle_by_code(text, uuid) from public, anon, authenticated;
revoke execute on function public.contribute_to_goal(uuid, uuid, numeric) from public, anon, authenticated;

-- No direct inserts into circle_members.
alter policy "circle_members_insert_self_or_owner" on public.circle_members
  to authenticated
  with check (false);

-- Users may only create goals inside a circle they belong to.
alter policy "community_goals_insert_own" on public.community_goals
  to authenticated
  with check (
    auth.uid() = created_by
    and circle_id is not null
    and public.is_circle_member(circle_id, auth.uid())
  );

-- Same rule as before, but through the SECURITY DEFINER helper (no nested RLS on circle_members).
alter policy "community_goals_select_global_or_member" on public.community_goals
  to authenticated
  using (circle_id is null or public.is_circle_member(circle_id, auth.uid()));

-- Participation rows: owner-only.
alter policy "community_goal_members_select_visible" on public.community_goal_members
  to authenticated
  using (auth.uid() = user_id);
alter policy "community_goal_members_insert_own" on public.community_goal_members
  to authenticated
  with check (false);
alter policy "community_goal_members_update_own" on public.community_goal_members
  to authenticated
  using (false)
  with check (false);
-- delete own (leave a goal) stays.

revoke execute on function public.is_circle_member(uuid, uuid) from public, anon;
grant execute on function public.is_circle_member(uuid, uuid) to authenticated;
revoke execute on function public.get_circle_member_profiles(uuid) from public, anon;
revoke execute on function public.regenerate_circle_invite(uuid) from public, anon;
