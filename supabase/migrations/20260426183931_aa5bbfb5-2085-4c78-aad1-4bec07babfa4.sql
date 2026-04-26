-- 1) Product approval workflow
CREATE TYPE public.product_status AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE public.products
  ADD COLUMN status public.product_status NOT NULL DEFAULT 'pending',
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN approved_by uuid,
  ADD COLUMN rejection_reason text,
  ADD COLUMN shipping_fee_gnf bigint NOT NULL DEFAULT 0;

-- Auto-approve products created in shops owned by an admin
CREATE OR REPLACE FUNCTION public.auto_approve_admin_products()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.shops WHERE id = NEW.shop_id;
  IF v_owner IS NOT NULL AND public.has_role(v_owner, 'admin') THEN
    NEW.status := 'approved';
    NEW.approved_at := now();
    NEW.approved_by := v_owner;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_products_auto_approve
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_admin_products();

-- Backfill: existing products are considered approved
UPDATE public.products SET status = 'approved', approved_at = now() WHERE status = 'pending';

-- Update public visibility policy so only approved products show to buyers
DROP POLICY IF EXISTS "Products of approved shops are viewable by everyone" ON public.products;
CREATE POLICY "Approved products are viewable by everyone"
ON public.products
FOR SELECT
USING (
  (
    status = 'approved'
    AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id = products.shop_id AND s.status = 'approved')
  )
  OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id = products.shop_id AND s.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- 2) Shipping fee snapshot on order_items
ALTER TABLE public.order_items
  ADD COLUMN shipping_fee_gnf bigint NOT NULL DEFAULT 0;

-- 3) Server-side place_order RPC enforcing per-shop confirmation
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
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Distinct shops present in user's cart
  SELECT array_agg(DISTINCT p.shop_id)
    INTO v_cart_shops
  FROM public.cart_items ci
  JOIN public.products p ON p.id = ci.product_id
  WHERE ci.user_id = v_user;

  IF v_cart_shops IS NULL OR array_length(v_cart_shops, 1) = 0 THEN
    RAISE EXCEPTION 'Panier vide';
  END IF;

  -- Every shop in the cart MUST be confirmed
  SELECT array_agg(s) INTO v_missing
  FROM unnest(v_cart_shops) AS s
  WHERE NOT (s = ANY(COALESCE(p_confirmed_shop_ids, ARRAY[]::uuid[])));

  IF v_missing IS NOT NULL AND array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Confirmation manquante pour % boutique(s)', array_length(v_missing, 1);
  END IF;

  -- Compute total (price + shipping) * quantity per cart line
  SELECT COALESCE(SUM((p.price_gnf + COALESCE(p.shipping_fee_gnf, 0)) * ci.quantity), 0)
    INTO v_total
  FROM public.cart_items ci
  JOIN public.products p ON p.id = ci.product_id
  WHERE ci.user_id = v_user;

  -- Insert order
  INSERT INTO public.orders (
    user_id, reference, total_gnf, payment_method, payment_operator,
    payment_reference, customer_name, customer_phone, customer_address, notes, status
  ) VALUES (
    v_user, p_reference, v_total, 'mobile_money', p_payment_operator,
    p_payment_reference, p_customer_name, p_customer_phone, p_customer_address, p_notes, 'pending'
  )
  RETURNING id INTO v_order_id;

  -- Insert order items (snapshot pricing + shipping + commission)
  INSERT INTO public.order_items (
    order_id, product_id, shop_id, title, image_url, size, quantity,
    unit_price_gnf, shipping_fee_gnf, commission_rate
  )
  SELECT
    v_order_id,
    p.id,
    p.shop_id,
    p.title,
    (
      SELECT image_url FROM public.product_images pi
      WHERE pi.product_id = p.id AND pi.size = ci.size
      ORDER BY position LIMIT 1
    ),
    ci.size,
    ci.quantity,
    p.price_gnf,
    COALESCE(p.shipping_fee_gnf, 0),
    COALESCE(s.commission_rate, 10)
  FROM public.cart_items ci
  JOIN public.products p ON p.id = ci.product_id
  JOIN public.shops s ON s.id = p.shop_id
  WHERE ci.user_id = v_user;

  -- Clear cart
  DELETE FROM public.cart_items WHERE user_id = v_user;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order(text, text, text, text, text, text, text, uuid[]) TO authenticated;