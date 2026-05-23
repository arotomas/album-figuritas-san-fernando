-- Visual capture challenges per figure (human review, no AI).

alter table public.figures
  add column if not exists challenge_title text,
  add column if not exists challenge_description text,
  add column if not exists challenge_type text,
  add column if not exists challenge_example_image_url text;
