-- Métodos de pago aceptados por negocio
create table if not exists public.business_payment_methods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  method public.payment_method_type not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, method)
);

create index if not exists idx_business_payment_methods_business on public.business_payment_methods(business_id);

alter table public.business_payment_methods enable row level security;

drop policy if exists "business payment methods access" on public.business_payment_methods;
create policy "business payment methods access" on public.business_payment_methods
for all using (
  public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin()
)
with check (
  public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin()
);
