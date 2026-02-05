alter table public.services
  add column if not exists category text;

create index if not exists idx_services_category on public.services(business_id, category);
