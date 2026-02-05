alter table public.business_policies
  add column if not exists booking_lead_days int not null default 0;

create index if not exists idx_notifications_business_created on public.notifications(business_id, created_at);
