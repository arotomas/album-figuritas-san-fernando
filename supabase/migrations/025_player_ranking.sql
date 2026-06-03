-- 025 — Sistema de puntos y ranking (Fase 1: backend only)
-- Ledger + trigger sobre user_figures (INSERT). Sin UI.
--
-- Puntajes:
--   común = 10 | rara = 25 | épica = 50 | legendaria = 100 | bonus = 150
--
-- Rollback: supabase/scripts/025_player_ranking_rollback.sql
-- Validación staging: supabase/scripts/025_player_ranking_validation.sql

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.resolve_figure_points(p_figure_id text)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when f.is_bonus then 150
    when lower(trim(f.rarity)) in ('legendaria', 'legendary') then 100
    when lower(trim(f.rarity)) in ('épica', 'epica', 'epic') then 50
    when lower(trim(f.rarity)) = 'rara' then 25
    else 10
  end
  from public.figures f
  where f.id = p_figure_id;
$$;

comment on function public.resolve_figure_points(text) is
  'Puntos por figurita según rarity/is_bonus. Fuente única de reglas para unlocks.';

create or replace function public.is_ranking_eligible(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and coalesce(p.profile_completed, false) = true
      and p.username is not null
      and trim(p.username) <> ''
      -- Fase 1 — pruebas internas: incluir user, admin, super_admin y moderator.
      -- Antes del lanzamiento público del ranking, volver a excluir admin, super_admin y moderator:
      -- and coalesce(p.role, 'user') = 'user'
      -- and coalesce(p.is_admin, false) = false
  );
$$;

comment on function public.is_ranking_eligible(uuid) is
  'Ranking: username + perfil completado. Fase 1 incluye staff; reactivar filtros de rol antes del lanzamiento público.';

-- ---------------------------------------------------------------------------
-- Ledger (extensible: collection_bonus, achievement, event_bonus)
-- ---------------------------------------------------------------------------

create table if not exists public.user_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null default 'figure_unlock',
  points integer not null check (points > 0),
  awarded_at timestamptz not null default now(),
  user_figure_id uuid references public.user_figures (id) on delete cascade,
  figure_id text references public.figures (id) on delete restrict,
  reference_key text,
  metadata jsonb not null default '{}'::jsonb,
  constraint user_points_ledger_source_valid check (
    source in ('figure_unlock', 'collection_bonus', 'achievement', 'event_bonus')
  ),
  constraint user_points_ledger_figure_unlock_shape check (
    source <> 'figure_unlock'
    or (user_figure_id is not null and figure_id is not null)
  ),
  constraint user_points_ledger_future_source_reference check (
    source = 'figure_unlock'
    or reference_key is not null
  )
);

comment on table public.user_points_ledger is
  'Ledger de puntos. figure_unlock via trigger; futuras filas: collection_bonus, achievement, event_bonus.';

comment on column public.user_points_ledger.reference_key is
  'Clave estable para premios no-figurita (ej. collection:uuid, achievement:slug, event:id).';

create unique index if not exists user_points_ledger_user_figure_id_unique
  on public.user_points_ledger (user_figure_id)
  where user_figure_id is not null;

create unique index if not exists user_points_ledger_figure_unlock_user_figure_idx
  on public.user_points_ledger (user_id, figure_id)
  where source = 'figure_unlock';

create index if not exists user_points_ledger_user_id_idx
  on public.user_points_ledger (user_id);

create index if not exists user_points_ledger_source_idx
  on public.user_points_ledger (source);

-- ---------------------------------------------------------------------------
-- Trigger: puntos solo en INSERT de user_figures (retake = UPDATE → no puntos)
-- ---------------------------------------------------------------------------

create or replace function public.award_points_on_unlock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer;
begin
  v_points := public.resolve_figure_points(new.figure_id);

  if v_points is null or v_points <= 0 then
    return new;
  end if;

  insert into public.user_points_ledger (
    user_id,
    source,
    points,
    awarded_at,
    user_figure_id,
    figure_id,
    reference_key,
    metadata
  )
  values (
    new.user_id,
    'figure_unlock',
    v_points,
    coalesce(new.captured_at, now()),
    new.id,
    new.figure_id,
    'figure:' || new.figure_id,
    jsonb_build_object('source', coalesce(new.source, 'capture'))
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists user_figures_award_points on public.user_figures;

create trigger user_figures_award_points
  after insert on public.user_figures
  for each row
  execute function public.award_points_on_unlock();

-- ---------------------------------------------------------------------------
-- Backfill histórico (un registro por unlock existente)
-- ---------------------------------------------------------------------------

insert into public.user_points_ledger (
  user_id,
  source,
  points,
  awarded_at,
  user_figure_id,
  figure_id,
  reference_key,
  metadata
)
select
  uf.user_id,
  'figure_unlock',
  public.resolve_figure_points(uf.figure_id),
  uf.captured_at,
  uf.id,
  uf.figure_id,
  'figure:' || uf.figure_id,
  jsonb_build_object('source', coalesce(uf.source, 'capture'), 'backfill', true)
from public.user_figures uf
where public.resolve_figure_points(uf.figure_id) is not null
  and public.resolve_figure_points(uf.figure_id) > 0
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- RLS: sin acceso directo desde cliente (solo trigger + RPC security definer)
-- ---------------------------------------------------------------------------

alter table public.user_points_ledger enable row level security;

revoke all on table public.user_points_ledger from anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC ranking público (solo username + puntos + posición)
-- ---------------------------------------------------------------------------

create or replace function public.get_player_ranking(p_limit integer default 20)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_leaderboard jsonb;
  v_me jsonb;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  p_limit := greatest(1, least(coalesce(p_limit, 20), 50));

  with scores as (
    select
      p.id as user_id,
      trim(p.username) as username,
      coalesce(sum(l.points), 0)::integer as total_points
    from public.profiles p
    left join public.user_points_ledger l on l.user_id = p.id
    where public.is_ranking_eligible(p.id)
    group by p.id, p.username
  ),
  ranked as (
    select
      user_id,
      username,
      total_points,
      rank() over (
        order by total_points desc, lower(username) asc, user_id asc
      ) as rank
    from scores
    where total_points > 0
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rank', rank,
        'username', username,
        'total_points', total_points
      )
      order by rank
    ),
    '[]'::jsonb
  )
  into v_leaderboard
  from ranked
  where rank <= p_limit;

  with scores as (
    select
      p.id as user_id,
      trim(p.username) as username,
      coalesce(sum(l.points), 0)::integer as total_points
    from public.profiles p
    left join public.user_points_ledger l on l.user_id = p.id
    where public.is_ranking_eligible(p.id)
    group by p.id, p.username
  ),
  ranked as (
    select
      user_id,
      username,
      total_points,
      rank() over (
        order by total_points desc, lower(username) asc, user_id asc
      ) as rank
    from scores
    where total_points > 0
  )
  select jsonb_build_object(
    'rank', rank,
    'username', username,
    'total_points', total_points
  )
  into v_me
  from ranked
  where user_id = v_uid;

  return jsonb_build_object(
    'leaderboard', v_leaderboard,
    'me', coalesce(
      v_me,
      jsonb_build_object('rank', null, 'username', null, 'total_points', 0)
    )
  );
end;
$$;

comment on function public.get_player_ranking(integer) is
  'Top N + posición del usuario autenticado. Solo username y puntos. Sin PII.';

revoke all on function public.get_player_ranking(integer) from public;
grant execute on function public.get_player_ranking(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Auditoría de consistencia (solo staff — staging/ops)
-- ---------------------------------------------------------------------------

create or replace function public.audit_player_points_consistency()
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
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  with unlock_stats as (
    select count(*)::bigint as unlock_count from public.user_figures
  ),
  ledger_stats as (
    select count(*)::bigint as ledger_figure_unlock_count
    from public.user_points_ledger
    where source = 'figure_unlock'
  ),
  missing_ledger as (
    select count(*)::bigint as missing_count
    from public.user_figures uf
    where not exists (
      select 1
      from public.user_points_ledger l
      where l.user_figure_id = uf.id
        and l.source = 'figure_unlock'
    )
  ),
  orphan_ledger as (
    select count(*)::bigint as orphan_count
    from public.user_points_ledger l
    where l.source = 'figure_unlock'
      and l.user_figure_id is not null
      and not exists (
        select 1 from public.user_figures uf where uf.id = l.user_figure_id
      )
  ),
  wrong_points as (
    select count(*)::bigint as mismatch_count
    from public.user_points_ledger l
    where l.source = 'figure_unlock'
      and l.points <> public.resolve_figure_points(l.figure_id)
  ),
  duplicate_figure_unlock as (
    select count(*)::bigint as dup_count
    from (
      select user_id, figure_id
      from public.user_points_ledger
      where source = 'figure_unlock'
      group by user_id, figure_id
      having count(*) > 1
    ) d
  ),
  total_points as (
    select coalesce(sum(points), 0)::bigint as points_sum
    from public.user_points_ledger
    where source = 'figure_unlock'
  ),
  top_users as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'user_id', s.user_id,
          'username', s.username,
          'total_points', s.total_points,
          'unlock_count', s.unlock_count
        )
        order by s.total_points desc
      ),
      '[]'::jsonb
    ) as payload
    from (
      select
        p.id as user_id,
        trim(p.username) as username,
        sum(l.points)::integer as total_points,
        count(l.id)::integer as unlock_count
      from public.user_points_ledger l
      join public.profiles p on p.id = l.user_id
      where l.source = 'figure_unlock'
        and public.is_ranking_eligible(p.id)
      group by p.id, p.username
      order by total_points desc
      limit 10
    ) s
  ),
  unlocks_no_username as (
    select count(distinct uf.user_id)::bigint as user_count
    from public.user_figures uf
    join public.profiles p on p.id = uf.user_id
    where not public.is_ranking_eligible(p.id)
  ),
  points_ineligible as (
    select coalesce(sum(l.points), 0)::bigint as points_sum
    from public.user_points_ledger l
    join public.profiles p on p.id = l.user_id
    where l.source = 'figure_unlock'
      and not public.is_ranking_eligible(p.id)
  )
  select jsonb_build_object(
    'unlock_count', (select unlock_count from unlock_stats),
    'ledger_figure_unlock_count', (select ledger_figure_unlock_count from ledger_stats),
    'missing_ledger_rows', (select missing_count from missing_ledger),
    'orphan_ledger_rows', (select orphan_count from orphan_ledger),
    'points_mismatch_rows', (select mismatch_count from wrong_points),
    'duplicate_figure_unlock_rows', (select dup_count from duplicate_figure_unlock),
    'total_figure_unlock_points', (select points_sum from total_points),
    'top_ranking_eligible_users', (select payload from top_users),
    'users_with_unlocks_not_ranking_eligible', (select user_count from unlocks_no_username),
    'points_held_by_ineligible_profiles', (select points_sum from points_ineligible),
    'checked_at', now()
  )
  into v_result;

  return v_result;
end;
$$;

comment on function public.audit_player_points_consistency() is
  'Diagnóstico staging/prod. Solo moderator/admin. No exponer a jugadores.';

revoke all on function public.audit_player_points_consistency() from public;
grant execute on function public.audit_player_points_consistency() to authenticated;
