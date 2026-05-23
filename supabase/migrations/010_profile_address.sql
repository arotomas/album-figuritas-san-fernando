-- User home address (manual selection via Places autocomplete — admin-only visibility).

alter table public.profiles
  add column if not exists direccion_texto text,
  add column if not exists direccion_lat double precision,
  add column if not exists direccion_lng double precision,
  add column if not exists localidad text,
  add column if not exists provincia text,
  add column if not exists pais text,
  add column if not exists codigo_postal text;
