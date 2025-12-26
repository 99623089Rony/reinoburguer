-- Storage Setup - SAFE VERSION
-- Este script pode ser executado múltiplas vezes sem erro

-- Create Buckets (IF NOT EXISTS)
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to avoid duplicates
DROP POLICY IF EXISTS "Public Access to Products" ON storage.objects;
DROP POLICY IF EXISTS "Admin Insert Products" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Products" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Products" ON storage.objects;

DROP POLICY IF EXISTS "Public Access to Store Assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Insert Store Assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Store Assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Store Assets" ON storage.objects;

-- Policies for 'products' bucket
CREATE POLICY "Public Access to Products"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'products' );

CREATE POLICY "Admin Insert Products"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'products' AND auth.role() = 'authenticated' );

CREATE POLICY "Admin Update Products"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'products' AND auth.role() = 'authenticated' );

CREATE POLICY "Admin Delete Products"
  ON storage.objects FOR DELETE
  USING ( bucket_id = 'products' AND auth.role() = 'authenticated' );

-- Policies for 'store-assets' bucket
CREATE POLICY "Public Access to Store Assets"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'store-assets' );

CREATE POLICY "Admin Insert Store Assets"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'store-assets' AND auth.role() = 'authenticated' );

CREATE POLICY "Admin Update Store Assets"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'store-assets' AND auth.role() = 'authenticated' );

CREATE POLICY "Admin Delete Store Assets"
  ON storage.objects FOR DELETE
  USING ( bucket_id = 'store-assets' AND auth.role() = 'authenticated' );
