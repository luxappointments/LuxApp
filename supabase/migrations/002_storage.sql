-- Storage buckets
insert into storage.buckets (id, name, public)
values
  ('business-assets', 'business-assets', true),
  ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Business assets public read, owner/staff write
create policy "business assets public read"
on storage.objects for select
using (bucket_id = 'business-assets');

create policy "business assets owner write"
on storage.objects for all
using (
  bucket_id = 'business-assets'
  and exists (
    select 1
    from public.businesses b
    where b.id::text = split_part(name, '/', 1)
      and (public.owns_business(b.id) or public.is_business_staff(b.id) or public.is_admin())
  )
)
with check (
  bucket_id = 'business-assets'
  and exists (
    select 1
    from public.businesses b
    where b.id::text = split_part(name, '/', 1)
      and (public.owns_business(b.id) or public.is_business_staff(b.id) or public.is_admin())
  )
);

-- Payment proofs private: client upload own appointment proof, business/admin read
create policy "payment proof insert authenticated"
on storage.objects for insert
with check (
  bucket_id = 'payment-proofs'
  and auth.uid() is not null
);

create policy "payment proof read restricted"
on storage.objects for select
using (
  bucket_id = 'payment-proofs'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.appointments a
      where a.id::text = split_part(name, '/', 1)
        and (
          a.customer_id = auth.uid()
          or a.client_email = (select email from public.profiles where id = auth.uid())
          or public.owns_business(a.business_id)
          or public.is_business_staff(a.business_id)
        )
    )
  )
);
