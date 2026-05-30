-- Lookup de destinatario de prueba push por celular (super_admin only)

create or replace function public.ar_mobile_local_digits(p_text text)
returns text
language plpgsql
immutable
as $$
declare
  d text;
begin
  d := regexp_replace(coalesce(p_text, ''), '\D', '', 'g');
  if d is null or d = '' then
    return null;
  end if;

  if d like '549%' and length(d) >= 13 then
    return substring(d from 4 for 10);
  end if;

  if d like '54%' and length(d) >= 12 then
    d := substring(d from 3);
    if d like '9%' then
      d := substring(d from 2);
    end if;
    return case when length(d) = 10 then d else null end;
  end if;

  if d like '9%' and length(d) = 11 then
    return substring(d from 2 for 10);
  end if;

  if length(d) = 10 then
    return d;
  end if;

  return null;
end;
$$;

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

  v_full_name := trim(
    coalesce(v_profile.nombre, '') || ' ' || coalesce(v_profile.apellido, '')
  );

  return json_build_object(
    'ok', true,
    'user_id', v_profile.id,
    'full_name', nullif(v_full_name, ''),
    'email', coalesce(v_profile.email, ''),
    'active_devices', v_devices,
    'phone', '+549' || v_local_digits
  );
end;
$$;

revoke all on function public.lookup_push_test_recipient(text) from public;
grant execute on function public.lookup_push_test_recipient(text) to authenticated;
