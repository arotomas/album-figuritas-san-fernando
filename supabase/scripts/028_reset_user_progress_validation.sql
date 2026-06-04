-- Validación post-028 (ejecutar en staging como usuario de prueba o con service role + JWT)
--
-- 1) Antes del reset (reemplazar <user_uuid>):
-- select count(*) as user_figures from public.user_figures where user_id = '<user_uuid>';
-- select count(*) as captures from public.captures where user_id = '<user_uuid>';
-- select count(*) as ledger_rows, coalesce(sum(points),0) as ledger_points
--   from public.user_points_ledger where user_id = '<user_uuid>';
-- select public.get_my_points();
--
-- 2) Desde la app: Opciones → Reiniciar progreso
--    o como jugador autenticado: select public.reset_my_progress();
--
-- 3) Después del reset:
-- select count(*) as user_figures from public.user_figures where user_id = '<user_uuid>';
-- select count(*) as captures from public.captures where user_id = '<user_uuid>';
-- select count(*) as ledger_rows, coalesce(sum(points),0) as ledger_points
--   from public.user_points_ledger where user_id = '<user_uuid>';
-- select public.get_my_points();
-- select public.get_player_ranking(20);
--
-- Esperado: counts = 0, get_my_points.total_points = 0, ranking sin puntos previos del usuario.

select jsonb_build_object(
  'function_exists',
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'reset_my_progress'
  )
) as reset_my_progress_check;
