-- Ibadah Lock counts apps it sent the user back from; store it with each early unlock.
alter table public.emergency_unlocks
  add column if not exists blocked_attempts integer not null default 0
  check (blocked_attempts >= 0 and blocked_attempts <= 100000);
