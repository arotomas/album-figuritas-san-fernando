-- 026 — RPC liviana para contador de puntos del usuario autenticado
-- Usada por el badge del layout; no reemplaza get_player_ranking().

create or replace function public.get_my_points()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_total integer;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  select coalesce(sum(l.points), 0)::integer
  into v_total
  from public.user_points_ledger l
  where l.user_id = v_uid;

  return jsonb_build_object('total_points', v_total);
end;
$$;

comment on function public.get_my_points() is
  'Puntos totales del usuario autenticado (todo el ledger). Sin PII ni leaderboard.';

revoke all on function public.get_my_points() from public;
grant execute on function public.get_my_points() to authenticated;
