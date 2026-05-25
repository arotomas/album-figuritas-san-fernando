-- Rollback manual del backfill de collection_id (016).
-- NO elimina album_collections — solo limpia asignaciones en figures.

begin;

update public.figures
set collection_id = null;

-- Verificar
-- select id, title, collection_id from public.figures order by id;

commit;
