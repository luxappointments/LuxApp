create or replace function public.capture_business_client()
returns trigger
language plpgsql
as $$
declare
  profile_name text;
  profile_phone text;
begin
  if new.client_email is null or new.client_email = '' then
    return new;
  end if;

  select p.full_name, p.phone
  into profile_name, profile_phone
  from public.profiles p
  where p.id = new.customer_id
     or p.email = new.client_email
  limit 1;

  insert into public.business_clients (business_id, email, full_name, phone)
  values (new.business_id, new.client_email, profile_name, profile_phone)
  on conflict (business_id, email) do update set
    full_name = coalesce(public.business_clients.full_name, excluded.full_name),
    phone = coalesce(public.business_clients.phone, excluded.phone);

  return new;
end;
$$;
