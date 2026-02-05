-- User avatars bucket
insert into storage.buckets (id, name, public)
values ('user-avatars', 'user-avatars', true)
on conflict (id) do nothing;

-- Public read for avatars
drop policy if exists "user avatars public read" on storage.objects;
create policy "user avatars public read"
on storage.objects for select
using (bucket_id = 'user-avatars');

-- User can manage own avatar files under {auth.uid()}/...
drop policy if exists "user avatars own write" on storage.objects;
create policy "user avatars own write"
on storage.objects for all
using (
  bucket_id = 'user-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'user-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);
