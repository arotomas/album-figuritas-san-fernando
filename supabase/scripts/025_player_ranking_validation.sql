-- Validación manual — Fase 1 puntos y ranking (ejecutar en STAGING tras 025)
-- Requiere rol con acceso a tablas o usar audit_player_points_consistency() como admin.

-- =============================================================================
-- 0) Resumen rápido vía RPC (como usuario moderator/admin autenticado)
-- =============================================================================
-- select public.audit_player_points_consistency();

-- =============================================================================
-- 1) Un ledger por unlock (debe ser 0 filas)
-- =============================================================================
select
  'missing_ledger_for_unlock' as check_name,
  count(*) as failing_rows
from public.user_figures uf
where not exists (
  select 1
  from public.user_points_ledger l
  where l.user_figure_id = uf.id
    and l.source = 'figure_unlock'
);

-- =============================================================================
-- 2) Sin ledger huérfano (debe ser 0)
-- =============================================================================
select
  'orphan_ledger_rows' as check_name,
  count(*) as failing_rows
from public.user_points_ledger l
where l.source = 'figure_unlock'
  and l.user_figure_id is not null
  and not exists (
    select 1 from public.user_figures uf where uf.id = l.user_figure_id
  );

-- =============================================================================
-- 3) Puntos coherentes con resolve_figure_points (debe ser 0)
-- =============================================================================
select
  'points_mismatch' as check_name,
  count(*) as failing_rows
from public.user_points_ledger l
where l.source = 'figure_unlock'
  and l.points <> public.resolve_figure_points(l.figure_id);

-- =============================================================================
-- 4) Sin duplicados user_id + figure_id en figure_unlock (debe ser 0)
-- =============================================================================
select
  'duplicate_figure_unlock' as check_name,
  count(*) as failing_groups
from (
  select user_id, figure_id
  from public.user_points_ledger
  where source = 'figure_unlock'
  group by user_id, figure_id
  having count(*) > 1
) d;

-- =============================================================================
-- 5) Totales globales
-- =============================================================================
select
  (select count(*) from public.user_figures) as total_unlocks,
  (select count(*) from public.user_points_ledger where source = 'figure_unlock') as total_ledger_rows,
  (select coalesce(sum(points), 0) from public.user_points_ledger where source = 'figure_unlock') as total_points;

-- =============================================================================
-- 6) Top 10 elegibles para ranking (username + puntos)
-- =============================================================================
select
  trim(p.username) as username,
  sum(l.points)::integer as total_points,
  count(l.id)::integer as unlock_count
from public.user_points_ledger l
join public.profiles p on p.id = l.user_id
where l.source = 'figure_unlock'
  and public.is_ranking_eligible(p.id)
group by p.id, p.username
order by total_points desc, lower(trim(p.username)) asc
limit 10;

-- =============================================================================
-- 7) Usuarios con unlocks pero sin username / perfil incompleto / staff
-- =============================================================================
select
  p.id as user_id,
  coalesce(trim(p.username), '(sin username)') as username,
  coalesce(p.profile_completed, false) as profile_completed,
  coalesce(p.role, 'user') as role,
  coalesce(p.is_admin, false) as is_admin,
  count(uf.id)::integer as unlock_count,
  coalesce(sum(l.points), 0)::integer as points_held
from public.user_figures uf
join public.profiles p on p.id = uf.user_id
left join public.user_points_ledger l
  on l.user_figure_id = uf.id
 and l.source = 'figure_unlock'
where not public.is_ranking_eligible(p.id)
group by p.id, p.username, p.profile_completed, p.role, p.is_admin
order by points_held desc, unlock_count desc
limit 25;

-- =============================================================================
-- 8) Prueba manual retake (NO ejecutar en prod sin usuario de prueba)
-- =============================================================================
-- a) Elegir un user_figure existente:
--    select id, user_id, figure_id, captured_at from public.user_figures limit 1;
-- b) Contar ledger antes:
--    select count(*) from public.user_points_ledger where user_figure_id = '<uuid>';
-- c) Simular retake (UPDATE — no debe cambiar ledger):
--    update public.user_figures set photo_url = photo_url where id = '<uuid>';
-- d) Contar ledger después (debe ser igual):
--    select count(*) from public.user_points_ledger where user_figure_id = '<uuid>';

-- =============================================================================
-- 9) Prueba manual unlock nuevo (usuario de prueba en staging)
-- =============================================================================
-- a) insert into public.user_figures (user_id, figure_id, captured_at, source)
--    values ('<user_uuid>', '<figure_id>', now(), 'capture')
--    on conflict (user_id, figure_id) do nothing;
-- b) Verificar 1 fila nueva en user_points_ledger con points = resolve_figure_points('<figure_id>');

-- =============================================================================
-- 10) Prueba reset (DELETE user_figures — cascade ledger)
-- =============================================================================
-- a) Guardar counts antes para un user_id de prueba
-- b) delete from public.user_figures where user_id = '<test_user_uuid>';
-- c) Verificar user_points_ledger vacío para ese user_id

-- =============================================================================
-- 11) RPC ranking (como jugador autenticado en SQL editor con JWT o desde app)
-- =============================================================================
-- select public.get_player_ranking(20);
