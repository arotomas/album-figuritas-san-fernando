-- Rollback manual de 025_player_ranking.sql
-- Ejecutar solo en STAGING si la Fase 1 debe revertirse por completo.
-- ATENCIÓN: elimina todo el historial de puntos del ledger.

begin;

drop trigger if exists user_figures_award_points on public.user_figures;

drop function if exists public.award_points_on_unlock();

drop function if exists public.audit_player_points_consistency();

drop function if exists public.get_player_ranking(integer);

drop function if exists public.is_ranking_eligible(uuid);

drop table if exists public.user_points_ledger;

drop function if exists public.resolve_figure_points(text);

commit;

-- Verificación post-rollback:
-- select to_regclass('public.user_points_ledger');  -- debe ser null
-- select proname from pg_proc where proname in (
--   'resolve_figure_points',
--   'award_points_on_unlock',
--   'get_player_ranking',
--   'audit_player_points_consistency',
--   'is_ranking_eligible'
-- );  -- debe devolver 0 filas
