
-- =========================================================
-- 1) PROFILES — restrict public exposure of phone/city/neighborhood
-- =========================================================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Staff view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

REVOKE SELECT ON public.profiles FROM anon;

-- Helper for vendor/courier displays: returns only first/last name
CREATE OR REPLACE FUNCTION public.get_basic_profiles(_ids uuid[])
RETURNS TABLE(id uuid, first_name text, last_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name
  FROM public.profiles p
  WHERE p.id = ANY(_ids);
$$;

REVOKE EXECUTE ON FUNCTION public.get_basic_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_basic_profiles(uuid[]) TO authenticated;

-- =========================================================
-- 2) SHOPS — hide payment / commission / ID document / approval fields from anonymous visitors
-- =========================================================
REVOKE SELECT ON public.shops FROM anon;
GRANT SELECT
  (id, name, slug, description, logo_url, banner_url, city, phone,
   status, owner_id, created_at, updated_at, approved_at)
ON public.shops TO anon;

-- =========================================================
-- 3) ORDERS — couriers can only update orders assigned to themselves
-- =========================================================
DROP POLICY IF EXISTS "Couriers update assigned orders" ON public.orders;

CREATE POLICY "Couriers update assigned orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'courier'::app_role)
  AND courier_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'courier'::app_role)
  AND courier_id = auth.uid()
);

-- =========================================================
-- 4) STORAGE — allow shop owners and admins to delete their shop-assets
-- =========================================================
DROP POLICY IF EXISTS "Shop owners delete own shop assets" ON storage.objects;
CREATE POLICY "Shop owners delete own shop assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-assets'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);
