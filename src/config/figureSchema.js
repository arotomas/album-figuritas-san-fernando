/** Columnas compartidas catálogo figuritas — mantener admin y player alineados. */

export const FIGURE_GAMEPLAY_COLUMNS =
  'capture_radius, is_bonus, is_hidden, unlock_order, reveal_after_count, bonus_type, reveal_radius, marker_icon_url, marker_icon_size'

export const FIGURE_CHALLENGE_COLUMNS =
  'challenge_title, challenge_description, challenge_type, challenge_example_image_url'

export const FIGURE_UNIVERSE_COLUMNS =
  'collection_id, category, page, event_id, event_starts_at, event_ends_at'

export const FIGURE_CORE_COLUMNS =
  'id, title, description, rarity, lat, lng, image_url, active, created_at'

export const FIGURE_ADMIN_SELECT = [
  FIGURE_CORE_COLUMNS,
  FIGURE_GAMEPLAY_COLUMNS,
  FIGURE_CHALLENGE_COLUMNS,
  FIGURE_UNIVERSE_COLUMNS,
].join(', ')

/** Player fetch usa las mismas columnas que admin. */
export const FIGURE_PUBLIC_SELECT = FIGURE_ADMIN_SELECT

export const FIGURE_SCHEMA_FALLBACK_PATTERN =
  /capture_radius|is_bonus|is_hidden|unlock_order|reveal_after_count|bonus_type|reveal_radius|marker_icon_url|marker_icon_size|challenge_title|challenge_description|challenge_type|challenge_example_image_url|collection_id|category|page|event_id|event_starts_at|event_ends_at/i

export const FIGURE_UNIVERSE_DEFAULTS = {
  collection_id: null,
  category: null,
  page: null,
  event_id: null,
  event_starts_at: null,
  event_ends_at: null,
}

export const FIGURE_GAMEPLAY_DEFAULTS = {
  capture_radius: 250,
  is_bonus: false,
  is_hidden: false,
  unlock_order: null,
  reveal_after_count: 0,
  bonus_type: null,
  reveal_radius: 200,
  marker_icon_url: null,
  marker_icon_size: 48,
  challenge_title: null,
  challenge_description: null,
  challenge_type: null,
  challenge_example_image_url: null,
}
