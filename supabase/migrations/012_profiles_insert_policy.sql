create policy "profiles self insert" on public.profiles
for insert
with check (id = auth.uid() or public.is_admin());
