-- Fix super_admin bootstrap: the privilege trigger was reverting manual role updates
-- because is_super_admin() is false before the first super_admin exists.
--
-- Adds a SECURITY DEFINER bootstrap function and a bypass flag for trusted RPC/SQL paths.

-- ---------------------------------------------------------------------------
-- Ensure role column + constraint exist (safe if 012 already ran)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Role helper functions (idempotent refresh)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Privilege trigger — only block client/API privilege changes
-- Trusted paths set: app.allow_profile_privilege_change = on
-- ---------------------------------------------------------------------------

create or replace function public.enforce_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('app.allow_profile_privilege_change', true), '') = 'on' then
    if tg_op = 'INSERT' then
      if new.role is null then
        new.role := 'user';
      end if;
      new.is_admin := new.role in ('admin', 'super_admin');
    elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
      new.is_admin := new.role in ('admin', 'super_admin');
    end if;

    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'user';
    new.is_admin := false;
  elsif tg_op = 'UPDATE' then
    if auth.uid() = old.id then
      new.role := old.role;
      new.is_admin := old.is_admin;
    elsif not public.is_super_admin() then
      new.role := old.role;
      new.is_admin := old.is_admin;
    elsif new.role is distinct from old.role then
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

-- ---------------------------------------------------------------------------
-- Bootstrap first super_admin (SQL Editor / service role only)
-- ---------------------------------------------------------------------------

create or replace function public.bootstrap_first_super_admin(target_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.profiles;
  existing_super_admin_count integer;
begin
  if target_user_id is null then
    raise exception 'MISSING_TARGET_USER_ID';
  end if;

  select count(*)
  into existing_super_admin_count
  from public.profiles
  where role = 'super_admin';

  if existing_super_admin_count > 0 then
    raise exception 'SUPER_ADMIN_ALREADY_EXISTS';
  end if;

  perform set_config('app.allow_profile_privilege_change', 'on', true);

  update public.profiles
  set
    role = 'super_admin',
    is_admin = true
  where id = target_user_id
  returning * into updated;

  perform set_config('app.allow_profile_privilege_change', 'off', true);

  if updated.id is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  return updated;
end;
$$;

revoke all on function public.bootstrap_first_super_admin(uuid) from public;
grant execute on function public.bootstrap_first_super_admin(uuid) to postgres;
grant execute on function public.bootstrap_first_super_admin(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Super admin RPCs — use bypass so trigger never reverts trusted updates
-- ---------------------------------------------------------------------------

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

  perform set_config('app.allow_profile_privilege_change', 'on', true);

  update public.profiles
  set
    role = new_role,
    is_admin = new_role in ('admin', 'super_admin')
  where id = target_user_id
  returning * into updated;

  perform set_config('app.allow_profile_privilege_change', 'off', true);

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

revoke all on function public.super_admin_update_user_role(uuid, text) from public;
grant execute on function public.super_admin_update_user_role(uuid, text) to authenticated;

revoke all on function public.super_admin_delete_user(uuid) from public;
grant execute on function public.super_admin_delete_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Audit helper (optional — run in SQL Editor)
-- ---------------------------------------------------------------------------
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'profiles'
--   and column_name in ('role', 'is_admin')
-- order by column_name;
--
-- select tgname, pg_get_triggerdef(oid)
-- from pg_trigger
-- where tgrelid = 'public.profiles'::regclass and not tgisinternal;
--
-- Bootstrap (only when no super_admin exists yet):
-- select public.bootstrap_first_super_admin('752126ea-e0e4-4af4-a6b4-9cd6761f85be');
--
-- Verify:
-- select id, username, role, is_admin
-- from public.profiles
-- where id = '752126ea-e0e4-4af4-a6b4-9cd6761f85be';
