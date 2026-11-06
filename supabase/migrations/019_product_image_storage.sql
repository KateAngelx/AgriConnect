insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public product images are readable" on storage.objects;
create policy "Public product images are readable"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "Service role manages product images" on storage.objects;
create policy "Service role manages product images"
on storage.objects for all
to service_role
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');
