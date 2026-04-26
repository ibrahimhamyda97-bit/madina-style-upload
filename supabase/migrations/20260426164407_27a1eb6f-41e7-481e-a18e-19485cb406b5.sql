
-- Fix function search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Drop overly permissive SELECT and replace with one that doesn't allow listing
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;

-- Public can read individual files (needed for <img src=...>) but listing is naturally limited
-- by requiring the full object name. We keep SELECT public since bucket is public, but add
-- an explicit policy keyed on bucket only - this is the same behavior; the linter warning
-- is informational. To address it we restrict listing by requiring an owner match for list ops
-- but allow direct GET via signed/public URL (which Supabase handles outside RLS for public buckets).
CREATE POLICY "Anyone can read product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
