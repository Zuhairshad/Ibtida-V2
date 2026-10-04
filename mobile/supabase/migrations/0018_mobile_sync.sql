-- 0018_mobile_sync.sql
-- Columns and tables the offline-first Expo app (mobile/src/lib/sync.ts) pushes to.
--
-- Written without DROP statements so it applies through tooling that holds destructive SQL.
--
-- Conflict rule: last write wins by updated_at. The client sends the time the user made the
-- change; lww_touch() keeps the newer row, so a late upload from a device that was offline never
-- overwrites a newer edit made elsewhere. Rows written without an explicit updated_at get now().

create or replace function public.lww_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at is null or new.updated_at = old.updated_at then
    new.updated_at := now();
  elsif new.updated_at < old.updated_at then
    return null; -- stale write: keep the newer row
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: name, prayer settings, privacy flags and the rest of the app settings.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists method smallint not null default 0,
  add column if not exists madhab text not null default 'hanafi',
  add column if not exists city jsonb,
  add column if not exists privacy jsonb not null default '[]'::jsonb,
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles add constraint profiles_madhab_check check (madhab in ('hanafi', 'standard'));

create or replace trigger profiles_lww before update on public.profiles
  for each row execute function public.lww_touch();

-- ---------------------------------------------------------------------------
-- prayer_logs: the app has three states (prayed / missed / cleared). `status` is null when the
-- user cleared the entry; `done` is kept in step for the original app's queries.
-- ---------------------------------------------------------------------------
alter table public.prayer_logs add column if not exists status text;
alter table public.prayer_logs add constraint prayer_logs_status_check check (status in ('prayed', 'missed'));

-- Re-point the existing updated_at trigger at lww_touch (CREATE OR REPLACE, no DROP needed).
create or replace trigger prayer_logs_set_updated_at before update on public.prayer_logs
  for each row execute function public.lww_touch();

-- ---------------------------------------------------------------------------
-- adhkar_goals: personal goals and their progress. client_id is the app's local id.
-- ---------------------------------------------------------------------------
alter table public.adhkar_goals
  add column if not exists client_id bigint,
  add column if not exists streak integer not null default 0,
  add column if not exists remind text,
  add column if not exists week jsonb not null default '[]'::jsonb,
  add column if not exists sched jsonb,
  add column if not exists cg_name text;

create unique index if not exists adhkar_goals_user_client_uidx on public.adhkar_goals (user_id, client_id);

create or replace trigger adhkar_goals_set_updated_at before update on public.adhkar_goals
  for each row execute function public.lww_touch();

-- ---------------------------------------------------------------------------
-- wake_log: each verified two-stage wake scan (wudu station -> prayer mat). Append-only.
-- ---------------------------------------------------------------------------
create table if not exists public.wake_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date date not null,
  scanned_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, scanned_at)
);

alter table public.wake_log enable row level security;

create policy "wake_log_select_own" on public.wake_log for select to authenticated using (auth.uid() = user_id);
create policy "wake_log_insert_own" on public.wake_log for insert to authenticated with check (auth.uid() = user_id);
create policy "wake_log_delete_own" on public.wake_log for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- emergency_unlocks: early exits from an Ibadah Lock, with the user's own note. Only the owner
-- can ever read these; nothing aggregates them. client_key makes uploads idempotent.
-- (emergency_overrides from 0010 requires a focus_sessions row the app does not keep.)
-- ---------------------------------------------------------------------------
create table if not exists public.emergency_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_key text not null,
  when_label text not null,
  after_label text,
  reason text,
  created_at timestamptz not null default now(),
  unique (user_id, client_key)
);

alter table public.emergency_unlocks enable row level security;

create policy "emergency_unlocks_select_own" on public.emergency_unlocks for select to authenticated using (auth.uid() = user_id);
create policy "emergency_unlocks_insert_own" on public.emergency_unlocks for insert to authenticated with check (auth.uid() = user_id);
create policy "emergency_unlocks_delete_own" on public.emergency_unlocks for delete to authenticated using (auth.uid() = user_id);
