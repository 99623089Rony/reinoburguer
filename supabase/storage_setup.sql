-- Enable Storage Extension (usually enabled by default, but good to ensure)
-- create extension if not exists "storage";

-- Create Buckets
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do nothing;

-- Policies for 'products' bucket
-- Allow public read access
create policy "Public Access to Products"
  on storage.objects for select
  using ( bucket_id = 'products' );

-- Allow authenticated users to upload/update/delete (Admins)
create policy "Admin Insert Products"
  on storage.objects for insert
  with check ( bucket_id = 'products' and auth.role() = 'authenticated' );

create policy "Admin Update Products"
  on storage.objects for update
  using ( bucket_id = 'products' and auth.role() = 'authenticated' );

create policy "Admin Delete Products"
  on storage.objects for delete
  using ( bucket_id = 'products' and auth.role() = 'authenticated' );


-- Policies for 'store-assets' bucket
-- Allow public read access
create policy "Public Access to Store Assets"
  on storage.objects for select
  using ( bucket_id = 'store-assets' );

-- Allow authenticated users to upload/update/delete (Admins)
create policy "Admin Insert Store Assets"
  on storage.objects for insert
  with check ( bucket_id = 'store-assets' and auth.role() = 'authenticated' );

create policy "Admin Update Store Assets"
  on storage.objects for update
  using ( bucket_id = 'store-assets' and auth.role() = 'authenticated' );

create policy "Admin Delete Store Assets"
  on storage.objects for delete
  using ( bucket_id = 'store-assets' and auth.role() = 'authenticated' );
