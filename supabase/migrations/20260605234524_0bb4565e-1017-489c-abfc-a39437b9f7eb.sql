
-- 1) Courier applications: explicit INSERT policy
DROP POLICY IF EXISTS "Users insert own courier application" ON public.courier_applications;
CREATE POLICY "Users insert own courier application"
ON public.courier_applications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2) Restrict courier SELECT on orders so PII (name/phone/address) and
-- pickup/delivery codes are only visible for orders the courier owns.
DROP POLICY IF EXISTS "Couriers view deliverable orders" ON public.orders;
CREATE POLICY "Couriers view own assigned orders"
ON public.orders FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'courier'::app_role) AND courier_id = auth.uid());

-- Tighten order_items courier SELECT to own orders only
DROP POLICY IF EXISTS "Couriers view items of deliverable orders" ON public.order_items;
CREATE POLICY "Couriers view items of own orders"
ON public.order_items FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'courier'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.courier_id = auth.uid()
  )
);

-- Helper RPC: list available (unassigned) orders for couriers WITHOUT PII or codes
CREATE OR REPLACE FUNCTION public.get_available_courier_orders()
RETURNS TABLE (
  id uuid,
  reference text,
  total_gnf bigint,
  delivery_status delivery_status,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT o.id, o.reference, o.total_gnf, o.delivery_status, o.created_at
  FROM public.orders o
  WHERE public.has_role(auth.uid(), 'courier'::app_role)
    AND o.status = 'paid'
    AND o.delivery_status = 'unassigned'
    AND o.courier_id IS NULL
  ORDER BY o.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_available_courier_orders() TO authenticated;

-- Items for those available orders (no PII; shop + product info only)
CREATE OR REPLACE FUNCTION public.get_available_courier_order_items(_order_ids uuid[])
RETURNS TABLE (
  id uuid,
  order_id uuid,
  shop_id uuid,
  title text,
  image_url text,
  quantity int,
  size product_size
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT oi.id, oi.order_id, oi.shop_id, oi.title, oi.image_url, oi.quantity, oi.size
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE public.has_role(auth.uid(), 'courier'::app_role)
    AND o.status = 'paid'
    AND o.delivery_status = 'unassigned'
    AND o.courier_id IS NULL
    AND oi.order_id = ANY(_order_ids);
$$;
GRANT EXECUTE ON FUNCTION public.get_available_courier_order_items(uuid[]) TO authenticated;

-- 3) shop-assets DELETE: also require that the user actually owns a shop
DROP POLICY IF EXISTS "Shop owners delete own shop assets" ON storage.objects;
CREATE POLICY "Shop owners delete own shop assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'shop-assets'
  AND (
    (
      (storage.foldername(name))[1] = (auth.uid())::text
      AND EXISTS (SELECT 1 FROM public.shops s WHERE s.owner_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 4) Shops: hide payment_number / payment_operator from anon and authenticated
-- (including moderators). Owners/admins read these via service-role edge functions only.
-- Also exclude id_document_url from anon (only authenticated moderators/owners/admins need it).
REVOKE SELECT ON public.shops FROM anon;
REVOKE SELECT ON public.shops FROM authenticated;
GRANT SELECT (
  id, slug, name, owner_id, commission_rate, phone, city,
  banner_url, logo_url, description, status, id_document_url,
  rejection_reason, approved_at, approved_by, created_at, updated_at
) ON public.shops TO authenticated;
GRANT SELECT (
  id, slug, name, owner_id, commission_rate, phone, city,
  banner_url, logo_url, description, status,
  approved_at, created_at, updated_at
) ON public.shops TO anon;
