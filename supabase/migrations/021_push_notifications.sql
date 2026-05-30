-- Push notifications v1: device subscriptions + broadcast audit log

-- ---------------------------------------------------------------------------
-- push_subscriptions
-- ---------------------------------------------------------------------------

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  platform text not null default 'other',
  user_agent text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

create index if not exists push_subscriptions_active_idx
  on public.push_subscriptions (is_active)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- push_notifications (audit — broadcast only, append-only from app)
-- ---------------------------------------------------------------------------

create table if not exists public.push_notifications (
  id uuid primary key default gen_random_uuid(),
  icon_key text not null,
  title text not null,
  body text not null,
  destination text not null check (destination in ('map', 'album', 'home')),
  deep_link text not null,
  sent_by uuid not null references auth.users (id),
  sent_by_username text not null default '',
  recipient_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  status text not null check (status in ('sent', 'partial', 'failed')),
  error_summary text,
  segment_type text,
  segment_filter jsonb,
  scheduled_at timestamptz,
  campaign_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists push_notifications_created_at_idx
  on public.push_notifications (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.push_subscriptions_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row
  execute function public.push_subscriptions_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.push_subscriptions enable row level security;
alter table public.push_notifications enable row level security;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own
  on public.push_subscriptions
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own
  on public.push_subscriptions
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own
  on public.push_subscriptions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own
  on public.push_subscriptions
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists push_notifications_select_super_admin on public.push_notifications;
create policy push_notifications_select_super_admin
  on public.push_notifications
  for select
  to authenticated
  using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- RPC: upsert_push_subscription
-- ---------------------------------------------------------------------------

create or replace function public.upsert_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_platform text default 'other',
  p_user_agent text default null
)
returns public.push_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.push_subscriptions;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  insert into public.push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth,
    platform,
    user_agent,
    is_active,
    last_seen_at
  )
  values (
    auth.uid(),
    p_endpoint,
    p_p256dh,
    p_auth,
    coalesce(nullif(trim(p_platform), ''), 'other'),
    p_user_agent,
    true,
    now()
  )
  on conflict (endpoint) do update
  set
    user_id = auth.uid(),
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    platform = excluded.platform,
    user_agent = excluded.user_agent,
    is_active = true,
    last_seen_at = now(),
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function public.upsert_push_subscription(text, text, text, text, text) from public;
grant execute on function public.upsert_push_subscription(text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: deactivate_push_subscription
-- ---------------------------------------------------------------------------

create or replace function public.deactivate_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  update public.push_subscriptions
  set is_active = false, updated_at = now()
  where endpoint = p_endpoint
    and user_id = auth.uid();
end;
$$;

revoke all on function public.deactivate_push_subscription(text) from public;
grant execute on function public.deactivate_push_subscription(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: get_push_admin_stats (super_admin only)
-- ---------------------------------------------------------------------------

create or replace function public.get_push_admin_stats()
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result json;
begin
  if not public.is_super_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select json_build_object(
    'registered_users',
      (select count(*)::bigint from public.profiles where deleted_at is null),
    'subscribed_users',
      (
        select count(distinct user_id)::bigint
        from public.push_subscriptions
        where is_active = true
      ),
    'subscribed_devices',
      (
        select count(*)::bigint
        from public.push_subscriptions
        where is_active = true
      )
  )
  into result;

  return result;
end;
$$;

revoke all on function public.get_push_admin_stats() from public;
grant execute on function public.get_push_admin_stats() to authenticated;
