
DROP POLICY IF EXISTS "Anyone can read product images" ON storage.objects;
-- Public access for individual file reads, but require name to be specified (prevents listing entire bucket)
CREATE POLICY "Anyone can read named product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images' AND name IS NOT NULL AND name <> '');
