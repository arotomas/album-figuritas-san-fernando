-- Permite a cada usuario borrar su propio progreso (reset desde la app).

drop policy if exists "user_figures_delete_own" on public.user_figures;
create policy "user_figures_delete_own"
  on public.user_figures for delete
  using (auth.uid() = user_id);

drop policy if exists "captures_delete_own" on public.captures;
create policy "captures_delete_own"
  on public.captures for delete
  using (auth.uid() = user_id);

drop policy if exists "captures_auth_delete_own" on storage.objects;
create policy "captures_auth_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
