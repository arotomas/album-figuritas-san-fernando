-- 028 — Reset total de progreso del jugador autenticado (figuritas + capturas + ledger)
-- Rollback: supabase/scripts/028_reset_user_progress_rollback.sql
-- Validación: supabase/scripts/028_reset_user_progress_validation.sql

create or replace function public.reset_my_progress()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ledger_deleted integer := 0;
  v_captures_deleted integer := 0;
  v_figures_deleted integer := 0;
  v_total_after integer := 0;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  -- Ledger primero: incluye figure_unlock y futuros collection_bonus / achievement / event_bonus.
  delete from public.user_points_ledger
  where user_id = v_uid;
  get diagnostics v_ledger_deleted = row_count;

  delete from public.captures
  where user_id = v_uid;
  get diagnostics v_captures_deleted = row_count;

  delete from public.user_figures
  where user_id = v_uid;
  get diagnostics v_figures_deleted = row_count;

  select coalesce(sum(l.points), 0)::integer
  into v_total_after
  from public.user_points_ledger l
  where l.user_id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'deleted_ledger_rows', v_ledger_deleted,
    'deleted_captures', v_captures_deleted,
    'deleted_user_figures', v_figures_deleted,
    'total_points_after', v_total_after
  );
end;
$$;

comment on function public.reset_my_progress() is
  'Borra progreso del usuario autenticado: ledger, captures y user_figures. Storage se limpia desde la app.';

revoke all on function public.reset_my_progress() from public;
grant execute on function public.reset_my_progress() to authenticated;
