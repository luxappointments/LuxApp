-- LuxApp initial schema
create extension if not exists pgcrypto;

-- Enums
create type public.user_role as enum ('client', 'owner', 'staff', 'admin');
create type public.appointment_status as enum (
  'pending_confirmation',
  'confirmed',
  'awaiting_payment',
  'paid',
  'canceled_by_client',
  'canceled_by_business',
  'no_show',
  'completed'
);
create type public.subscription_plan as enum ('free', 'silver', 'gold', 'black');
create type public.subscription_interval as enum ('monthly', 'annual');
create type public.deposit_mode as enum ('none', 'fixed', 'percent', 'full');
create type public.payment_method_type as enum ('stripe', 'cash', 'zelle', 'paypal', 'cashapp', 'other');
create type public.blacklist_scope as enum ('business', 'global');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  phone text,
  role public.user_role not null default 'client',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Owner organizations and business entities
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  name text not null,
  city text not null,
  category text not null,
  description text,
  logo_url text,
  cover_url text,
  rating numeric(3,2),
  available_today boolean not null default false,
  is_active boolean not null default true,
  priority_rank int not null default 100,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null check (role in ('owner', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  bio text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  duration_min int not null check (duration_min between 5 and 600),
  buffer_before_min int not null default 0 check (buffer_before_min between 0 and 120),
  buffer_after_min int not null default 0 check (buffer_after_min between 0 and 120),
  price_cents int not null check (price_cents >= 0),
  requires_confirmation boolean not null default false,
  requires_payment boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_staff (
  service_id uuid not null references public.services(id) on delete cascade,
  staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  primary key (service_id, staff_id)
);

-- Schedules
create table public.business_schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_closed boolean not null default false,
  slot_granularity_min int not null default 15 check (slot_granularity_min in (5,10,15)),
  unique (business_id, weekday)
);

create table public.staff_schedules (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_closed boolean not null default false,
  unique (staff_id, weekday)
);

create table public.schedule_breaks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  staff_id uuid references public.staff_profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (business_id is not null or staff_id is not null)
);

create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  staff_id uuid references public.staff_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (business_id is not null or staff_id is not null),
  check (ends_at > starts_at)
);

-- Policies + anti no-show
create table public.business_policies (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  auto_confirm boolean not null default false,
  deposit_mode public.deposit_mode not null default 'none',
  base_deposit_percent int not null default 0 check (base_deposit_percent between 0 and 100),
  fixed_deposit_cents int check (fixed_deposit_cents is null or fixed_deposit_cents >= 0),
  min_cancel_minutes int not null default 240,
  late_cancel_minutes int not null default 120,
  late_tolerance_minutes int not null default 10,
  no_show_strike_limit int not null default 2,
  strike_window_days int not null default 90,
  pay_later_allowed boolean not null default true,
  external_payments_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.customer_business_stats (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_email text not null,
  strikes int not null default 0,
  last_strike_at timestamptz,
  force_prepay boolean not null default false,
  unique (business_id, customer_email)
);

create table public.customer_global_stats (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  risk_score int not null default 0,
  tier int not null default 0,
  window_days int not null default 180,
  updated_at timestamptz not null default now()
);

create table public.soft_blacklist (
  id uuid primary key default gen_random_uuid(),
  scope public.blacklist_scope not null,
  business_id uuid references public.businesses(id) on delete cascade,
  customer_email text not null,
  reason text,
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check ((scope = 'global' and business_id is null) or (scope = 'business' and business_id is not null))
);

-- Appointments and payments
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  staff_id uuid references public.staff_profiles(id) on delete set null,
  customer_id uuid references public.profiles(id) on delete set null,
  client_email text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.appointment_status not null default 'pending_confirmation',
  required_deposit_percent int not null default 0 check (required_deposit_percent between 0 and 100),
  required_deposit_cents int,
  payment_due_at timestamptz,
  paid_at timestamptz,
  stripe_payment_intent text,
  external_payment_method public.payment_method_type,
  external_payment_proof_url text,
  external_payment_status text,
  cancel_reason text,
  canceled_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  event_type text not null,
  old_status public.appointment_status,
  new_status public.appointment_status,
  actor_id uuid references public.profiles(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  kind text not null,
  channel text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Membership billing
create table public.business_subscriptions (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  plan public.subscription_plan not null default 'free',
  interval public.subscription_interval,
  status text not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful indexes
create index idx_businesses_city_category on public.businesses(city, category);
create index idx_businesses_slug_active on public.businesses(slug, is_active);
create index idx_services_business_active on public.services(business_id, is_active);
create index idx_staff_business_active on public.staff_profiles(business_id, is_active);
create index idx_appt_business_start on public.appointments(business_id, starts_at);
create index idx_appt_staff_start on public.appointments(staff_id, starts_at);
create index idx_appt_customer_email on public.appointments(client_email);
create index idx_appt_status_due on public.appointments(status, payment_due_at);
create index idx_soft_blacklist_lookup on public.soft_blacklist(scope, customer_email, active);
create index idx_notifications_user_created on public.notifications(user_id, created_at desc);

-- Utility trigger: set updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_businesses_updated before update on public.businesses for each row execute function public.set_updated_at();
create trigger trg_staff_updated before update on public.staff_profiles for each row execute function public.set_updated_at();
create trigger trg_services_updated before update on public.services for each row execute function public.set_updated_at();
create trigger trg_appt_updated before update on public.appointments for each row execute function public.set_updated_at();
create trigger trg_subs_updated before update on public.business_subscriptions for each row execute function public.set_updated_at();

-- Role helpers for RLS
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.owns_business(target_business_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = target_business_id and b.owner_id = auth.uid()
  );
$$;

create or replace function public.is_business_staff(target_business_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.business_memberships bm
    where bm.business_id = target_business_id
      and bm.user_id = auth.uid()
      and bm.is_active = true
  );
$$;

-- Risk/deposit functions
create or replace function public.compute_global_min_deposit_percent(score int)
returns int
language plpgsql
immutable
as $$
begin
  if score < 3 then
    return 0;
  elsif score < 6 then
    return 30;
  else
    return 100;
  end if;
end;
$$;

create or replace function public.compute_required_deposit_percent(target_business_id uuid, target_email text)
returns int
language plpgsql
stable
as $$
declare
  base_percent int := 0;
  risk_score int := 0;
  has_global_blacklist boolean := false;
begin
  select coalesce(base_deposit_percent, 0)
  into base_percent
  from public.business_policies
  where business_id = target_business_id;

  select coalesce(cgs.risk_score, 0)
  into risk_score
  from public.customer_global_stats cgs
  where cgs.email = target_email;

  select exists(
    select 1 from public.soft_blacklist sb
    where sb.scope = 'global'
      and sb.customer_email = target_email
      and sb.active = true
      and (sb.expires_at is null or sb.expires_at > now())
  ) into has_global_blacklist;

  if has_global_blacklist then
    return 100;
  end if;

  return greatest(base_percent, public.compute_global_min_deposit_percent(risk_score));
end;
$$;

create or replace function public.apply_risk_event(target_email text, event_type text)
returns void
language plpgsql
as $$
declare
  delta int := 0;
  next_score int := 0;
begin
  if event_type = 'no_show' then delta := 3; end if;
  if event_type = 'late_cancel' then delta := 2; end if;
  if event_type = 'completed' then delta := -1; end if;

  insert into public.customer_global_stats (email, risk_score, tier)
  values (target_email, greatest(0, delta), 0)
  on conflict (email)
  do update
    set risk_score = greatest(0, public.customer_global_stats.risk_score + delta),
        updated_at = now();

  select risk_score into next_score from public.customer_global_stats where email = target_email;

  update public.customer_global_stats
  set tier = case
      when next_score < 3 then 0
      when next_score < 6 then 1
      else 2
    end,
    updated_at = now()
  where email = target_email;
end;
$$;

-- Appointment workflows
create or replace function public.set_appointment_defaults()
returns trigger
language plpgsql
as $$
declare
  svc record;
  policy record;
  dynamic_deposit int;
begin
  select duration_min, requires_confirmation, requires_payment
  into svc
  from public.services
  where id = new.service_id;

  select * into policy from public.business_policies where business_id = new.business_id;

  if new.ends_at is null then
    new.ends_at := new.starts_at + make_interval(mins => coalesce(svc.duration_min, 30));
  end if;

  dynamic_deposit := public.compute_required_deposit_percent(new.business_id, new.client_email);
  new.required_deposit_percent := dynamic_deposit;

  if coalesce(svc.requires_confirmation, false) then
    new.status := 'pending_confirmation';
  elsif coalesce(svc.requires_payment, false) or dynamic_deposit > 0 then
    new.status := 'awaiting_payment';
    new.payment_due_at := coalesce(new.payment_due_at, now() + interval '24 hours');
  elsif coalesce(policy.auto_confirm, false) then
    new.status := 'confirmed';
  else
    new.status := coalesce(new.status, 'pending_confirmation');
  end if;

  return new;
end;
$$;

create trigger trg_appointment_defaults
before insert on public.appointments
for each row execute function public.set_appointment_defaults();

create or replace function public.track_appointment_status_change()
returns trigger
language plpgsql
as $$
declare
  policy record;
  minutes_before int;
begin
  if new.status is distinct from old.status then
    insert into public.appointment_events (appointment_id, event_type, old_status, new_status, metadata)
    values (new.id, 'status_changed', old.status, new.status, '{}'::jsonb);

    if new.status = 'no_show' then
      perform public.apply_risk_event(new.client_email, 'no_show');

      insert into public.customer_business_stats (business_id, customer_email, strikes, last_strike_at, force_prepay)
      values (new.business_id, new.client_email, 1, now(), false)
      on conflict (business_id, customer_email)
      do update set
        strikes = public.customer_business_stats.strikes + 1,
        last_strike_at = now();
    end if;

    if new.status = 'canceled_by_client' then
      select * into policy from public.business_policies where business_id = new.business_id;
      minutes_before := extract(epoch from (new.starts_at - now()))::int / 60;

      if minutes_before < coalesce(policy.late_cancel_minutes, 120) then
        perform public.apply_risk_event(new.client_email, 'late_cancel');

        insert into public.customer_business_stats (business_id, customer_email, strikes, last_strike_at, force_prepay)
        values (new.business_id, new.client_email, 1, now(), false)
        on conflict (business_id, customer_email)
        do update set
          strikes = public.customer_business_stats.strikes + 1,
          last_strike_at = now();
      end if;
    end if;

    if new.status = 'completed' then
      perform public.apply_risk_event(new.client_email, 'completed');
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_appointment_status_changes
after update on public.appointments
for each row execute function public.track_appointment_status_change();

create or replace function public.refresh_force_prepay()
returns trigger
language plpgsql
as $$
declare
  policy record;
begin
  select * into policy from public.business_policies where business_id = new.business_id;

  new.force_prepay := new.strikes >= coalesce(policy.no_show_strike_limit, 2);
  return new;
end;
$$;

create trigger trg_force_prepay
before insert or update on public.customer_business_stats
for each row execute function public.refresh_force_prepay();

-- Plan limits enforcement
create or replace function public.get_owner_plan(target_business_id uuid)
returns public.subscription_plan
language sql
stable
as $$
  select coalesce(bs.plan, 'free'::public.subscription_plan)
  from public.business_subscriptions bs
  where bs.business_id = target_business_id
$$;

create or replace function public.enforce_monthly_appointment_limit()
returns trigger
language plpgsql
as $$
declare
  plan public.subscription_plan;
  month_count int;
begin
  plan := coalesce(public.get_owner_plan(new.business_id), 'free'::public.subscription_plan);

  if plan = 'free' then
    select count(*)
    into month_count
    from public.appointments a
    where a.business_id = new.business_id
      and date_trunc('month', a.starts_at) = date_trunc('month', new.starts_at);

    if month_count >= 40 then
      raise exception 'Free plan limit reached: max 40 citas/mes';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_monthly_appointment_limit
before insert on public.appointments
for each row execute function public.enforce_monthly_appointment_limit();

create or replace function public.enforce_business_limit()
returns trigger
language plpgsql
as $$
declare
  owner_plan public.subscription_plan := 'free';
  business_count int := 0;
begin
  select coalesce(bs.plan, 'free'::public.subscription_plan)
  into owner_plan
  from public.business_subscriptions bs
  join public.businesses b2 on b2.id = bs.business_id
  where b2.owner_id = new.owner_id
  order by bs.updated_at desc
  limit 1;

  select count(*) into business_count from public.businesses b where b.owner_id = new.owner_id;

  if owner_plan = 'free' and business_count >= 1 then
    raise exception 'Free plan permite 1 negocio';
  elsif owner_plan = 'silver' and business_count >= 1 then
    raise exception 'Silver permite 1 negocio';
  elsif owner_plan = 'gold' and business_count >= 2 then
    raise exception 'Gold permite 2 negocios';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_business_limit
before insert on public.businesses
for each row execute function public.enforce_business_limit();

create or replace function public.enforce_staff_limit()
returns trigger
language plpgsql
as $$
declare
  plan public.subscription_plan;
  staff_count int;
begin
  plan := coalesce(public.get_owner_plan(new.business_id), 'free'::public.subscription_plan);

  select count(*) into staff_count
  from public.staff_profiles
  where business_id = new.business_id;

  if plan = 'free' and staff_count >= 1 then
    raise exception 'Free plan permite 1 staff';
  elsif plan = 'silver' and staff_count >= 3 then
    raise exception 'Silver permite 3 staff';
  elsif plan = 'gold' and staff_count >= 10 then
    raise exception 'Gold permite 10 staff';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_staff_limit
before insert on public.staff_profiles
for each row execute function public.enforce_staff_limit();

-- RLS setup
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.services enable row level security;
alter table public.service_staff enable row level security;
alter table public.business_schedules enable row level security;
alter table public.staff_schedules enable row level security;
alter table public.schedule_breaks enable row level security;
alter table public.time_off enable row level security;
alter table public.business_policies enable row level security;
alter table public.customer_business_stats enable row level security;
alter table public.customer_global_stats enable row level security;
alter table public.soft_blacklist enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_events enable row level security;
alter table public.notifications enable row level security;
alter table public.business_subscriptions enable row level security;

-- Profiles
create policy "profiles self read" on public.profiles
for select using (id = auth.uid() or public.is_admin());

create policy "profiles self write" on public.profiles
for update using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Public business discovery
create policy "businesses public active read" on public.businesses
for select using (is_active = true or public.owns_business(id) or public.is_business_staff(id) or public.is_admin());

create policy "businesses owner manage" on public.businesses
for all using (public.owns_business(id) or public.is_admin())
with check (public.owns_business(id) or public.is_admin());

create policy "memberships business access" on public.business_memberships
for select using (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin());

create policy "memberships owner manage" on public.business_memberships
for all using (public.owns_business(business_id) or public.is_admin())
with check (public.owns_business(business_id) or public.is_admin());

-- Services/staff/schedules/policies are visible publicly for booking when business active
create policy "services public read" on public.services
for select using (
  exists (select 1 from public.businesses b where b.id = services.business_id and b.is_active = true)
  or public.owns_business(business_id)
  or public.is_business_staff(business_id)
  or public.is_admin()
);

create policy "services business manage" on public.services
for all using (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin())
with check (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin());

create policy "staff public read" on public.staff_profiles
for select using (
  exists (select 1 from public.businesses b where b.id = staff_profiles.business_id and b.is_active = true)
  or public.owns_business(business_id)
  or public.is_business_staff(business_id)
  or public.is_admin()
);

create policy "staff business manage" on public.staff_profiles
for all using (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin())
with check (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin());

create policy "service_staff business manage" on public.service_staff
for all using (
  exists (
    select 1
    from public.services s
    where s.id = service_staff.service_id
      and (public.owns_business(s.business_id) or public.is_business_staff(s.business_id) or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.services s
    where s.id = service_staff.service_id
      and (public.owns_business(s.business_id) or public.is_business_staff(s.business_id) or public.is_admin())
  )
);

create policy "business schedules access" on public.business_schedules
for all using (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin())
with check (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin());

create policy "staff schedules access" on public.staff_schedules
for all using (
  exists (
    select 1 from public.staff_profiles sp
    where sp.id = staff_schedules.staff_id
      and (public.owns_business(sp.business_id) or public.is_business_staff(sp.business_id) or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.staff_profiles sp
    where sp.id = staff_schedules.staff_id
      and (public.owns_business(sp.business_id) or public.is_business_staff(sp.business_id) or public.is_admin())
  )
);

create policy "schedule breaks access" on public.schedule_breaks
for all using (
  (business_id is not null and (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin()))
  or
  (staff_id is not null and exists (
    select 1 from public.staff_profiles sp
    where sp.id = schedule_breaks.staff_id
      and (public.owns_business(sp.business_id) or public.is_business_staff(sp.business_id) or public.is_admin())
  ))
)
with check (
  (business_id is not null and (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin()))
  or
  (staff_id is not null and exists (
    select 1 from public.staff_profiles sp
    where sp.id = schedule_breaks.staff_id
      and (public.owns_business(sp.business_id) or public.is_business_staff(sp.business_id) or public.is_admin())
  ))
);

create policy "time off access" on public.time_off
for all using (
  (business_id is not null and (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin()))
  or
  (staff_id is not null and exists (
    select 1 from public.staff_profiles sp
    where sp.id = time_off.staff_id
      and (public.owns_business(sp.business_id) or public.is_business_staff(sp.business_id) or public.is_admin())
  ))
)
with check (
  (business_id is not null and (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin()))
  or
  (staff_id is not null and exists (
    select 1 from public.staff_profiles sp
    where sp.id = time_off.staff_id
      and (public.owns_business(sp.business_id) or public.is_business_staff(sp.business_id) or public.is_admin())
  ))
);

create policy "policies public read" on public.business_policies
for select using (
  exists (select 1 from public.businesses b where b.id = business_policies.business_id and b.is_active = true)
  or public.owns_business(business_id)
  or public.is_business_staff(business_id)
  or public.is_admin()
);

create policy "policies business manage" on public.business_policies
for all using (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin())
with check (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin());

-- Appointments
create policy "appointments client read own" on public.appointments
for select using (
  customer_id = auth.uid()
  or client_email = (select email from public.profiles where id = auth.uid())
  or public.owns_business(business_id)
  or public.is_business_staff(business_id)
  or public.is_admin()
);

create policy "appointments create by authenticated" on public.appointments
for insert with check (auth.uid() is not null);

create policy "appointments client update self" on public.appointments
for update using (
  customer_id = auth.uid()
  or client_email = (select email from public.profiles where id = auth.uid())
  or public.owns_business(business_id)
  or public.is_business_staff(business_id)
  or public.is_admin()
)
with check (
  customer_id = auth.uid()
  or client_email = (select email from public.profiles where id = auth.uid())
  or public.owns_business(business_id)
  or public.is_business_staff(business_id)
  or public.is_admin()
);

create policy "appointment events business read" on public.appointment_events
for select using (
  exists (
    select 1
    from public.appointments a
    where a.id = appointment_events.appointment_id
      and (
        a.customer_id = auth.uid()
        or a.client_email = (select email from public.profiles where id = auth.uid())
        or public.owns_business(a.business_id)
        or public.is_business_staff(a.business_id)
        or public.is_admin()
      )
  )
);

create policy "appointment events system insert" on public.appointment_events
for insert with check (public.is_admin() or auth.uid() is not null);

-- Stats + blacklist
create policy "customer business stats business only" on public.customer_business_stats
for all using (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin())
with check (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin());

create policy "customer global stats admin only" on public.customer_global_stats
for all using (public.is_admin())
with check (public.is_admin());

create policy "soft blacklist business or admin" on public.soft_blacklist
for all using (
  public.is_admin()
  or (scope = 'business' and public.owns_business(business_id))
)
with check (
  public.is_admin()
  or (scope = 'business' and public.owns_business(business_id))
);

-- Notifications
create policy "notifications own" on public.notifications
for select using (user_id = auth.uid() or public.is_admin() or (business_id is not null and (public.owns_business(business_id) or public.is_business_staff(business_id))));

create policy "notifications update own" on public.notifications
for update using (user_id = auth.uid() or public.is_admin());

-- Subscriptions
create policy "subscriptions business read" on public.business_subscriptions
for select using (public.owns_business(business_id) or public.is_business_staff(business_id) or public.is_admin());

create policy "subscriptions owner manage" on public.business_subscriptions
for all using (public.owns_business(business_id) or public.is_admin())
with check (public.owns_business(business_id) or public.is_admin());
