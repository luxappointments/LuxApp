create table if not exists public.business_client_reminders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_email text not null,
  note text not null,
  remind_at timestamptz,
  status text not null default 'pending',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_client_reminders_business on public.business_client_reminders(business_id, created_at desc);
create index if not exists idx_client_reminders_email on public.business_client_reminders(client_email);

alter table public.business_client_reminders enable row level security;

create policy "client reminders read" on public.business_client_reminders
  for select using (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin());

create policy "client reminders manage" on public.business_client_reminders
  for all using (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin())
  with check (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin());
