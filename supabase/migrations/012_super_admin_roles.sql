-- Role-based admin access: user, moderator, admin, super_admin.

alter table public.profiles
  add column if not exists role text;

update public.profiles
set role = case
  when is_admin = true then 'admin'
  else 'user'
end
where role is null;

alter table public.profiles
  alter column role set default 'user';

update public.profiles
set role = 'user'
where role is null;

alter table public.profiles
  alter column role set not null;

alter table public.profiles
  drop constraint if exists profiles_role_valid;

alter table public.profiles
  add constraint profiles_role_valid
  check (role in ('user', 'moderator', 'admin', 'super_admin'));

update public.profiles
set is_admin = true
where role in ('admin', 'super_admin');

update public.profiles
set is_admin = false
where role in ('user', 'moderator');

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select p.role = 'super_admin'
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    false
  );
$$;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select
        case
          when p.role is not null then p.role in ('moderator', 'admin', 'super_admin')
          else p.is_admin
        end
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select
        case
          when p.role is not null then p.role in ('admin', 'super_admin')
          else p.is_admin
        end
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    false
  );
$$;

grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_moderator_or_admin() to authenticated;
grant execute on function public.is_admin() to authenticated;

create or replace function public.enforce_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_super_admin() then
      new.role := 'user';
      new.is_admin := false;
    end if;
  elsif tg_op = 'UPDATE' then
    if not public.is_super_admin() then
      new.role := old.role;
      new.is_admin := old.is_admin;
    elsif auth.uid() = old.id then
      new.role := old.role;
      new.is_admin := old.is_admin;
    else
      new.is_admin := new.role in ('admin', 'super_admin');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_privileges on public.profiles;
create trigger profiles_enforce_privileges
  before insert or update on public.profiles
  for each row
  execute function public.enforce_profile_privileges();

drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all"
  on public.profiles for select
  using (public.is_moderator_or_admin());

drop policy if exists "profiles_admin_update_reviews" on public.profiles;
create policy "profiles_admin_update_reviews"
  on public.profiles for update
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

drop policy if exists "captures_admin_select_all" on public.captures;
create policy "captures_admin_select_all"
  on public.captures for select
  using (public.is_moderator_or_admin());

drop policy if exists "captures_admin_update_reviews" on public.captures;
create policy "captures_admin_update_reviews"
  on public.captures for update
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

create or replace function public.super_admin_update_user_role(
  target_user_id uuid,
  new_role text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.profiles;
begin
  if not public.is_super_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'CANNOT_CHANGE_OWN_ROLE';
  end if;

  if new_role not in ('user', 'moderator', 'admin', 'super_admin') then
    raise exception 'INVALID_ROLE';
  end if;

  update public.profiles
  set
    role = new_role,
    is_admin = new_role in ('admin', 'super_admin')
  where id = target_user_id
  returning * into updated;

  if updated.id is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  return updated;
end;
$$;

create or replace function public.super_admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
  super_admin_count integer;
begin
  if not public.is_super_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'CANNOT_DELETE_SELF';
  end if;

  select p.role
  into target_role
  from public.profiles p
  where p.id = target_user_id;

  if target_role is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  if target_role = 'super_admin' then
    select count(*)
    into super_admin_count
    from public.profiles
    where role = 'super_admin';

    if super_admin_count <= 1 then
      raise exception 'CANNOT_DELETE_LAST_SUPER_ADMIN';
    end if;
  end if;

  delete from auth.users where id = target_user_id;
end;
$$;

grant execute on function public.super_admin_update_user_role(uuid, text) to authenticated;
grant execute on function public.super_admin_delete_user(uuid) to authenticated;

-- Manual promotion (run in Supabase SQL Editor after migration):
-- update public.profiles
-- set role = 'super_admin', is_admin = true
-- where username = 'arotomas';
