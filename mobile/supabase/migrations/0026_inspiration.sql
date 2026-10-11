-- Islamic Inspiration feed: admins publish 2–3 posts a day (Quranic ayah, hadith, reminder, quote);
-- every user reads them in the app's feed, live.
--
-- * Admins are listed in app_admins (add one with:  insert into public.app_admins (user_id) values ('<auth user id>');).
--   is_admin() is the single check used by the policies and the app.
-- * Anyone (signed in or not) can read published posts whose publish time has come; drafts,
--   archived and scheduled-for-later posts are visible only to admins.
-- * At most 3 published posts per day (by publish date, in Pakistan time by default), enforced
--   by a trigger so the app and any other client follow the same rule.
-- * Ayahs and hadiths must carry their source (e.g. "Al-Baqarah 2:153", "Sahih Muslim 596").
-- * The table is added to the supabase_realtime publication, so open apps receive new posts at once.

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
-- No policies: read only through is_admin().

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.inspirations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('ayah', 'hadith', 'reminder', 'quote')),
  title text check (title is null or char_length(title) <= 80),
  body_ar text check (body_ar is null or char_length(body_ar) <= 1200),
  body_en text check (body_en is null or char_length(body_en) <= 1200),
  body_ur text check (body_ur is null or char_length(body_ur) <= 1200),
  source text check (source is null or char_length(source) <= 120),
  -- Quranic posts keep their reference so the app can show (and re-check) the verbatim text.
  surah smallint check (surah is null or surah between 1 and 114),
  ayah smallint check (ayah is null or ayah between 1 and 286),
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  publish_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspirations_has_text check (coalesce(body_ar, body_en, body_ur) is not null),
  constraint inspirations_sourced check (kind not in ('ayah', 'hadith') or (source is not null and char_length(trim(source)) > 0)),
  constraint inspirations_ayah_ref check (kind <> 'ayah' or (surah is not null and ayah is not null))
);

create index if not exists inspirations_feed_idx on public.inspirations (publish_at desc) where status = 'published';

alter table public.inspirations enable row level security;

drop policy if exists inspirations_read_published on public.inspirations;
create policy inspirations_read_published on public.inspirations
  for select to anon, authenticated
  using ((status = 'published' and publish_at <= now()) or public.is_admin());

drop policy if exists inspirations_admin_insert on public.inspirations;
create policy inspirations_admin_insert on public.inspirations
  for insert to authenticated with check (public.is_admin());

drop policy if exists inspirations_admin_update on public.inspirations;
create policy inspirations_admin_update on public.inspirations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists inspirations_admin_delete on public.inspirations;
create policy inspirations_admin_delete on public.inspirations
  for delete to authenticated using (public.is_admin());

-- Keep updated_at fresh and hold the daily limit.
create or replace function public.inspirations_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_day date := (new.publish_at at time zone 'Asia/Karachi')::date;
  v_count int;
begin
  new.updated_at := now();
  if new.status = 'published' then
    select count(*) into v_count from public.inspirations
     where status = 'published' and id <> new.id
       and (publish_at at time zone 'Asia/Karachi')::date = v_day;
    if v_count >= 3 then
      raise exception 'Three posts are already published for %. Archive one or choose another day.', v_day using errcode = 'P0010';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists inspirations_guard on public.inspirations;
create trigger inspirations_guard before insert or update on public.inspirations
  for each row execute function public.inspirations_guard();

grant select on public.inspirations to anon, authenticated;
grant insert, update, delete on public.inspirations to authenticated;

-- Live delivery to open apps.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inspirations') then
    alter publication supabase_realtime add table public.inspirations;
  end if;
end $$;
