-- Allow JPEG uploads in marker-icons bucket for admin image flows.

update storage.buckets
set
  file_size_limit = 204800,
  allowed_mime_types = array[
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/jpeg',
    'image/jpg'
  ]
where id = 'marker-icons';

