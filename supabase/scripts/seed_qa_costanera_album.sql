-- Seed STAGING ONLY — álbum QA Costanera + figuritas de prueba
-- No toca user_figures, ledger ni ranking.
-- Rollback: supabase/scripts/rollback_qa_costanera_album.sql

-- ---------------------------------------------------------------------------
-- Álbum de prueba
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
  'qa-costanera',
  'qa-costanera',
  'Costanera QA',
  'Solo staging',
  'Álbum de prueba para validar selector y album_figures. No usar en producción.',
  'published',
  50,
  false,
  true,
  -34.4360,
  -58.5540,
  15,
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

-- Capítulo QA dentro del álbum (opcional, para agrupar en Mi Álbum)
insert into public.album_collections (
  id,
  slug,
  label,
  description,
  icon,
  page,
  sort_order,
  track,
  visibility,
  edition,
  hidden_until_discovered,
  active,
  album_id
)
values (
  'qa-costanera-paseo',
  'qa-costanera-paseo',
  'Paseo QA',
  'Figuritas de prueba en la costanera.',
  '🧪',
  1,
  1,
  'main',
  'public',
  'standard',
  false,
  true,
  'qa-costanera'
)
on conflict (id) do update set
  album_id = excluded.album_id,
  label = excluded.label,
  active = excluded.active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Figuritas QA (coords separadas cerca de Costanera San Fernando ~ -34.436, -58.554)
-- ---------------------------------------------------------------------------
insert into public.figures (
  id,
  title,
  description,
  rarity,
  lat,
  lng,
  image_url,
  active,
  capture_radius,
  is_bonus,
  is_hidden,
  reveal_after_count,
  collection_id
)
values
  (
    'qa-costanera-01',
    'QA Mirador Costanera',
    'Punto QA 1 — staging.',
    'común',
    -34.4348,
    -58.5532,
    null,
    true,
    220,
    false,
    false,
    0,
    'qa-costanera-paseo'
  ),
  (
    'qa-costanera-02',
    'QA Banco del Río',
    'Punto QA 2 — staging.',
    'común',
    -34.4362,
    -58.5551,
    null,
    true,
    220,
    false,
    false,
    0,
    'qa-costanera-paseo'
  ),
  (
    'qa-costanera-03',
    'QA Muelle QA',
    'Punto QA 3 — staging (rara, 25 pts).',
    'rara',
    -34.4375,
    -58.5524,
    null,
    true,
    220,
    false,
    false,
    0,
    'qa-costanera-paseo'
  ),
  (
    'qa-costanera-04',
    'QA Sendero Delta',
    'Punto QA 4 — staging.',
    'común',
    -34.4355,
    -58.5560,
    null,
    true,
    220,
    false,
    false,
    0,
    'qa-costanera-paseo'
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  rarity = excluded.rarity,
  lat = excluded.lat,
  lng = excluded.lng,
  active = excluded.active,
  capture_radius = excluded.capture_radius,
  collection_id = excluded.collection_id;

-- Membresía: solo figuritas QA en este álbum
insert into public.album_figures (album_id, figure_id, collection_id, sort_order, active_in_album)
values
  ('qa-costanera', 'qa-costanera-01', 'qa-costanera-paseo', 10, true),
  ('qa-costanera', 'qa-costanera-02', 'qa-costanera-paseo', 20, true),
  ('qa-costanera', 'qa-costanera-03', 'qa-costanera-paseo', 30, true),
  ('qa-costanera', 'qa-costanera-04', 'qa-costanera-paseo', 40, true),
  -- Cross-álbum: figurita real ya existente (unlock global al capturar)
  ('qa-costanera', '3', 'qa-costanera-paseo', 50, true),
  ('qa-costanera', '2', 'qa-costanera-paseo', 60, true)
on conflict (album_id, figure_id) do update set
  collection_id = excluded.collection_id,
  sort_order = excluded.sort_order,
  active_in_album = excluded.active_in_album,
  updated_at = now();
