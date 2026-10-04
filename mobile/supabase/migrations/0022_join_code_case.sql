-- 0022_join_code_case.sql
-- Circles created by the original app have lowercase uuid invite codes; match codes
-- case-insensitively so those keep working alongside the new 8-character codes.

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
