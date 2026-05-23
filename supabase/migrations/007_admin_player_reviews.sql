-- Admin player and capture review fields.

alter table public.profiles
  add column if not exists album_status text not null default 'pending',
  add column if not exists album_reviewed_at timestamptz,
  add column if not exists album_reviewed_by uuid references auth.users (id) on delete set null,
  add column if not exists album_review_note text;

alter table public.profiles
  drop constraint if exists profiles_album_status_valid;

alter table public.profiles
  add constraint profiles_album_status_valid
  check (album_status in ('pending', 'approved', 'rejected'));

alter table public.captures
  add column if not exists validation_status text not null default 'pending',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null,
  add column if not exists review_note text;

alter table public.captures
  drop constraint if exists captures_validation_status_valid;

alter table public.captures
  add constraint captures_validation_status_valid
  check (validation_status in ('pending', 'approved', 'rejected'));

drop policy if exists "profiles_admin_update_reviews" on public.profiles;
create policy "profiles_admin_update_reviews"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "captures_admin_update_reviews" on public.captures;
create policy "captures_admin_update_reviews"
  on public.captures for update
  using (public.is_admin())
  with check (public.is_admin());
