-- Diagnóstico push: detalle de dispositivos en lookup de prueba (super_admin)

create or replace function public.lookup_push_test_recipient(p_local_phone text)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_local_digits text;
  v_profile record;
  v_devices int;
  v_device_list json;
  v_full_name text;
begin
  if not public.is_super_admin() then
    raise exception 'FORBIDDEN';
  end if;

  v_local_digits := public.ar_mobile_local_digits(p_local_phone);
  if v_local_digits is null or v_local_digits !~ '^[1-9][0-9]{9}$' then
    return json_build_object('ok', false, 'error', 'INVALID_PHONE');
  end if;

  select p.id, p.nombre, p.apellido, p.email
  into v_profile
  from public.profiles p
  where p.deleted_at is null
    and p.celular is not null
    and public.ar_mobile_local_digits(p.celular) = v_local_digits
  limit 1;

  if v_profile.id is null then
    return json_build_object('ok', false, 'error', 'USER_NOT_FOUND');
  end if;

  select count(*)::int
  into v_devices
  from public.push_subscriptions ps
  where ps.user_id = v_profile.id
    and ps.is_active = true;

  select coalesce(
    json_agg(
      json_build_object(
        'id', ps.id,
        'endpoint_tail', right(ps.endpoint, 40),
        'platform', ps.platform,
        'last_seen_at', ps.last_seen_at,
        'updated_at', ps.updated_at,
        'created_at', ps.created_at
      )
      order by ps.last_seen_at desc
    ),
    '[]'::json
  )
  into v_device_list
  from public.push_subscriptions ps
  where ps.user_id = v_profile.id
    and ps.is_active = true;

  v_full_name := trim(
    coalesce(v_profile.nombre, '') || ' ' || coalesce(v_profile.apellido, '')
  );

  return json_build_object(
    'ok', true,
    'user_id', v_profile.id,
    'full_name', nullif(v_full_name, ''),
    'email', coalesce(v_profile.email, ''),
    'active_devices', v_devices,
    'devices', v_device_list,
    'phone', '+549' || v_local_digits
  );
end;
$$;
