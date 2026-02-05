alter table public.appointments
  add column if not exists total_price_cents int,
  add column if not exists total_duration_min int,
  add column if not exists guest_count int not null default 0;

alter table public.appointments
  add constraint appointments_guest_count_check
  check (guest_count between 0 and 1);

create table if not exists public.appointment_services (
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  price_cents int not null check (price_cents >= 0),
  duration_min int not null check (duration_min >= 0),
  sort_order int not null default 100,
  primary key (appointment_id, service_id)
);

create index if not exists idx_appt_services_appt on public.appointment_services(appointment_id);

alter table public.appointment_services enable row level security;

create policy "appointment_services read by related appointment"
  on public.appointment_services
  for select
  using (
    exists (
      select 1
      from public.appointments a
      where a.id = appointment_id
        and (
          a.customer_id = auth.uid()
          or a.client_email = (auth.jwt() ->> 'email')
          or public.owns_business(a.business_id)
          or public.is_business_staff(a.business_id)
          or public.is_admin()
        )
    )
  );

create policy "appointment_services manage by business"
  on public.appointment_services
  for all
  using (
    exists (
      select 1
      from public.appointments a
      where a.id = appointment_id
        and (public.owns_business(a.business_id) or public.is_business_staff(a.business_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1
      from public.appointments a
      where a.id = appointment_id
        and (public.owns_business(a.business_id) or public.is_business_staff(a.business_id) or public.is_admin())
    )
  );
