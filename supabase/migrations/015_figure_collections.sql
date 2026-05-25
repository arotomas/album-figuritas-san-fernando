-- Collection metadata for figures (grouping, pages, future events).
-- All nullable — existing rows keep working without backfill.

alter table public.figures
  add column if not exists collection_id text,
  add column if not exists category text,
  add column if not exists page integer,
  add column if not exists event_id text,
  add column if not exists event_starts_at timestamptz,
  add column if not exists event_ends_at timestamptz;

comment on column public.figures.collection_id is 'Album collection slug, e.g. plazas, cultura, murales';
comment on column public.figures.category is 'Optional sub-tag within a collection';
comment on column public.figures.page is 'Optional album page number within collection';
comment on column public.figures.event_id is 'Optional timed event slug (future seasonal albums)';
