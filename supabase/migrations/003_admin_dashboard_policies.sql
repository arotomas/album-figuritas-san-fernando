-- Admin dashboard RLS helpers and policies.
-- No service_role needed in frontend: authenticated users with profiles.is_admin = true
-- can read dashboard data and update figure active state.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select p.is_admin
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- Profiles: admins can read all users.
drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all"
  on public.profiles for select
  using (public.is_admin());

-- Figures: admins can read inactive figures and toggle active state.
drop policy if exists "figures_admin_select_all" on public.figures;
create policy "figures_admin_select_all"
  on public.figures for select
  using (public.is_admin());

drop policy if exists "figures_admin_update" on public.figures;
create policy "figures_admin_update"
  on public.figures for update
  using (public.is_admin())
  with check (public.is_admin());

-- User figures: admins can read all unlocks.
drop policy if exists "user_figures_admin_select_all" on public.user_figures;
create policy "user_figures_admin_select_all"
  on public.user_figures for select
  using (public.is_admin());

-- Captures: admins can read all capture rows.
drop policy if exists "captures_admin_select_all" on public.captures;
create policy "captures_admin_select_all"
  on public.captures for select
  using (public.is_admin());
