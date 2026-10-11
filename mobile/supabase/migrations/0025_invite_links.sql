-- Shareable circle invitation links (https://…/functions/v1/invite?c=CODE → ibtida://join?code=CODE).
--
-- * Codes can expire: invite_expires_at (null = never). Regenerating a code is how an owner revokes
--   it; the old code is remembered in circle_invite_revoked so a stale link says "turned off"
--   instead of "not found".
-- * circle_invite_preview lets someone who opens a link see which circle it is before signing in.
--   It reveals only the circle's name and member count, and only for a valid code.
-- * join_circle_by_code now refuses expired codes with a clear error. Existing 8-character codes
--   keep working (they never expire), so code-only invites stay compatible.

alter table public.community_circles add column if not exists invite_expires_at timestamptz;

create table if not exists public.circle_invite_revoked (
  code text primary key,
  circle_id uuid not null references public.community_circles(id) on delete cascade,
  revoked_at timestamptz not null default now()
);
alter table public.circle_invite_revoked enable row level security;
-- No policies: only the security-definer functions below read or write it.

-- Status of a code: 'ok', 'expired', 'revoked' or 'invalid', plus the circle (name, members) when ok.
create or replace function public.circle_invite_preview(p_code text)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_circle record;
begin
  if v_code !~ '^[A-Z0-9-]{6,40}$' then
    return json_build_object('status', 'invalid');
  end if;
  select c.id, c.name, c.invite_expires_at,
         (select count(*) from public.circle_members m where m.circle_id = c.id) as members
    into v_circle
    from public.community_circles c where upper(c.invite_code) = v_code;
  if v_circle.id is null then
    if exists (select 1 from public.circle_invite_revoked r where r.code = v_code) then
      return json_build_object('status', 'revoked');
    end if;
    return json_build_object('status', 'invalid');
  end if;
  if v_circle.invite_expires_at is not null and v_circle.invite_expires_at <= now() then
    return json_build_object('status', 'expired', 'circleName', v_circle.name);
  end if;
  return json_build_object(
    'status', 'ok',
    'circleName', v_circle.name,
    'members', v_circle.members,
    'expiresAt', v_circle.invite_expires_at,
    'joined', exists (select 1 from public.circle_members m where m.circle_id = v_circle.id and m.user_id = auth.uid())
  );
end;
$$;

create or replace function public.join_circle_by_code(p_code text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_circle record;
  v_inserted int;
  v_name text;
begin
  if v_uid is null then raise exception 'Sign in to join a circle' using errcode = '42501'; end if;
  select id, name, invite_expires_at into v_circle from public.community_circles where upper(invite_code) = v_code;
  if v_circle.id is null then
    if exists (select 1 from public.circle_invite_revoked r where r.code = v_code) then
      raise exception 'This invitation was turned off by the circle owner.' using errcode = 'P0003';
    end if;
    raise exception 'No circle found with that invite code.' using errcode = 'P0002';
  end if;
  if v_circle.invite_expires_at is not null and v_circle.invite_expires_at <= now() then
    raise exception 'This invitation has expired. Ask for a new link.' using errcode = 'P0004';
  end if;
  insert into public.circle_members (circle_id, user_id, role)
  values (v_circle.id, v_uid, 'member')
  on conflict (circle_id, user_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted > 0 then
    v_name := split_part(coalesce(public.visible_name(v_uid), ''), ' ', 1);
    if not coalesce((select (privacy ->> 0)::boolean from public.profiles where id = v_uid), false) or v_name = '' then
      v_name := 'A new member';
    end if;
    insert into public.feed_items (icon, tint, body, circle_id)
    values ('people', 'lav', v_name || ' joined ' || v_circle.name, v_circle.id);
  end if;
  return json_build_object('circleId', v_circle.id, 'circleName', v_circle.name, 'joined', v_inserted > 0);
end;
$$;

-- Regenerate = revoke the old code (and link). p_days sets how long the new one lasts (null = never).
-- Replaces the one-argument version from 0019.
drop function if exists public.regenerate_circle_invite(uuid);
create or replace function public.regenerate_circle_invite(p_circle_id uuid, p_days integer default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new_code text;
  v_old text;
begin
  select invite_code into v_old from public.community_circles where id = p_circle_id and created_by = auth.uid();
  if v_old is null then
    raise exception 'Not the owner of this circle' using errcode = '42501';
  end if;
  if p_days is not null and (p_days < 1 or p_days > 365) then
    raise exception 'Expiry must be between 1 and 365 days' using errcode = '22023';
  end if;
  loop
    v_new_code := public.gen_invite_code();
    exit when not exists (select 1 from public.community_circles where invite_code = v_new_code)
      and not exists (select 1 from public.circle_invite_revoked where code = v_new_code);
  end loop;
  insert into public.circle_invite_revoked (code, circle_id) values (upper(v_old), p_circle_id)
    on conflict (code) do nothing;
  update public.community_circles
     set invite_code = v_new_code,
         invite_expires_at = case when p_days is null then null else now() + make_interval(days => p_days) end
   where id = p_circle_id;
  return v_new_code;
end;
$$;

revoke all on function public.circle_invite_preview(text) from public;
grant execute on function public.circle_invite_preview(text) to anon, authenticated;
grant execute on function public.join_circle_by_code(text) to authenticated;
grant execute on function public.regenerate_circle_invite(uuid, integer) to authenticated;
