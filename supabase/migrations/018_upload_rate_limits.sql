create table if not exists public.upload_rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  window_start timestamptz not null,
  count int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, window_start)
);

create index if not exists idx_upload_rate_user_window on public.upload_rate_limits(user_id, window_start);

alter table public.upload_rate_limits enable row level security;

create policy "upload rate admin only" on public.upload_rate_limits
  for all using (public.is_admin())
  with check (public.is_admin());
