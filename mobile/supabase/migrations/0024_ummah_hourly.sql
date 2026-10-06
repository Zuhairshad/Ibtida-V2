-- 0024_ummah_hourly.sql
-- Anonymous hourly Ummah totals for the Community / Home trend bars: one row per hour for the
-- last p_hours hours (oldest first), zero-filled. Counts only — never who.

create or replace function public.get_ummah_hourly(p_hours integer default 12)
returns table (hour timestamptz, count numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select h.hour, coalesce((select sum(d.count) from public.dhikr_hourly d where d.hour = h.hour), 0)::numeric
  from generate_series(
    date_trunc('hour', now()) - make_interval(hours => least(greatest(coalesce(p_hours, 12), 1), 48) - 1),
    date_trunc('hour', now()),
    interval '1 hour'
  ) as h(hour)
  where auth.uid() is not null
  order by h.hour;
$$;

revoke execute on function public.get_ummah_hourly(integer) from public, anon;
grant execute on function public.get_ummah_hourly(integer) to authenticated;
