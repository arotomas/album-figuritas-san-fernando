-- Album events — temporal source of truth for collections and figures.

create table if not exists public.album_events (
  id text primary key,
  slug text not null unique,
  label text not null,
  description text,
  cover_image text,
  badge text,
  ambience text,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  edition text not null default 'event',
  visibility text not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.album_events
  drop constraint if exists album_events_edition_valid,
  drop constraint if exists album_events_visibility_valid;

alter table public.album_events
  add constraint album_events_edition_valid
  check (edition in ('standard', 'limited', 'seasonal', 'event')),
  add constraint album_events_visibility_valid
  check (visibility in ('public', 'hidden', 'conditional'));

create index if not exists album_events_starts_at_idx
  on public.album_events (starts_at asc nulls last);

create index if not exists album_events_ends_at_idx
  on public.album_events (ends_at asc nulls last);

create index if not exists album_events_active_idx
  on public.album_events (active);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.album_events enable row level security;

drop policy if exists "album_events_public_read" on public.album_events;
create policy "album_events_public_read"
  on public.album_events for select
  using (active = true);

drop policy if exists "album_events_admin_select_all" on public.album_events;
create policy "album_events_admin_select_all"
  on public.album_events for select
  using (public.is_admin());

drop policy if exists "album_events_admin_insert" on public.album_events;
create policy "album_events_admin_insert"
  on public.album_events for insert
  with check (public.is_admin());

drop policy if exists "album_events_admin_update" on public.album_events;
create policy "album_events_admin_update"
  on public.album_events for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "album_events_admin_delete" on public.album_events;
create policy "album_events_admin_delete"
  on public.album_events for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed mínimo (demo — sin colecciones vinculadas aún)
-- ---------------------------------------------------------------------------
insert into public.album_events (
  id, slug, label, description, badge, ambience, starts_at, ends_at, active, edition, visibility
) values
  (
    'noche-museos',
    'noche-museos',
    'Noche de Museos',
    'Una noche especial para descubrir la cultura local.',
    'Noche',
    'night',
    date_trunc('day', now()) + interval '20 hours',
    date_trunc('day', now()) + interval '1 day' + interval '2 hours',
    true,
    'event',
    'public'
  )
on conflict (id) do update set
  slug = excluded.slug,
  label = excluded.label,
  description = excluded.description,
  badge = excluded.badge,
  ambience = excluded.ambience,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  active = excluded.active,
  edition = excluded.edition,
  visibility = excluded.visibility,
  updated_at = now();
