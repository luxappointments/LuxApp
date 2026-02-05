alter table public.services
  add column if not exists price_starts_at boolean not null default false;
