-- Album Figuritas San Fernando — schema inicial
-- Ejecutar en Supabase Dashboard → SQL Editor (Run)

-- ---------------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  username text,
  avatar_url text,
  is_admin boolean not null default false
);

create table if not exists public.figures (
  id text primary key,
  title text not null,
  description text,
  rarity text not null default 'común',
  lat double precision not null,
  lng double precision not null,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_figures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  figure_id text not null references public.figures (id) on delete restrict,
  captured_at timestamptz not null default now(),
  photo_url text,
  source text default 'capture',
  unique (user_id, figure_id)
);

create table if not exists public.captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  figure_id text not null references public.figures (id) on delete restrict,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  photo_url text,
  device text
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index if not exists user_figures_user_id_idx on public.user_figures (user_id);
create index if not exists captures_user_id_idx on public.captures (user_id);
create index if not exists captures_created_at_idx on public.captures (created_at desc);

-- ---------------------------------------------------------------------------
-- Seed catálogo (mock → producción)
-- ---------------------------------------------------------------------------
insert into public.figures (id, title, description, rarity, lat, lng, image_url, active)
values
  ('1', 'Catedral de San Fernando', 'Patrimonio histórico del centro de la ciudad.', 'común', -34.4439, -58.5597, null, true),
  ('2', 'Plaza San Martín', 'Corazón cívico y punto de encuentro local.', 'común', -34.4428, -58.5589, null, true),
  ('3', 'Costanera del Delta', 'Vistas al río y paseos al aire libre.', 'rara', -34.4365, -58.5542, null, true),
  ('4', 'Museo Histórico', 'Historia y cultura de San Fernando.', 'épica', -34.4451, -58.5563, null, true),
  ('5', 'Estación Fluvial', 'Puerta de entrada al delta.', 'legendaria', -34.4402, -58.5621, null, true)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  rarity = excluded.rarity,
  lat = excluded.lat,
  lng = excluded.lng,
  active = excluded.active;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.figures enable row level security;
alter table public.user_figures enable row level security;
alter table public.captures enable row level security;

-- Catálogo: lectura pública de figuritas activas
drop policy if exists "figures_public_read" on public.figures;
create policy "figures_public_read"
  on public.figures for select
  using (active = true);

-- Perfiles: cada usuario ve/edita el suyo
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Álbum del usuario
drop policy if exists "user_figures_select_own" on public.user_figures;
create policy "user_figures_select_own"
  on public.user_figures for select
  using (auth.uid() = user_id);

drop policy if exists "user_figures_insert_own" on public.user_figures;
create policy "user_figures_insert_own"
  on public.user_figures for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_figures_update_own" on public.user_figures;
create policy "user_figures_update_own"
  on public.user_figures for update
  using (auth.uid() = user_id);

-- Capturas
drop policy if exists "captures_select_own" on public.captures;
create policy "captures_select_own"
  on public.captures for select
  using (auth.uid() = user_id);

drop policy if exists "captures_insert_own" on public.captures;
create policy "captures_insert_own"
  on public.captures for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket: captures
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'captures',
  'captures',
  true,
  524288,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "captures_public_read" on storage.objects;
create policy "captures_public_read"
  on storage.objects for select
  using (bucket_id = 'captures');

drop policy if exists "captures_auth_insert_own" on storage.objects;
create policy "captures_auth_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "captures_auth_update_own" on storage.objects;
create policy "captures_auth_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Auth anónimo: habilitar en Dashboard → Authentication → Providers → Anonymous
-- ---------------------------------------------------------------------------
