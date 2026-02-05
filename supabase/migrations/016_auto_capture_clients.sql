create or replace function public.capture_business_client()
returns trigger
language plpgsql
as $$
begin
  if new.client_email is null or new.client_email = '' then
    return new;
  end if;

  insert into public.business_clients (business_id, email, full_name)
  values (new.business_id, new.client_email, null)
  on conflict (business_id, email) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_capture_business_client on public.appointments;
create trigger trg_capture_business_client
after insert on public.appointments
for each row execute function public.capture_business_client();
