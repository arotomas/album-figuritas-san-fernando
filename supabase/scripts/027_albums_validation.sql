-- Validación post-027 (staging/prod) — álbumes múltiples base
-- Ejecutar tras supabase/migrations/027_albums_and_album_figures.sql

-- =============================================================================
-- 1) Álbum default publicado
-- =============================================================================
select
  'default_album_ok' as check_name,
  count(*)::bigint as passing_rows
from public.albums
where id = 'san-fernando'
  and slug = 'san-fernando'
  and status = 'published'
  and active = true
  and is_default = true;

-- =============================================================================
-- 2) Todas las figuritas asignadas al álbum default
-- =============================================================================
select
  'figures_missing_from_default_album' as check_name,
  count(*)::bigint as failing_rows
from public.figures f
where not exists (
  select 1
  from public.album_figures af
  where af.album_id = 'san-fernando'
    and af.figure_id = f.id
);

-- =============================================================================
-- 3) Figuritas activas huérfanas (sin membresía activa en ningún álbum publicado)
-- =============================================================================
select
  'active_figures_orphan' as check_name,
  count(*)::bigint as failing_rows
from public.figures f
where f.active = true
  and not exists (
    select 1
    from public.album_figures af
    join public.albums a on a.id = af.album_id
    where af.figure_id = f.id
      and af.active_in_album = true
      and a.status = 'published'
      and a.active = true
  );

-- =============================================================================
-- 4) album_collections con album_id
-- =============================================================================
select
  'album_collections_missing_album_id' as check_name,
  count(*)::bigint as failing_rows
from public.album_collections
where album_id is null;

-- =============================================================================
-- 5) Paridad counts
-- =============================================================================
select
  (select count(*) from public.figures) as total_figures,
  (select count(*) from public.album_figures where album_id = 'san-fernando') as default_album_figure_rows,
  (select count(*) from public.user_figures) as total_user_figures,
  (select count(*) from public.user_points_ledger where source = 'figure_unlock') as ledger_unlock_rows,
  (select coalesce(sum(points), 0) from public.user_points_ledger where source = 'figure_unlock') as ledger_unlock_points;

-- =============================================================================
-- 6) Integridad puntos (debe seguir en 0)
-- =============================================================================
select
  'missing_ledger_for_unlock' as check_name,
  count(*)::bigint as failing_rows
from public.user_figures uf
where not exists (
  select 1
  from public.user_points_ledger l
  where l.user_figure_id = uf.id
    and l.source = 'figure_unlock'
);

select
  'orphan_ledger_rows' as check_name,
  count(*)::bigint as failing_rows
from public.user_points_ledger l
where l.source = 'figure_unlock'
  and l.user_figure_id is not null
  and not exists (
    select 1 from public.user_figures uf where uf.id = l.user_figure_id
  );

select
  'points_mismatch' as check_name,
  count(*)::bigint as failing_rows
from public.user_points_ledger l
where l.source = 'figure_unlock'
  and l.points <> public.resolve_figure_points(l.figure_id);

select
  'duplicate_figure_unlock' as check_name,
  count(*)::bigint as failing_rows
from (
  select user_id, figure_id
  from public.user_points_ledger
  where source = 'figure_unlock'
  group by user_id, figure_id
  having count(*) > 1
) d;

-- =============================================================================
-- 7) RPC ranking / puntos existen
-- =============================================================================
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in ('get_player_ranking', 'get_my_points', 'resolve_figure_points')
order by proname;
