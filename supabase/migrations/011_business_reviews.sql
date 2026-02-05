create table if not exists public.business_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  comment text,
  reply text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id)
);

create index if not exists idx_business_reviews_business on public.business_reviews(business_id, created_at);

create or replace function public.can_review_business(target_business_id uuid, target_appointment_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.appointments a
    where a.id = target_appointment_id
      and a.business_id = target_business_id
      and a.status = 'completed'
      and (a.customer_id = auth.uid() or a.client_email = (auth.jwt() ->> 'email'))
  );
$$;

create trigger trg_business_reviews_updated
  before update on public.business_reviews
  for each row execute function public.set_updated_at();

alter table public.business_reviews enable row level security;

create policy "business reviews select" on public.business_reviews
  for select using (
    is_published = true
    or public.owns_business(business_id)
    or public.is_business_staff(business_id)
    or public.is_admin()
    or customer_id = auth.uid()
  );

create policy "business reviews insert" on public.business_reviews
  for insert with check (
    auth.uid() is not null
    and public.can_review_business(business_id, appointment_id)
  );

create policy "business reviews update" on public.business_reviews
  for update using (
    public.owns_business(business_id)
    or public.is_business_staff(business_id)
    or public.is_admin()
  )
  with check (
    public.owns_business(business_id)
    or public.is_business_staff(business_id)
    or public.is_admin()
  );
