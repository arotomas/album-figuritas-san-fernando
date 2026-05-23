-- Track photo replacements on user_figures without resetting unlock progress.

alter table public.user_figures
  add column if not exists updated_at timestamptz,
  add column if not exists last_photo_updated_at timestamptz;
