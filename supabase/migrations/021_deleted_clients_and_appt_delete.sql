create table if not exists public.business_deleted_clients (
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  deleted_at timestamptz not null default now(),
  primary key (business_id, email)
);

create index if not exists idx_deleted_clients_business on public.business_deleted_clients(business_id, deleted_at desc);

alter table public.business_deleted_clients enable row level security;

create policy "deleted clients manage" on public.business_deleted_clients
  for all using (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin())
  with check (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin());
