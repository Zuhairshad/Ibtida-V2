-- 0019_community_live.sql
-- Live community for the Expo app: 8-character invite codes, circle owner membership,
-- bounded contributions, Ummah dhikr totals, and a milestone feed with an "Ameen" reaction.
--
-- Written without DROP statements so it applies through tooling that holds destructive SQL.
--
-- Privacy model: individual counts are never readable by other users. Every total the app shows
-- comes from a SECURITY DEFINER function that returns aggregates only (sum, participant count).
-- There are no leaderboards and no per-user rankings anywhere.

-- ---------------------------------------------------------------------------
-- Invite codes: 8 characters from an unambiguous alphabet (no 0/O/1/I), CSPRNG bytes.
-- ---------------------------------------------------------------------------
create or replace function public.gen_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea := extensions.gen_random_bytes(8);
  c text := '';
begin
  for i in 0..7 loop
    c := c || substr(alphabet, 1 + (get_byte(b, i) % 32), 1);
  end loop;
  return c;
end;
$$;

alter table public.community_circles alter column invite_code set default public.gen_invite_code();
-- NOT VALID: enforced for every new/changed row; older uuid-style codes (if any) keep working until
-- the owner regenerates them.
alter table public.community_circles add constraint community_circles_invite_code_format
  check (invite_code ~ '^[A-Z2-9]{8}$') not valid;
alter table public.community_circles add constraint community_circles_name_len
  check (char_length(name) between 1 and 60) not valid;
-- privacy: the app's 'Discoverable' option is stored as 'Public' (allowed since 0008).

-- The creator becomes the owner member as part of the same insert.
create or replace function public.add_circle_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.circle_members (circle_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (circle_id, user_id) do nothing;
  return new;
end;
$$;

create or replace trigger community_circles_add_owner after insert on public.community_circles
  for each row execute function public.add_circle_owner();

-- Name shown to other circle members, honouring the "Profile visibility" privacy switch
-- (profiles.privacy[0]); hidden names show as null and the app renders "Circle member".
create or replace function public.visible_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_user_id = auth.uid() or coalesce((p.privacy ->> 0)::boolean, false) then p.display_name
    else null
  end
  from public.profiles p where p.id = p_user_id;
$$;

-- ---------------------------------------------------------------------------
-- community_goals: ordering + idempotent seeding of the global goals.
-- ---------------------------------------------------------------------------
alter table public.community_goals add column if not exists sort smallint not null default 0;
create unique index if not exists community_goals_global_name_uidx on public.community_goals (name) where circle_id is null;

-- ---------------------------------------------------------------------------
-- Contributions (append-only, owner-readable) and anonymous hourly dhikr buckets.
-- ---------------------------------------------------------------------------
create table if not exists public.community_contributions (
  id bigint generated always as identity primary key,
  goal_id uuid not null references public.community_goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index if not exists community_contributions_goal_time_idx on public.community_contributions (goal_id, created_at);
create index if not exists community_contributions_user_idx on public.community_contributions (user_id);

alter table public.community_contributions enable row level security;
create policy "community_contributions_select_own" on public.community_contributions
  for select to authenticated using (auth.uid() = user_id);

create table if not exists public.dhikr_hourly (
  user_id uuid not null references auth.users (id) on delete cascade,
  hour timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, hour)
);
create index if not exists dhikr_hourly_hour_idx on public.dhikr_hourly (hour);

alter table public.dhikr_hourly enable row level security;
create policy "dhikr_hourly_select_own" on public.dhikr_hourly
  for select to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Feed: milestones only. Global items are visible to everyone signed in; circle items only to
-- that circle's members. Rows are written by the server (seed + triggers in the RPCs below).
-- ---------------------------------------------------------------------------
create table if not exists public.feed_items (
  id uuid primary key default gen_random_uuid(),
  icon text not null default 'spark' check (icon in ('flame', 'spark', 'beads', 'people', 'prayer')),
  tint text not null default 'mint' check (tint in ('amb', 'mint', 'blue', 'lav')),
  body text not null,
  circle_id uuid references public.community_circles (id) on delete cascade,
  goal_id uuid references public.community_goals (id) on delete cascade,
  dedupe_key text unique,
  created_at timestamptz not null default now()
);
create index if not exists feed_items_created_idx on public.feed_items (created_at desc);
create index if not exists feed_items_circle_idx on public.feed_items (circle_id);

alter table public.feed_items enable row level security;
create policy "feed_items_select_visible" on public.feed_items
  for select to authenticated
  using (circle_id is null or public.is_circle_member(circle_id, auth.uid()));

-- One Ameen per user per item; only counts are ever exposed to others.
create table if not exists public.feed_ameens (
  item_id uuid not null references public.feed_items (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

alter table public.feed_ameens enable row level security;
create policy "feed_ameens_select_own" on public.feed_ameens
  for select to authenticated using (auth.uid() = user_id);
create policy "feed_ameens_insert_own" on public.feed_ameens
  for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.feed_items f where f.id = item_id));
create policy "feed_ameens_delete_own" on public.feed_ameens
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Internal: post a milestone when a goal's total crosses a 10% step (or completes).
-- ---------------------------------------------------------------------------
create or replace function public.post_goal_milestone(p_goal_id uuid, p_before numeric, p_after numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g record;
  step_before int;
  step_after int;
  v_circle text;
begin
  select * into g from public.community_goals where id = p_goal_id;
  if g is null or g.target <= 0 then return; end if;
  step_before := floor(least(p_before, g.target) * 10 / g.target);
  step_after := floor(least(p_after, g.target) * 10 / g.target);
  if step_after <= step_before then return; end if;
  if g.circle_id is not null then
    select name into v_circle from public.community_circles where id = g.circle_id;
  end if;
  insert into public.feed_items (icon, tint, body, circle_id, goal_id, dedupe_key)
  values (
    case when step_after >= 10 then 'flame' else 'beads' end,
    case when step_after >= 10 then 'amb' else 'blue' end,
    case
      when step_after >= 10 and v_circle is not null then v_circle || ' completed ' || g.name
      when step_after >= 10 then g.name || ' is complete — alhamdulillah'
      else g.name || ' passed ' || (step_after * 10) || '%'
    end,
    g.circle_id, g.id,
    'goal:' || g.id || ':' || step_after
  )
  on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function public.goal_total(p_goal_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(progress), 0) from public.community_goal_members where goal_id = p_goal_id;
$$;

create or replace function public.can_see_goal(p_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_goals g
    where g.id = p_goal_id
      and (g.circle_id is null or public.is_circle_member(g.circle_id, auth.uid()))
  );
$$;

-- ---------------------------------------------------------------------------
-- RPCs (all act as auth.uid(); none accept a user id)
-- ---------------------------------------------------------------------------

create or replace function public.join_circle_by_code(p_code text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_circle record;
  v_inserted int;
  v_name text;
begin
  if v_uid is null then raise exception 'Sign in to join a circle' using errcode = '42501'; end if;
  select id, name into v_circle from public.community_circles where upper(invite_code) = upper(trim(p_code));
  if v_circle.id is null then
    raise exception 'No circle found with that invite code.' using errcode = 'P0002';
  end if;
  insert into public.circle_members (circle_id, user_id, role)
  values (v_circle.id, v_uid, 'member')
  on conflict (circle_id, user_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted > 0 then
    v_name := split_part(coalesce(public.visible_name(v_uid), ''), ' ', 1);
    -- visible_name() returns the caller's own name to the caller, so re-check the switch here.
    if not coalesce((select (privacy ->> 0)::boolean from public.profiles where id = v_uid), false) or v_name = '' then
      v_name := 'A new member';
    end if;
    insert into public.feed_items (icon, tint, body, circle_id)
    values ('people', 'lav', v_name || ' joined ' || v_circle.name, v_circle.id);
  end if;
  return json_build_object('circleId', v_circle.id, 'circleName', v_circle.name, 'joined', v_inserted > 0);
end;
$$;

create or replace function public.regenerate_circle_invite(p_circle_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_new_code text;
begin
  if not exists (
    select 1 from public.community_circles where id = p_circle_id and created_by = auth.uid()
  ) then
    raise exception 'Not the owner of this circle' using errcode = '42501';
  end if;
  loop
    v_new_code := public.gen_invite_code();
    exit when not exists (select 1 from public.community_circles where invite_code = v_new_code);
  end loop;
  update public.community_circles set invite_code = v_new_code where id = p_circle_id;
  return v_new_code;
end;
$$;

-- Circle roster with names (privacy-aware). Same signature as the 0015 version it replaces.
create or replace function public.get_circle_member_profiles(p_circle_id uuid)
returns table (user_id uuid, display_name text, avatar_url text, role text, joined_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_circle_member(p_circle_id, auth.uid()) then
    raise exception 'Not a member of this circle' using errcode = '42501';
  end if;
  return query
  select cm.user_id, public.visible_name(cm.user_id), p.avatar_url, cm.role::text, cm.joined_at
  from public.circle_members cm
  left join public.profiles p on p.id = cm.user_id
  where cm.circle_id = p_circle_id
  order by (cm.role = 'owner') desc, cm.joined_at asc;
end;
$$;

-- The caller's circles with member counts.
create or replace function public.get_my_circles()
returns table (id uuid, name text, privacy text, invite_code text, role text, member_count integer, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.privacy, c.invite_code, m.role,
         (select count(*)::int from public.circle_members x where x.circle_id = c.id),
         c.created_at
  from public.circle_members m
  join public.community_circles c on c.id = m.circle_id
  where m.user_id = auth.uid()
  order by c.created_at asc;
$$;

create or replace function public.join_community_goal(p_goal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if not public.can_see_goal(p_goal_id) then raise exception 'Goal not found' using errcode = 'P0002'; end if;
  insert into public.community_goal_members (goal_id, user_id, progress)
  values (p_goal_id, auth.uid(), 0)
  on conflict (goal_id, user_id) do nothing;
end;
$$;

-- Add to a goal (joins it if needed). Bounded per call so a client cannot inflate totals.
create or replace function public.contribute_to_goal(p_goal_id uuid, p_amount integer)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_before numeric;
  v_mine numeric;
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 10000 then
    raise exception 'Amount must be between 1 and 10000' using errcode = '22023';
  end if;
  if not public.can_see_goal(p_goal_id) then raise exception 'Goal not found' using errcode = 'P0002'; end if;
  -- Serialise contributions per goal so milestone detection sees consistent totals.
  perform 1 from public.community_goals where id = p_goal_id for update;
  v_before := public.goal_total(p_goal_id);
  insert into public.community_goal_members (goal_id, user_id, progress)
  values (p_goal_id, v_uid, p_amount)
  on conflict (goal_id, user_id)
  do update set progress = public.community_goal_members.progress + p_amount
  returning progress into v_mine;
  insert into public.community_contributions (goal_id, user_id, amount) values (p_goal_id, v_uid, p_amount);
  perform public.post_goal_milestone(p_goal_id, v_before, v_before + p_amount);
  return v_mine;
end;
$$;

-- A batch of tasbeeh counts. Adds to the anonymous Ummah total (unless the user switched off
-- "Community participation") and, when p_goal_id is a goal the user has joined, to that goal.
create or replace function public.log_dhikr(p_amount integer, p_goal_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_share boolean;
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 10000 then
    raise exception 'Amount must be between 1 and 10000' using errcode = '22023';
  end if;
  select coalesce((privacy ->> 2)::boolean, true) into v_share from public.profiles where id = v_uid;
  if coalesce(v_share, true) then
    insert into public.dhikr_hourly (user_id, hour, count)
    values (v_uid, date_trunc('hour', now()), p_amount)
    on conflict (user_id, hour) do update set count = public.dhikr_hourly.count + p_amount;
  end if;
  if p_goal_id is not null and exists (
    select 1 from public.community_goal_members where goal_id = p_goal_id and user_id = v_uid
  ) then
    perform public.contribute_to_goal(p_goal_id, p_amount);
  end if;
end;
$$;

-- Aggregates for the global goals (p_circle_id null) or one circle's goals (members only).
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

-- Anonymous Ummah numbers: dhikr counted today (UTC), in the current hour, and how many
-- people remembered in the last hour.
create or replace function public.get_ummah_stats()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'today', coalesce((select sum(count) from public.dhikr_hourly where hour >= date_trunc('day', now())), 0),
    'this_hour', coalesce((select sum(count) from public.dhikr_hourly where hour = date_trunc('hour', now())), 0),
    'people_now', (select count(distinct user_id) from public.dhikr_hourly where hour >= date_trunc('hour', now()) - interval '1 hour'),
    'people_today', (select count(distinct user_id) from public.dhikr_hourly where hour >= date_trunc('day', now()))
  );
$$;

-- Feed with Ameen counts (counts only — never who said it) and whether the caller said Ameen.
create or replace function public.get_feed(p_limit integer default 30)
returns table (id uuid, icon text, tint text, body text, scope text, created_at timestamptz, ameen_count integer, mine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id, f.icon, f.tint, f.body,
         case when f.circle_id is not null then 'circle' when f.goal_id is not null then 'goal' else 'global' end,
         f.created_at,
         (select count(*)::int from public.feed_ameens a where a.item_id = f.id),
         exists (select 1 from public.feed_ameens a where a.item_id = f.id and a.user_id = auth.uid())
  from public.feed_items f
  where auth.uid() is not null
    and (f.circle_id is null or public.is_circle_member(f.circle_id, auth.uid()))
  order by f.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;

-- ---------------------------------------------------------------------------
-- Grants: RPCs are for signed-in users only. Internal helpers are not callable at all.
-- ---------------------------------------------------------------------------
revoke execute on function public.post_goal_milestone(uuid, numeric, numeric) from public, anon, authenticated;
revoke execute on function public.add_circle_owner() from public, anon, authenticated;
revoke execute on function public.goal_total(uuid) from public, anon, authenticated;
revoke execute on function public.visible_name(uuid) from public, anon, authenticated;
revoke execute on function public.can_see_goal(uuid) from public, anon, authenticated;

revoke execute on function public.join_circle_by_code(text) from public, anon;
revoke execute on function public.regenerate_circle_invite(uuid) from public, anon;
revoke execute on function public.get_circle_member_profiles(uuid) from public, anon;
revoke execute on function public.get_my_circles() from public, anon;
revoke execute on function public.join_community_goal(uuid) from public, anon;
revoke execute on function public.contribute_to_goal(uuid, integer) from public, anon;
revoke execute on function public.log_dhikr(integer, uuid) from public, anon;
revoke execute on function public.get_goal_totals(uuid) from public, anon;
revoke execute on function public.get_ummah_stats() from public, anon;
revoke execute on function public.get_feed(integer) from public, anon;

grant execute on function public.join_circle_by_code(text) to authenticated;
grant execute on function public.regenerate_circle_invite(uuid) to authenticated;
grant execute on function public.get_circle_member_profiles(uuid) to authenticated;
grant execute on function public.get_my_circles() to authenticated;
grant execute on function public.join_community_goal(uuid) to authenticated;
grant execute on function public.contribute_to_goal(uuid, integer) to authenticated;
grant execute on function public.log_dhikr(integer, uuid) to authenticated;
grant execute on function public.get_goal_totals(uuid) to authenticated;
grant execute on function public.get_ummah_stats() to authenticated;
grant execute on function public.get_feed(integer) to authenticated;
grant execute on function public.gen_invite_code() to authenticated;

-- ---------------------------------------------------------------------------
-- Seed: the three global goals from mobile/src/data/content.ts COMMUNITY_GOALS, and a few
-- welcome items for the feed. Totals start at zero and grow from real contributions.
-- ---------------------------------------------------------------------------
insert into public.community_goals (name, target, unit, ends_at, sort)
values
  ('1 Million Salawat', 1000000, 'salawat', now() + interval '6 days', 0),
  ('Fajr together · 30 days', 300000, 'prayers', now() + interval '21 days', 1),
  ('10 Million Istighfar', 10000000, 'istighfar', now() + interval '12 days', 2)
on conflict (name) where circle_id is null do nothing;

insert into public.feed_items (icon, tint, body, dedupe_key)
values
  ('beads', 'blue', '1 Million Salawat has begun — every count is added together', 'seed:salawat'),
  ('prayer', 'mint', 'Fajr together · 30 days is open to everyone', 'seed:fajr'),
  ('spark', 'mint', '10 Million Istighfar started across the Ummah', 'seed:istighfar'),
  ('flame', 'amb', 'Welcome to Ibtida community — counted, never ranked', 'seed:welcome')
on conflict (dedupe_key) do nothing;
