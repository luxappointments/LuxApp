create table if not exists public.business_clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  notes text,
  is_frequent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, email)
);

create trigger trg_business_clients_updated
  before update on public.business_clients
  for each row execute function public.set_updated_at();

alter table public.business_clients enable row level security;

create policy "business clients read" on public.business_clients
  for select using (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin());

create policy "business clients manage" on public.business_clients
  for all using (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin())
  with check (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin());
