-- 1. Étendre profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS neighborhood text;

-- 2. Statut de boutique
DO $$ BEGIN
  CREATE TYPE public.shop_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS status public.shop_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS id_document_url text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Les boutiques existantes sont auto-validées
UPDATE public.shops SET status = 'approved', approved_at = now() WHERE status = 'pending';

-- 3. Politiques RLS sur shops : public ne voit que les approuvées
DROP POLICY IF EXISTS "Shops are viewable by everyone" ON public.shops;
CREATE POLICY "Approved shops are viewable by everyone"
  ON public.shops FOR SELECT
  USING (status = 'approved' OR auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

-- 4. Politique sur products : seulement si la boutique est approuvée
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products of approved shops are viewable by everyone"
  ON public.products FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.shops s WHERE s.id = products.shop_id AND s.status = 'approved')
    OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id = products.shop_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 5. Bucket pour pièces d'identité (privé)
INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-documents', 'identity-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Politiques storage pour identity-documents : path = {user_id}/...
CREATE POLICY "Vendor uploads own ID document"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'identity-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Vendor reads own ID document"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'identity-documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Vendor updates own ID document"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'identity-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins delete ID documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'identity-documents' AND public.has_role(auth.uid(), 'admin'));

-- 6. Bucket public shop-assets pour logos/bannières (s'il n'existe pas)
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-assets', 'shop-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read shop-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-assets');

CREATE POLICY "Owner uploads shop-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'shop-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner updates shop-assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'shop-assets' AND auth.uid()::text = (storage.foldername(name))[1]);