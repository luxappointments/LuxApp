-- LuxApp seed data
insert into public.profiles (id, email, full_name, role)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@luxapp.dev', 'Owner Demo', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'staff@luxapp.dev', 'Staff Demo', 'staff'),
  ('33333333-3333-3333-3333-333333333333', 'client@luxapp.dev', 'Client Demo', 'client'),
  ('99999999-9999-9999-9999-999999999999', 'admin@luxapp.dev', 'Admin Demo', 'admin')
on conflict (id) do nothing;

insert into public.businesses (id, owner_id, slug, name, city, category, description, rating, available_today, priority_rank)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'luxe-nails-miami', 'Luxe Nails Studio', 'Miami', 'Nails', 'Nail artistry premium', 4.9, true, 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'golden-fade-ny', 'Golden Fade Barber', 'New York', 'Barber', 'Cortes y grooming de lujo', 4.8, true, 2)
on conflict (id) do nothing;

insert into public.business_memberships (business_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'staff'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'owner')
on conflict (business_id, user_id) do nothing;

insert into public.staff_profiles (id, business_id, user_id, display_name)
values
  ('aaaaaaaa-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Andrea'),
  ('bbbbbbbb-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'Sofia'),
  ('cccccccc-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', null, 'Marco')
on conflict (id) do nothing;

insert into public.services (id, business_id, name, duration_min, buffer_before_min, buffer_after_min, price_cents, requires_confirmation, requires_payment, sort_order)
values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Gel X Full Set', 120, 10, 10, 14000, true, true, 1),
  ('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Russian Manicure', 90, 10, 5, 9500, true, false, 2),
  ('10000000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Classic Fade', 45, 5, 5, 4500, false, false, 1)
on conflict (id) do nothing;

insert into public.service_staff (service_id, staff_id)
values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-1111-1111-1111-111111111111'),
  ('10000000-0000-0000-0000-000000000001', 'bbbbbbbb-1111-1111-1111-111111111111'),
  ('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-1111-1111-1111-111111111111'),
  ('10000000-0000-0000-0000-000000000003', 'cccccccc-1111-1111-1111-111111111111')
on conflict do nothing;

insert into public.business_policies (business_id, auto_confirm, deposit_mode, base_deposit_percent, min_cancel_minutes, late_cancel_minutes, late_tolerance_minutes, no_show_strike_limit, strike_window_days)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false, 'percent', 30, 360, 120, 10, 2, 90),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true, 'none', 0, 240, 90, 10, 2, 90)
on conflict (business_id) do nothing;

insert into public.business_schedules (business_id, weekday, start_time, end_time, slot_granularity_min)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', w, '09:00', '18:00', 15
from generate_series(1,6) w
on conflict (business_id, weekday) do nothing;

insert into public.business_schedules (business_id, weekday, start_time, end_time, is_closed, slot_granularity_min)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 0, '00:00', '00:00', true, 15)
on conflict (business_id, weekday) do nothing;

insert into public.customer_global_stats (email, risk_score, tier)
values
  ('client@luxapp.dev', 4, 1),
  ('risky@luxapp.dev', 6, 2)
on conflict (email) do nothing;

insert into public.appointments (id, business_id, service_id, staff_id, customer_id, client_email, starts_at, status)
values
  ('d0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'aaaaaaaa-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'client@luxapp.dev', now() + interval '1 day', 'awaiting_payment'),
  ('d0000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '10000000-0000-0000-0000-000000000003', null, '33333333-3333-3333-3333-333333333333', 'client@luxapp.dev', now() + interval '2 day', 'confirmed')
on conflict (id) do nothing;

insert into public.business_subscriptions (business_id, plan, interval, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'gold', 'monthly', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'free', null, 'active')
on conflict (business_id) do nothing;
