-- Verificar policies de reset (ejecutar en Supabase SQL Editor)

select schemaname, tablename, policyname, cmd, roles
from pg_policies
where policyname in (
  'user_figures_delete_own',
  'captures_delete_own',
  'captures_auth_delete_own'
)
order by tablename, policyname;

-- Debe devolver 3 filas con cmd = DELETE
