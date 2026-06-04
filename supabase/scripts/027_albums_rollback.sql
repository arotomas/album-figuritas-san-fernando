-- Rollback 027 — SOLO staging si no hay segundo álbum ni datos dependientes
-- ADVERTENCIA: borra albums/album_figures; revierte album_collections.album_id

-- 1) Restaurar policy album_collections anterior
drop policy if exists "album_collections_public_read" on public.album_collections;
create policy "album_collections_public_read"
  on public.album_collections for select
  using (active = true);

-- 2) Quitar album_id de colecciones
alter table public.album_collections
  drop constraint if exists album_collections_album_id_fkey;

drop index if exists album_collections_album_slug_unique;
drop index if exists album_collections_album_id_idx;

alter table public.album_collections
  drop column if exists album_id;

-- 3) Eliminar tablas nuevas (orden por FK)
drop trigger if exists album_figures_set_updated_at on public.album_figures;
drop trigger if exists albums_set_updated_at on public.albums;

drop table if exists public.album_figures;
drop table if exists public.albums;

-- set_updated_at_timestamp puede quedar si otras tablas la usan en el futuro;
-- no se elimina por si se reutiliza.

-- 4) Verificación rápida
select
  to_regclass('public.albums') as albums_gone,
  to_regclass('public.album_figures') as album_figures_gone,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'album_collections'
      and column_name = 'album_id'
  ) as album_collections_has_album_id;
