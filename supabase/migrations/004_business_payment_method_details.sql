-- Agrega detalles de cobro por método
alter table public.business_payment_methods
  add column if not exists account_label text,
  add column if not exists account_value text,
  add column if not exists payment_url text,
  add column if not exists notes text;

-- Política pública de lectura para checkout/booking
-- Clientes pueden ver métodos activos de negocios activos
drop policy if exists "business payment methods public read" on public.business_payment_methods;
create policy "business payment methods public read"
on public.business_payment_methods
for select using (
  is_enabled = true
  and exists (
    select 1
    from public.businesses b
    where b.id = business_payment_methods.business_id
      and b.is_active = true
  )
);

-- Política de gestión para owner/staff/admin
drop policy if exists "business payment methods manage" on public.business_payment_methods;
create policy "business payment methods manage"
on public.business_payment_methods
for all using (
  public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin()
)
with check (
  public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin()
);
