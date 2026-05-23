-- Progressive reveal and hidden bonus figure fields.

alter table public.figures
  add column if not exists is_bonus boolean not null default false,
  add column if not exists is_hidden boolean not null default false,
  add column if not exists unlock_order integer,
  add column if not exists reveal_after_count integer not null default 0,
  add column if not exists bonus_type text,
  add column if not exists reveal_radius integer not null default 200,
  add column if not exists marker_icon_url text,
  add column if not exists marker_icon_size integer not null default 48;

alter table public.figures
  drop constraint if exists figures_reveal_after_count_non_negative,
  drop constraint if exists figures_reveal_radius_positive,
  drop constraint if exists figures_marker_icon_size_positive,
  drop constraint if exists figures_bonus_type_valid;

alter table public.figures
  add constraint figures_reveal_after_count_non_negative
  check (reveal_after_count >= 0),
  add constraint figures_reveal_radius_positive
  check (reveal_radius > 0),
  add constraint figures_marker_icon_size_positive
  check (marker_icon_size > 0),
  add constraint figures_bonus_type_valid
  check (bonus_type is null or bonus_type in ('epic', 'legendary'));
