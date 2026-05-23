-- Real user profiles: identity fields, completion gate, username uniqueness.

alter table public.profiles
  add column if not exists nombre text,
  add column if not exists apellido text,
  add column if not exists dni text,
  add column if not exists email text,
  add column if not exists celular text,
  add column if not exists auth_provider text default 'anonymous',
  add column if not exists profile_completed boolean not null default false,
  add column if not exists last_login_at timestamptz,
  add column if not exists updated_at timestamptz default now();

update public.profiles
set auth_provider = coalesce(nullif(trim(auth_provider), ''), 'anonymous')
where auth_provider is null or trim(auth_provider) = '';

-- Legacy anonymous signups may share the same username (e.g. "arotomas").
-- Keep the oldest profile per username; suffix the rest so the unique index can be created.
with ranked as (
  select
    id,
    row_number() over (
      partition by lower(trim(username))
      order by created_at asc nulls last, id asc
    ) as rn
  from public.profiles
  where username is not null and trim(username) <> ''
)
update public.profiles p
set username = trim(p.username) || '_' || left(replace(p.id::text, '-', ''), 6)
from ranked r
where p.id = r.id
  and r.rn > 1;

drop index if exists public.profiles_username_unique_idx;

create unique index profiles_username_unique_idx
  on public.profiles (lower(trim(username)))
  where username is not null and trim(username) <> '';

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

create or replace function public.is_username_available(candidate text, for_user_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case
    when candidate is null or trim(candidate) = '' then false
    else not exists (
      select 1
      from public.profiles p
      where lower(trim(p.username)) = lower(trim(candidate))
        and (for_user_id is null or p.id <> for_user_id)
    )
  end;
$$;

grant execute on function public.is_username_available(text, uuid) to authenticated;
grant execute on function public.is_username_available(text, uuid) to anon;
