-- RLS / RPC verification against the real database, with throwaway users.
--
-- Run it in the SQL editor (or via the Supabase MCP execute_sql tool). Everything happens inside
-- one DO block that ends by raising an exception carrying the report, so the whole transaction
-- rolls back: the test users, their rows and any feed items vanish, nothing is left behind.
-- Expect the "error" output to be the report; every line should start with PASS.
--
-- Each check switches to the `authenticated` role with that user's JWT claims, exactly how
-- PostgREST runs a request from the app.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  r text := '';
  n int;
  v_code text;
  v_code2 text;
  v_circle uuid;
  v_goal uuid;
  v_json json;
  v_item uuid;
  v_txt text;

begin
  -- Throwaway users (handle_new_user creates their profiles).
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-a-' || a || '@test.invalid', '{"full_name":"Alice Test"}', now(), now()),
    (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-b-' || b || '@test.invalid', '{"full_name":"Bilal Test"}', now(), now()),
    (c, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-c-' || c || '@test.invalid', '{"full_name":"Chen Test"}', now(), now());

  ---------------------------------------------------------------- user A writes private data
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.prayer_logs (user_id, log_date, prayer_name, done, status, updated_at)
  values (a, current_date, 'Fajr', true, 'prayed', now());
  insert into public.adhkar_goals (user_id, client_id, title, target, progress)
  values (a, 1, 'Durood Sharif', 100, 33);
  insert into public.wake_log (user_id, log_date, scanned_at) values (a, current_date, now());
  insert into public.emergency_unlocks (user_id, client_key, when_label, reason) values (a, 'k1', 'Thu', 'private note');
  update public.profiles set display_name = 'Alice Test', updated_at = now() + interval '1 second' where id = a;
  get diagnostics n = row_count;
  r := r || case when n = 1 then 'PASS' else 'FAIL' end || ' A updates own profile' || chr(10);

  select count(*) into n from public.prayer_logs where user_id = a;
  r := r || case when n = 1 then 'PASS' else 'FAIL' end || ' A reads own prayer log (' || n || ')' || chr(10);

  -- LWW: an older write does not overwrite a newer row.
  insert into public.prayer_logs (user_id, log_date, prayer_name, done, status, updated_at)
  values (a, current_date, 'Fajr', false, 'missed', now() - interval '1 day')
  on conflict (user_id, log_date, prayer_name) do update set status = excluded.status, done = excluded.done, updated_at = excluded.updated_at;
  select status into v_txt from public.prayer_logs where user_id = a and prayer_name = 'Fajr';
  r := r || case when v_txt = 'prayed' then 'PASS' else 'FAIL' end || ' stale upsert ignored (last write wins), status=' || v_txt || chr(10);

  -- A creates a circle; the trigger makes A the owner; code is 8 chars.
  insert into public.community_circles (name, privacy, created_by) values ('RLS test circle', 'Private', a)
  returning id, invite_code into v_circle, v_code;
  r := r || case when v_code ~ '^[A-Z2-9]{8}$' then 'PASS' else 'FAIL' end || ' invite code is 8 chars: ' || v_code || chr(10);
  select count(*) into n from public.circle_members where circle_id = v_circle and user_id = a and role = 'owner';
  r := r || case when n = 1 then 'PASS' else 'FAIL' end || ' creator is owner member' || chr(10);

  insert into public.community_goals (circle_id, name, target, created_by) values (v_circle, '1,000 Istighfar together', 1000, a)
  returning id into v_goal;
  perform public.log_dhikr(10, null);

  execute 'reset role';

  ---------------------------------------------------------------- user B cannot see A's data
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.prayer_logs where user_id = a;
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' B cannot read A prayer_logs (' || n || ')' || chr(10);
  select count(*) into n from public.adhkar_goals where user_id = a;
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' B cannot read A goals (' || n || ')' || chr(10);
  select count(*) into n from public.wake_log where user_id = a;
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' B cannot read A wake_log (' || n || ')' || chr(10);
  select count(*) into n from public.emergency_unlocks where user_id = a;
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' B cannot read A emergency_unlocks (' || n || ')' || chr(10);
  select count(*) into n from public.profiles where id = a;
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' B cannot read A profile (' || n || ')' || chr(10);
  select count(*) into n from public.dhikr_hourly where user_id = a;
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' B cannot read A dhikr counts (' || n || ')' || chr(10);

  update public.prayer_logs set status = 'missed' where user_id = a;
  get diagnostics n = row_count;
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' B cannot update A prayer_logs (' || n || ' rows)' || chr(10);

  begin
    insert into public.prayer_logs (user_id, log_date, prayer_name, status) values (a, current_date, 'Isha', 'prayed');
    r := r || 'FAIL B inserted a prayer log as A' || chr(10);
  exception when others then
    r := r || 'PASS B cannot write as A (' || sqlstate || ')' || chr(10);
  end;

  select count(*) into n from public.community_circles where id = v_circle;
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' non-member cannot see circle' || chr(10);
  select count(*) into n from public.community_goals where id = v_goal;
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' non-member cannot see circle goal' || chr(10);
  select count(*) into n from public.feed_items where circle_id = v_circle;
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' non-member cannot see circle feed' || chr(10);

  begin
    insert into public.circle_members (circle_id, user_id) values (v_circle, b);
    r := r || 'FAIL B joined by direct insert (bypassing the code)' || chr(10);
  exception when others then
    r := r || 'PASS direct circle_members insert refused (' || sqlstate || ')' || chr(10);
  end;

  begin
    perform public.join_circle_by_code('ZZZZZZZZ');
    r := r || 'FAIL wrong code accepted' || chr(10);
  exception when others then
    r := r || 'PASS wrong invite code refused: ' || sqlerrm || chr(10);
  end;

  v_json := public.join_circle_by_code(lower(v_code));
  r := r || case when (v_json ->> 'circleId')::uuid = v_circle then 'PASS' else 'FAIL' end || ' join_circle_by_code: ' || v_json::text || chr(10);

  select count(*) into n from public.community_circles where id = v_circle;
  r := r || case when n = 1 then 'PASS' else 'FAIL' end || ' member now sees circle' || chr(10);
  select count(*) into n from public.get_circle_member_profiles(v_circle);
  r := r || case when n = 2 then 'PASS' else 'FAIL' end || ' members list has 2' || chr(10);
  select count(*) into n from public.get_circle_member_profiles(v_circle) where display_name is not null and user_id = a;
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' A name hidden (Profile visibility off)' || chr(10);
  select count(*) into n from public.get_my_circles() where id = v_circle and member_count = 2 and role = 'member';
  r := r || case when n = 1 then 'PASS' else 'FAIL' end || ' get_my_circles shows member_count 2' || chr(10);

  begin
    perform public.regenerate_circle_invite(v_circle);
    r := r || 'FAIL member regenerated the code' || chr(10);
  exception when others then
    r := r || 'PASS only owner can regenerate (' || sqlstate || ')' || chr(10);
  end;

  -- Circle shared goal +33, visible to members.
  perform public.contribute_to_goal(v_goal, 33);
  select total into n from public.get_goal_totals(v_circle) where id = v_goal;
  r := r || case when n = 33 then 'PASS' else 'FAIL' end || ' circle goal total 33' || chr(10);

  -- Global goal: join, contribute through log_dhikr, read only aggregates.
  select id into v_goal from public.community_goals where circle_id is null and name = '1 Million Salawat';
  perform public.join_community_goal(v_goal);
  perform public.log_dhikr(21, v_goal);
  select mine into n from public.get_goal_totals(null) where id = v_goal;
  r := r || case when n = 21 then 'PASS' else 'FAIL' end || ' log_dhikr counted toward joined goal (' || n || ')' || chr(10);
  begin
    perform public.contribute_to_goal(v_goal, 100000);
    r := r || 'FAIL unbounded contribution accepted' || chr(10);
  exception when others then
    r := r || 'PASS contribution bounded (' || sqlstate || ')' || chr(10);
  end;
  execute 'reset role';

  ---------------------------------------------------------------- user C (outsider)
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.community_goal_members where user_id <> c;
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' C cannot read anyone''s goal participation (' || n || ')' || chr(10);
  select (get_ummah_stats() ->> 'today')::int into n;
  r := r || case when n >= 31 then 'PASS' else 'FAIL' end || ' Ummah total aggregates everyone (' || n || ')' || chr(10);
  select count(*) into n from public.get_feed(50) where body like '%RLS test circle%';
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' circle feed items hidden from outsider' || chr(10);

  select id into v_item from public.get_feed(50) limit 1;
  insert into public.feed_ameens (item_id, user_id) values (v_item, c);
  begin
    insert into public.feed_ameens (item_id, user_id) values (v_item, c);
    r := r || 'FAIL second Ameen accepted' || chr(10);
  exception when others then
    r := r || 'PASS one Ameen per user per item (' || sqlstate || ')' || chr(10);
  end;
  select ameen_count into n from public.get_feed(50) where id = v_item;
  r := r || case when n = 1 then 'PASS' else 'FAIL' end || ' Ameen count = 1' || chr(10);
  begin
    insert into public.feed_ameens (item_id, user_id) values (v_item, a);
    r := r || 'FAIL C said Ameen as A' || chr(10);
  exception when others then
    r := r || 'PASS cannot Ameen as someone else (' || sqlstate || ')' || chr(10);
  end;
  execute 'reset role';

  ---------------------------------------------------------------- A sees the join + regenerates
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.get_feed(50) where body like '%joined RLS test circle%';
  r := r || case when n = 1 then 'PASS' else 'FAIL' end || ' owner sees "joined" feed item' || chr(10);
  v_code2 := public.regenerate_circle_invite(v_circle);
  r := r || case when v_code2 ~ '^[A-Z2-9]{8}$' and v_code2 <> v_code then 'PASS' else 'FAIL' end || ' owner regenerated code ' || v_code || ' -> ' || v_code2 || chr(10);
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.join_circle_by_code(v_code);
    r := r || 'FAIL old code still works' || chr(10);
  exception when others then
    r := r || 'PASS old code stops working' || chr(10);
  end;
  execute 'reset role';

  ---------------------------------------------------------------- anon
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  select count(*) into n from public.prayer_logs;
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' anon reads no prayer_logs' || chr(10);
  begin
    perform public.get_feed(10);
    r := r || 'FAIL anon can call get_feed' || chr(10);
  exception when others then
    r := r || 'PASS anon cannot call RPCs (' || sqlstate || ')' || chr(10);
  end;
  execute 'reset role';

  raise exception E'RLS REPORT (rolled back)\n%', r;
end;
$$;
