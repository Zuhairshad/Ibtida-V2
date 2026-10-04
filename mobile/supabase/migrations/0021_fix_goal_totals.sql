-- 0021_fix_goal_totals.sql
-- sum(integer) is bigint; the declared column is numeric. (0019 is fixed in place for fresh setups.)

create or replace function public.get_goal_totals(p_circle_id uuid default null)
returns table (
  id uuid, name text, target numeric, unit text, ends_at timestamptz, sort smallint,
  total numeric, participants integer, this_hour numeric, mine numeric, joined boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if p_circle_id is not null and not public.is_circle_member(p_circle_id, auth.uid()) then
    raise exception 'Not a member of this circle' using errcode = '42501';
  end if;
  return query
  select g.id, g.name, g.target, g.unit, g.ends_at, g.sort,
         coalesce((select sum(m.progress) from public.community_goal_members m where m.goal_id = g.id), 0),
         (select count(*)::int from public.community_goal_members m where m.goal_id = g.id),
         coalesce((select sum(c.amount)::numeric from public.community_contributions c
                   where c.goal_id = g.id and c.created_at >= now() - interval '1 hour'), 0),
         coalesce((select m.progress from public.community_goal_members m where m.goal_id = g.id and m.user_id = auth.uid()), 0),
         exists (select 1 from public.community_goal_members m where m.goal_id = g.id and m.user_id = auth.uid())
  from public.community_goals g
  where (p_circle_id is null and g.circle_id is null) or g.circle_id = p_circle_id
  order by g.sort, g.created_at;
end;
$$;
