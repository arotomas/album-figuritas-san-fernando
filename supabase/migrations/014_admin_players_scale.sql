-- Admin players at scale: soft delete, server-side list/metrics/map RPCs.

alter table public.profiles
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users (id) on delete set null;

create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at)
  where deleted_at is null;

create index if not exists profiles_last_login_at_idx
  on public.profiles (last_login_at desc nulls last);

create index if not exists profiles_album_status_idx
  on public.profiles (album_status);

create index if not exists profiles_role_idx
  on public.profiles (role);

-- ---------------------------------------------------------------------------
-- Soft delete (replaces hard auth.users delete)
-- ---------------------------------------------------------------------------
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
  where p.id = target_user_id
    and p.deleted_at is null;

  if target_role is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  if target_role = 'super_admin' then
    select count(*)
    into super_admin_count
    from public.profiles
    where role = 'super_admin'
      and deleted_at is null;

    if super_admin_count <= 1 then
      raise exception 'CANNOT_DELETE_LAST_SUPER_ADMIN';
    end if;
  end if;

  update public.profiles
  set
    deleted_at = now(),
    deleted_by = auth.uid()
  where id = target_user_id;
end;
$$;

revoke all on function public.super_admin_delete_user(uuid) from public;
grant execute on function public.super_admin_delete_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Shared CTE builder for admin player stats (used by list + metrics)
-- ---------------------------------------------------------------------------
create or replace function public.admin_player_stats_base()
returns table (
  id uuid,
  username text,
  avatar_url text,
  role text,
  is_admin boolean,
  created_at timestamptz,
  album_status text,
  album_reviewed_at timestamptz,
  album_reviewed_by uuid,
  album_review_note text,
  nombre text,
  apellido text,
  dni text,
  email text,
  celular text,
  auth_provider text,
  profile_completed boolean,
  last_login_at timestamptz,
  updated_at timestamptz,
  direccion_texto text,
  direccion_lat double precision,
  direccion_lng double precision,
  localidad text,
  provincia text,
  pais text,
  codigo_postal text,
  deleted_at timestamptz,
  main_obtained integer,
  main_total integer,
  bonus_obtained integer,
  total_captures integer,
  last_capture_at timestamptz,
  last_activity_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  with main_figures as (
    select f.id
    from public.figures f
    where coalesce(f.is_bonus, false) = false
      and lower(trim(f.rarity)) in ('común', 'comun', 'rara')
    order by coalesce(nullif(f.unlock_order, 0), 2147483647), f.id
    limit 10
  ),
  main_total_cte as (
    select count(*)::int as cnt from main_figures
  ),
  bonus_figures as (
    select f.id
    from public.figures f
    where coalesce(f.is_bonus, false) = true
       or lower(trim(f.rarity)) in ('épica', 'epica', 'legendaria')
  )
  select
    p.id,
    p.username,
    p.avatar_url,
    coalesce(p.role, case when p.is_admin then 'admin' else 'user' end) as role,
    p.is_admin,
    p.created_at,
    coalesce(p.album_status, 'pending') as album_status,
    p.album_reviewed_at,
    p.album_reviewed_by,
    p.album_review_note,
    p.nombre,
    p.apellido,
    p.dni,
    p.email,
    p.celular,
    p.auth_provider,
    p.profile_completed,
    p.last_login_at,
    p.updated_at,
    p.direccion_texto,
    p.direccion_lat,
    p.direccion_lng,
    p.localidad,
    p.provincia,
    p.pais,
    p.codigo_postal,
    p.deleted_at,
    coalesce(uf_main.cnt, 0) as main_obtained,
    mt.cnt as main_total,
    coalesce(uf_bonus.cnt, 0) as bonus_obtained,
    coalesce(cap_stats.total_captures, 0) as total_captures,
    cap_stats.last_capture_at,
    greatest(
      coalesce(p.last_login_at, 'epoch'::timestamptz),
      coalesce(cap_stats.last_capture_at, 'epoch'::timestamptz),
      p.created_at
    ) as last_activity_at
  from public.profiles p
  cross join main_total_cte mt
  left join lateral (
    select count(*)::int as cnt
    from public.user_figures uf
    inner join main_figures mf on mf.id = uf.figure_id
    where uf.user_id = p.id
  ) uf_main on true
  left join lateral (
    select count(*)::int as cnt
    from public.user_figures uf
    inner join bonus_figures bf on bf.id = uf.figure_id
    where uf.user_id = p.id
  ) uf_bonus on true
  left join lateral (
    select
      count(*)::int as total_captures,
      max(c.created_at) as last_capture_at
    from public.captures c
    where c.user_id = p.id
  ) cap_stats on true
  where p.deleted_at is null;
$$;

revoke all on function public.admin_player_stats_base() from public;
grant execute on function public.admin_player_stats_base() to authenticated;

-- ---------------------------------------------------------------------------
-- Paginated player list
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_players(
  p_query text default '',
  p_username text default '',
  p_email text default '',
  p_dni text default '',
  p_localidad text default '',
  p_album_status text default 'all',
  p_role text default 'all',
  p_progress text default 'all',
  p_quick_tab text default 'all',
  p_limit int default 25,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_result jsonb;
  v_total bigint;
  v_players jsonb;
begin
  if not public.is_moderator_or_admin() then
    raise exception 'FORBIDDEN';
  end if;

  p_limit := greatest(1, least(coalesce(p_limit, 25), 100));
  p_offset := greatest(coalesce(p_offset, 0), 0);

  with filtered as (
    select s.*
    from public.admin_player_stats_base() s
    where
      (coalesce(p_query, '') = '' or (
        coalesce(s.username, '') ilike '%' || p_query || '%'
        or coalesce(s.nombre, '') ilike '%' || p_query || '%'
        or coalesce(s.apellido, '') ilike '%' || p_query || '%'
        or coalesce(s.email, '') ilike '%' || p_query || '%'
        or coalesce(s.dni, '') ilike '%' || p_query || '%'
        or coalesce(s.localidad, '') ilike '%' || p_query || '%'
        or trim(coalesce(s.nombre, '') || ' ' || coalesce(s.apellido, '')) ilike '%' || p_query || '%'
      ))
      and (coalesce(p_username, '') = '' or coalesce(s.username, '') ilike '%' || p_username || '%')
      and (coalesce(p_email, '') = '' or coalesce(s.email, '') ilike '%' || p_email || '%')
      and (coalesce(p_dni, '') = '' or coalesce(s.dni, '') ilike '%' || p_dni || '%')
      and (coalesce(p_localidad, '') = '' or coalesce(s.localidad, '') ilike '%' || p_localidad || '%')
      and (coalesce(p_album_status, 'all') = 'all' or s.album_status = p_album_status)
      and (
        coalesce(p_role, 'all') = 'all'
        or s.role = p_role
      )
      and (
        coalesce(p_progress, 'all') = 'all'
        or (p_progress = 'complete' and s.main_total > 0 and s.main_obtained >= s.main_total)
        or (p_progress = 'incomplete' and (s.main_total = 0 or s.main_obtained < s.main_total))
      )
      and (
        coalesce(p_quick_tab, 'all') = 'all'
        or (p_quick_tab = 'active' and s.last_activity_at >= now() - interval '30 days')
        or (p_quick_tab = 'blocked' and s.album_status = 'rejected')
        or (p_quick_tab = 'admins' and s.role in ('moderator', 'admin', 'super_admin'))
        or (p_quick_tab = 'new' and s.created_at >= now() - interval '7 days')
        or (
          p_quick_tab = 'suspicious'
          and (
            s.album_status = 'rejected'
            or (s.total_captures >= 3 and s.main_obtained = 0)
          )
        )
      )
  ),
  paged as (
    select *
    from filtered
    order by last_activity_at desc nulls last, created_at desc
    limit p_limit
    offset p_offset
  )
  select
    (select count(*) from filtered),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'username', p.username,
            'avatar_url', p.avatar_url,
            'role', p.role,
            'created_at', p.created_at,
            'album_status', p.album_status,
            'nombre', p.nombre,
            'apellido', p.apellido,
            'dni', p.dni,
            'email', p.email,
            'localidad', p.localidad,
            'last_login_at', p.last_login_at,
            'direccion_lat', p.direccion_lat,
            'direccion_lng', p.direccion_lng,
            'mainProgress', jsonb_build_object('obtained', p.main_obtained, 'total', p.main_total),
            'bonusObtained', p.bonus_obtained,
            'totalCaptures', p.total_captures,
            'lastActivity', p.last_activity_at,
            'lastCaptureAt', p.last_capture_at
          )
        )
        from paged p
      ),
      '[]'::jsonb
    )
  into v_total, v_players;

  v_result := jsonb_build_object(
    'players', coalesce(v_players, '[]'::jsonb),
    'total', coalesce(v_total, 0)
  );

  return v_result;
end;
$$;

revoke all on function public.admin_list_players(text, text, text, text, text, text, text, text, text, int, int) from public;
grant execute on function public.admin_list_players(text, text, text, text, text, text, text, text, text, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Dashboard metrics (lightweight aggregate)
-- ---------------------------------------------------------------------------
create or replace function public.admin_player_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_result jsonb;
begin
  if not public.is_moderator_or_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select jsonb_build_object(
    'total', count(*),
    'active', count(*) filter (where s.last_activity_at >= now() - interval '30 days'),
    'blocked', count(*) filter (where s.album_status = 'rejected'),
    'admins', count(*) filter (where s.role in ('moderator', 'admin', 'super_admin')),
    'withFigures', count(*) filter (where s.main_obtained > 0)
  )
  into v_result
  from public.admin_player_stats_base() s;

  return coalesce(v_result, '{"total":0,"active":0,"blocked":0,"admins":0,"withFigures":0}'::jsonb);
end;
$$;

revoke all on function public.admin_player_metrics() from public;
grant execute on function public.admin_player_metrics() to authenticated;

-- ---------------------------------------------------------------------------
-- Map markers (minimal payload, load on demand)
-- ---------------------------------------------------------------------------
create or replace function public.admin_player_map_markers()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_moderator_or_admin() then
    raise exception 'FORBIDDEN';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'username', s.username,
          'localidad', s.localidad,
          'direccion_lat', s.direccion_lat,
          'direccion_lng', s.direccion_lng
        )
      )
      from public.admin_player_stats_base() s
      where s.direccion_lat is not null
        and s.direccion_lng is not null
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.admin_player_map_markers() from public;
grant execute on function public.admin_player_map_markers() to authenticated;
