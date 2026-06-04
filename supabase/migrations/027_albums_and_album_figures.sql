-- 027 — Álbumes múltiples: albums + album_figures + album_collections.album_id
-- Modelo: figurita canónica en figures; membresía por álbum en album_figures.
-- Progreso global: user_figures (sin cambios). Puntos/ranking: sin cambios.
--
-- Rollback: supabase/scripts/027_albums_rollback.sql
-- Validación: supabase/scripts/027_albums_validation.sql

-- ---------------------------------------------------------------------------
-- 1) albums
-- ---------------------------------------------------------------------------

create table if not exists public.albums (
  id text primary key,
  slug text not null,
  title text not null,
  subtitle text,
  description text,
  cover_image text,
  status text not null default 'draft',
  sort_order integer not null default 100,
  is_default boolean not null default false,
  active boolean not null default true,
  map_center_lat double precision,
  map_center_lng double precision,
  map_zoom integer,
  completion_bonus_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint albums_slug_unique unique (slug),
  constraint albums_status_valid check (
    status in ('draft', 'published', 'archived')
  ),
  constraint albums_completion_bonus_non_negative check (
    completion_bonus_points >= 0
  ),
  constraint albums_map_zoom_range check (
    map_zoom is null or (map_zoom >= 1 and map_zoom <= 22)
  )
);

comment on table public.albums is
  'Producto álbum (libro de figuritas). Varias ediciones/temas pueden compartir figuritas vía album_figures.';

comment on column public.albums.completion_bonus_points is
  'Puntos bonus al completar 100% del álbum (futuro collection_bonus en ledger).';

create unique index if not exists albums_one_default_idx
  on public.albums (is_default)
  where is_default = true;

create index if not exists albums_status_active_sort_idx
  on public.albums (status, active, sort_order);

-- ---------------------------------------------------------------------------
-- 2) album_figures (membresía; sin figures.album_id)
-- ---------------------------------------------------------------------------

create table if not exists public.album_figures (
  album_id text not null references public.albums (id) on delete cascade,
  figure_id text not null references public.figures (id) on delete restrict,
  collection_id text,
  slot_number integer,
  sort_order integer not null default 100,
  active_in_album boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (album_id, figure_id),
  constraint album_figures_slot_positive check (
    slot_number is null or slot_number > 0
  )
);

comment on table public.album_figures is
  'Figurita en un álbum: capítulo (collection_id), orden y visibilidad. Una figure puede estar en N álbumes.';

comment on column public.album_figures.collection_id is
  'Capítulo dentro del álbum (album_collections.id del mismo album_id). Depreca figures.collection_id para UI.';

create index if not exists album_figures_figure_id_idx
  on public.album_figures (figure_id);

create index if not exists album_figures_album_collection_idx
  on public.album_figures (album_id, collection_id);

create index if not exists album_figures_album_active_sort_idx
  on public.album_figures (album_id, active_in_album, sort_order);

-- ---------------------------------------------------------------------------
-- 3) album_collections.album_id
-- ---------------------------------------------------------------------------

alter table public.album_collections
  add column if not exists album_id text references public.albums (id) on delete cascade;

create index if not exists album_collections_album_id_idx
  on public.album_collections (album_id);

create unique index if not exists album_collections_album_slug_unique
  on public.album_collections (album_id, slug)
  where album_id is not null;

-- ---------------------------------------------------------------------------
-- 4) updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists albums_set_updated_at on public.albums;
create trigger albums_set_updated_at
  before update on public.albums
  for each row
  execute function public.set_updated_at_timestamp();

drop trigger if exists album_figures_set_updated_at on public.album_figures;
create trigger album_figures_set_updated_at
  before update on public.album_figures
  for each row
  execute function public.set_updated_at_timestamp();

-- ---------------------------------------------------------------------------
-- 5) RLS — albums
-- ---------------------------------------------------------------------------

alter table public.albums enable row level security;

drop policy if exists "albums_public_read_published" on public.albums;
create policy "albums_public_read_published"
  on public.albums for select
  using (
    active = true
    and status = 'published'
  );

drop policy if exists "albums_admin_select_all" on public.albums;
create policy "albums_admin_select_all"
  on public.albums for select
  using (public.is_admin());

drop policy if exists "albums_admin_insert" on public.albums;
create policy "albums_admin_insert"
  on public.albums for insert
  with check (public.is_admin());

drop policy if exists "albums_admin_update" on public.albums;
create policy "albums_admin_update"
  on public.albums for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "albums_admin_delete" on public.albums;
create policy "albums_admin_delete"
  on public.albums for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6) RLS — album_figures
-- ---------------------------------------------------------------------------

alter table public.album_figures enable row level security;

drop policy if exists "album_figures_public_read" on public.album_figures;
create policy "album_figures_public_read"
  on public.album_figures for select
  using (
    active_in_album = true
    and exists (
      select 1
      from public.albums a
      where a.id = album_figures.album_id
        and a.active = true
        and a.status = 'published'
    )
    and exists (
      select 1
      from public.figures f
      where f.id = album_figures.figure_id
        and f.active = true
    )
  );

drop policy if exists "album_figures_admin_select_all" on public.album_figures;
create policy "album_figures_admin_select_all"
  on public.album_figures for select
  using (public.is_admin());

drop policy if exists "album_figures_admin_insert" on public.album_figures;
create policy "album_figures_admin_insert"
  on public.album_figures for insert
  with check (public.is_admin());

drop policy if exists "album_figures_admin_update" on public.album_figures;
create policy "album_figures_admin_update"
  on public.album_figures for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "album_figures_admin_delete" on public.album_figures;
create policy "album_figures_admin_delete"
  on public.album_figures for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7) RLS — album_collections (jugador: colección de álbum publicado)
-- ---------------------------------------------------------------------------

drop policy if exists "album_collections_public_read" on public.album_collections;
create policy "album_collections_public_read"
  on public.album_collections for select
  using (
    active = true
    and album_id is not null
    and exists (
      select 1
      from public.albums a
      where a.id = album_collections.album_id
        and a.active = true
        and a.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- 8) Backfill — álbum default San Fernando
-- ---------------------------------------------------------------------------

insert into public.albums (
  id,
  slug,
  title,
  subtitle,
  description,
  status,
  sort_order,
  is_default,
  active,
  map_center_lat,
  map_center_lng,
  map_zoom,
  completion_bonus_points
)
values (
  'san-fernando',
  'san-fernando',
  'San Fernando',
  'Álbum principal',
  'Figuritas del partido de San Fernando — edición actual.',
  'published',
  1,
  true,
  true,
  -34.4417,
  -58.5575,
  13,
  0
)
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  status = excluded.status,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default,
  active = excluded.active,
  map_center_lat = excluded.map_center_lat,
  map_center_lng = excluded.map_center_lng,
  map_zoom = excluded.map_zoom,
  updated_at = now();

update public.album_collections
set album_id = 'san-fernando'
where album_id is null;

alter table public.album_collections
  alter column album_id set not null;

-- Todas las figuritas del catálogo → álbum default (activas e inactivas)
insert into public.album_figures (
  album_id,
  figure_id,
  collection_id,
  slot_number,
  sort_order,
  active_in_album
)
select
  'san-fernando',
  f.id,
  nullif(trim(f.collection_id), ''),
  null,
  100,
  true
from public.figures f
on conflict (album_id, figure_id) do update set
  collection_id = excluded.collection_id,
  active_in_album = excluded.active_in_album,
  updated_at = now();
