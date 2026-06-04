-- Rollback manual de 028_reset_user_progress.sql

begin;

drop function if exists public.reset_my_progress();

commit;

-- Verificación:
-- select proname from pg_proc where proname = 'reset_my_progress';  -- 0 filas
