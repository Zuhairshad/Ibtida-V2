-- 0020_advisor_fixes.sql
-- Security advisor warnings: the signup trigger function is not an RPC, and the shared
-- updated_at helper gets a fixed search_path.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
alter function public.set_updated_at() set search_path = '';
