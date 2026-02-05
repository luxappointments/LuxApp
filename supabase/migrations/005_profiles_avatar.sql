-- Profile picture for all users
alter table public.profiles
  add column if not exists avatar_url text;
