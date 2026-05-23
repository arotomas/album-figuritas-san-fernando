-- Admin CRUD support for figures.

alter table public.figures
  add column if not exists capture_radius integer not null default 250;

alter table public.figures
  drop constraint if exists figures_capture_radius_positive;

alter table public.figures
  add constraint figures_capture_radius_positive
  check (capture_radius > 0);

drop policy if exists "figures_admin_insert" on public.figures;
create policy "figures_admin_insert"
  on public.figures for insert
  with check (public.is_admin());

drop policy if exists "figures_admin_delete" on public.figures;
create policy "figures_admin_delete"
  on public.figures for delete
  using (public.is_admin());
