-- Desactivar todas las suscripciones push de un usuario (super_admin, panel de prueba)

create or replace function public.deactivate_all_push_subscriptions_for_user(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_super_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if p_user_id is null then
    return json_build_object('ok', false, 'error', 'INVALID_USER');
  end if;

  update public.push_subscriptions
  set is_active = false, updated_at = now()
  where user_id = p_user_id
    and is_active = true;

  get diagnostics v_count = row_count;

  return json_build_object(
    'ok', true,
    'deactivated_count', v_count,
    'user_id', p_user_id
  );
end;
$$;

revoke all on function public.deactivate_all_push_subscriptions_for_user(uuid) from public;
grant execute on function public.deactivate_all_push_subscriptions_for_user(uuid) to authenticated;
