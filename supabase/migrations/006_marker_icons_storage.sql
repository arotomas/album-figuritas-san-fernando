-- Storage bucket and policies for admin-managed marker icons.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marker-icons',
  'marker-icons',
  true,
  204800,
  array['image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "marker_icons_public_read" on storage.objects;
drop policy if exists "marker_icons_admin_insert" on storage.objects;
drop policy if exists "marker_icons_admin_update" on storage.objects;
drop policy if exists "marker_icons_admin_delete" on storage.objects;

create policy "marker_icons_public_read"
on storage.objects
for select
using (bucket_id = 'marker-icons');

create policy "marker_icons_admin_insert"
on storage.objects
for insert
with check (bucket_id = 'marker-icons' and public.is_admin());

create policy "marker_icons_admin_update"
on storage.objects
for update
using (bucket_id = 'marker-icons' and public.is_admin())
with check (bucket_id = 'marker-icons' and public.is_admin());

create policy "marker_icons_admin_delete"
on storage.objects
for delete
using (bucket_id = 'marker-icons' and public.is_admin());
