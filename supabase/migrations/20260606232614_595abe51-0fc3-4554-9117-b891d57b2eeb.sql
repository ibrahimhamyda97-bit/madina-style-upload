
CREATE OR REPLACE FUNCTION public.generate_order_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref text;
  v_exists boolean;
BEGIN
  LOOP
    v_ref := 'SAM-'
      || lpad((floor(random() * 1000))::int::text, 3, '0')
      || 'DJ'
      || lpad((floor(random() * 1000))::int::text, 3, '0');
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE reference = v_ref) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_ref;
END;
$$;

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
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_total bigint := 0;
  v_cart_shops uuid[];
  v_missing uuid[];
  v_ref text;
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

  -- Always generate a SAM-XXXDJXXX reference regardless of what the client passes
  v_ref := public.generate_order_reference();

  INSERT INTO public.orders (
    user_id, reference, total_gnf, payment_method, payment_operator,
    payment_reference, customer_name, customer_phone, customer_address, notes, status
  ) VALUES (
    v_user, v_ref, v_total, 'mobile_money', p_payment_operator,
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
$$;
