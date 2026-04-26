-- ========== 1. NEW TABLES ==========

CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL,
  name text,
  color text,
  size product_size,
  price_gnf bigint,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_variants_product ON public.product_variants(product_id);

CREATE TABLE public.product_variant_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_variant_images_variant ON public.product_variant_images(variant_id);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_images ENABLE ROW LEVEL SECURITY;

-- ========== 2. RLS POLICIES ==========

CREATE POLICY "Variants viewable when product viewable"
  ON public.product_variants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.shops s ON s.id = p.shop_id
    WHERE p.id = product_variants.product_id
      AND (
        (p.status = 'approved' AND s.status = 'approved')
        OR s.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  ));

CREATE POLICY "Shop owners insert variants"
  ON public.product_variants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.shops s ON s.id = p.shop_id
    WHERE p.id = product_variants.product_id AND s.owner_id = auth.uid()
  ));

CREATE POLICY "Shop owners update variants"
  ON public.product_variants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.shops s ON s.id = p.shop_id
    WHERE p.id = product_variants.product_id AND s.owner_id = auth.uid()
  ));

CREATE POLICY "Shop owners delete variants"
  ON public.product_variants FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.shops s ON s.id = p.shop_id
    WHERE p.id = product_variants.product_id AND s.owner_id = auth.uid()
  ));

CREATE POLICY "Admins manage all variants"
  ON public.product_variants FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Variant images viewable when variant viewable"
  ON public.product_variant_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.product_variants v
    JOIN public.products p ON p.id = v.product_id
    JOIN public.shops s ON s.id = p.shop_id
    WHERE v.id = product_variant_images.variant_id
      AND (
        (p.status = 'approved' AND s.status = 'approved')
        OR s.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  ));

CREATE POLICY "Shop owners insert variant images"
  ON public.product_variant_images FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.product_variants v
    JOIN public.products p ON p.id = v.product_id
    JOIN public.shops s ON s.id = p.shop_id
    WHERE v.id = product_variant_images.variant_id AND s.owner_id = auth.uid()
  ));

CREATE POLICY "Shop owners update variant images"
  ON public.product_variant_images FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.product_variants v
    JOIN public.products p ON p.id = v.product_id
    JOIN public.shops s ON s.id = p.shop_id
    WHERE v.id = product_variant_images.variant_id AND s.owner_id = auth.uid()
  ));

CREATE POLICY "Shop owners delete variant images"
  ON public.product_variant_images FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.product_variants v
    JOIN public.products p ON p.id = v.product_id
    JOIN public.shops s ON s.id = p.shop_id
    WHERE v.id = product_variant_images.variant_id AND s.owner_id = auth.uid()
  ));

CREATE POLICY "Admins manage all variant images"
  ON public.product_variant_images FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ========== 3. updated_at trigger ==========
CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ========== 4. cart_items / order_items ==========
ALTER TABLE public.cart_items
  ADD COLUMN variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE;

ALTER TABLE public.order_items
  ADD COLUMN variant_id uuid,
  ADD COLUMN variant_label text;

-- ========== 5. Migrate existing products ==========
DO $$
DECLARE
  r RECORD;
  v_variant_id uuid;
BEGIN
  FOR r IN
    SELECT p.id AS product_id, pi.image_url, pi.size,
           pi.detected_color, pi.position
      FROM public.products p
      JOIN public.product_images pi ON pi.product_id = p.id
     ORDER BY p.id, pi.position
  LOOP
    INSERT INTO public.product_variants (product_id, color, size, price_gnf, position)
    VALUES (r.product_id, r.detected_color, r.size, NULL, r.position)
    RETURNING id INTO v_variant_id;

    INSERT INTO public.product_variant_images (variant_id, image_url, position)
    VALUES (v_variant_id, r.image_url, 0);
  END LOOP;
END $$;

-- ========== 6. place_order ==========
CREATE OR REPLACE FUNCTION public.place_order(
  p_reference text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_notes text,
  p_payment_operator text,
  p_payment_reference text,
  p_confirmed_shop_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_total bigint := 0;
  v_cart_shops uuid[];
  v_missing uuid[];
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;

  SELECT array_agg(DISTINCT p.shop_id)
    INTO v_cart_shops
  FROM public.cart_items ci
  JOIN public.products p ON p.id = ci.product_id
  WHERE ci.user_id = v_user;

  IF v_cart_shops IS NULL OR array_length(v_cart_shops, 1) = 0 THEN
    RAISE EXCEPTION 'Panier vide';
  END IF;

  SELECT array_agg(s) INTO v_missing
  FROM unnest(v_cart_shops) AS s
  WHERE NOT (s = ANY(COALESCE(p_confirmed_shop_ids, ARRAY[]::uuid[])));

  IF v_missing IS NOT NULL AND array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Confirmation manquante pour % boutique(s)', array_length(v_missing, 1);
  END IF;

  SELECT COALESCE(SUM(
    (COALESCE(pv.price_gnf, p.price_gnf) + COALESCE(p.shipping_fee_gnf, 0)) * ci.quantity
  ), 0)
    INTO v_total
  FROM public.cart_items ci
  JOIN public.products p ON p.id = ci.product_id
  LEFT JOIN public.product_variants pv ON pv.id = ci.variant_id
  WHERE ci.user_id = v_user;

  INSERT INTO public.orders (
    user_id, reference, total_gnf, payment_method, payment_operator,
    payment_reference, customer_name, customer_phone, customer_address, notes, status
  ) VALUES (
    v_user, p_reference, v_total, 'mobile_money', p_payment_operator,
    p_payment_reference, p_customer_name, p_customer_phone, p_customer_address, p_notes, 'pending'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, shop_id, title, image_url, size, quantity,
    unit_price_gnf, shipping_fee_gnf, commission_rate, variant_id, variant_label
  )
  SELECT
    v_order_id,
    p.id,
    p.shop_id,
    p.title,
    COALESCE(
      (SELECT image_url FROM public.product_variant_images
        WHERE variant_id = ci.variant_id ORDER BY position LIMIT 1),
      (SELECT image_url FROM public.product_images pi
        WHERE pi.product_id = p.id AND pi.size = ci.size
        ORDER BY position LIMIT 1)
    ),
    ci.size,
    ci.quantity,
    COALESCE(pv.price_gnf, p.price_gnf),
    COALESCE(p.shipping_fee_gnf, 0),
    COALESCE(s.commission_rate, 10),
    ci.variant_id,
    NULLIF(trim(BOTH ' ·' FROM concat_ws(' · ', pv.name, pv.color)), '')
  FROM public.cart_items ci
  JOIN public.products p ON p.id = ci.product_id
  JOIN public.shops s ON s.id = p.shop_id
  LEFT JOIN public.product_variants pv ON pv.id = ci.variant_id
  WHERE ci.user_id = v_user;

  DELETE FROM public.cart_items WHERE user_id = v_user;

  RETURN v_order_id;
END;
$function$;