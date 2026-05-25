-- Album collections as first-class entities (gradual migration from client config).

create table if not exists public.album_collections (
  id text primary key,
  slug text not null unique,
  label text not null,
  description text,
  icon text,
  cover_image text,
  page integer,
  sort_order integer not null default 100,
  track text not null default 'main',
  visibility text not null default 'public',
  edition text not null default 'standard',
  event_id text,
  available_from timestamptz,
  available_until timestamptz,
  hidden_until_discovered boolean not null default false,
  unlock_condition text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.album_collections
  drop constraint if exists album_collections_track_valid,
  drop constraint if exists album_collections_visibility_valid,
  drop constraint if exists album_collections_edition_valid;

alter table public.album_collections
  add constraint album_collections_track_valid
  check (track in ('main', 'bonus', 'event')),
  add constraint album_collections_visibility_valid
  check (visibility in ('public', 'hidden', 'conditional')),
  add constraint album_collections_edition_valid
  check (edition in ('standard', 'limited', 'seasonal', 'event'));

create index if not exists album_collections_sort_order_idx
  on public.album_collections (sort_order asc);

create index if not exists album_collections_active_idx
  on public.album_collections (active);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.album_collections enable row level security;

drop policy if exists "album_collections_public_read" on public.album_collections;
create policy "album_collections_public_read"
  on public.album_collections for select
  using (active = true);

drop policy if exists "album_collections_admin_select_all" on public.album_collections;
create policy "album_collections_admin_select_all"
  on public.album_collections for select
  using (public.is_admin());

drop policy if exists "album_collections_admin_insert" on public.album_collections;
create policy "album_collections_admin_insert"
  on public.album_collections for insert
  with check (public.is_admin());

drop policy if exists "album_collections_admin_update" on public.album_collections;
create policy "album_collections_admin_update"
  on public.album_collections for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "album_collections_admin_delete" on public.album_collections;
create policy "album_collections_admin_delete"
  on public.album_collections for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed (mirrors src/config/albumCollections.js)
-- ---------------------------------------------------------------------------
insert into public.album_collections (
  id, slug, label, description, icon, page, sort_order, track, visibility, edition, hidden_until_discovered
) values
  ('plazas', 'plazas', 'Plazas', 'Espacios verdes y encuentros al aire libre.', '🌳', 1, 1, 'main', 'public', 'standard', false),
  ('murales', 'murales', 'Murales', 'Arte urbano y color en las calles.', '🎨', 1, 2, 'main', 'public', 'standard', false),
  ('cultura', 'cultura', 'Cultura', 'Historia, museos y patrimonio local.', '🏛️', 2, 3, 'main', 'public', 'standard', false),
  ('arquitectura', 'arquitectura', 'Arquitectura', 'Edificios emblemáticos de San Fernando.', '🏗️', 2, 4, 'main', 'public', 'standard', false),
  ('deportes', 'deportes', 'Deportes', 'Clubes, canchas y tradición deportiva.', '⚽', 3, 5, 'main', 'public', 'standard', false),
  ('personajes', 'personajes', 'Personajes', 'Figuras que marcaron la ciudad.', '⭐', 3, 6, 'main', 'public', 'standard', false),
  ('secretos', 'secretos', 'Secretos', 'Figuritas especiales escondidas en la ciudad.', '✦', 4, 90, 'bonus', 'hidden', 'standard', true),
  ('otros', 'otros', 'Otros', 'Lugares por descubrir.', '📍', 99, 100, 'main', 'public', 'standard', false)
on conflict (id) do update set
  slug = excluded.slug,
  label = excluded.label,
  description = excluded.description,
  icon = excluded.icon,
  page = excluded.page,
  sort_order = excluded.sort_order,
  track = excluded.track,
  visibility = excluded.visibility,
  edition = excluded.edition,
  hidden_until_discovered = excluded.hidden_until_discovered,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Backfill figures.collection_id (idempotent)
-- Rollback: UPDATE public.figures SET collection_id = NULL;
-- ---------------------------------------------------------------------------

-- Seed catalog IDs (001_initial_schema.sql)
update public.figures set collection_id = 'arquitectura'
where id = '1' and (collection_id is null or collection_id = '');

update public.figures set collection_id = 'plazas'
where id = '2' and (collection_id is null or collection_id = '');

update public.figures set collection_id = 'plazas'
where id = '3' and (collection_id is null or collection_id = '');

update public.figures set collection_id = 'cultura'
where id = '4' and (collection_id is null or collection_id = '');

update public.figures set collection_id = 'arquitectura'
where id = '5' and (collection_id is null or collection_id = '');

-- Slug-like IDs from admin (buildFigureId titles)
update public.figures set collection_id = 'arquitectura'
where collection_id is null
  and id ~* '(catedral|estacion|estación|fluvial)';

update public.figures set collection_id = 'plazas'
where collection_id is null
  and id ~* '(plaza|costanera|parque|jardin|jardín)';

update public.figures set collection_id = 'cultura'
where collection_id is null
  and id ~* '(museo|cultura|historico|histórico|teatro)';

update public.figures set collection_id = 'murales'
where collection_id is null
  and id ~* '(mural|grafiti|street-art)';

update public.figures set collection_id = 'deportes'
where collection_id is null
  and id ~* '(deporte|club|cancha|estadio|futbol|fútbol)';

-- Bonus / high rarity without explicit collection
update public.figures set collection_id = 'secretos'
where collection_id is null
  and (
    is_bonus = true
    or lower(rarity) in ('épica', 'epica', 'legendaria')
  );

-- Safe default
update public.figures set collection_id = 'otros'
where collection_id is null;
