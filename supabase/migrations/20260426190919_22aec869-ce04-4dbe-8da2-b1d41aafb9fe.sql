
-- Extend orders with delivery fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_status public.delivery_status NOT NULL DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS courier_id uuid,
  ADD COLUMN IF NOT EXISTS pickup_code text,
  ADD COLUMN IF NOT EXISTS delivery_code text,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_notes text;

-- Helper to generate 6-digit code
CREATE OR REPLACE FUNCTION public.generate_auth_code()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT lpad((floor(random() * 1000000))::int::text, 6, '0');
$$;

-- Trigger: assign codes on order insert
CREATE OR REPLACE FUNCTION public.set_order_delivery_codes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.pickup_code IS NULL THEN NEW.pickup_code := public.generate_auth_code(); END IF;
  IF NEW.delivery_code IS NULL THEN NEW.delivery_code := public.generate_auth_code(); END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_orders_set_codes ON public.orders;
CREATE TRIGGER trg_orders_set_codes
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_delivery_codes();

-- Backfill codes on existing orders that don't have any
UPDATE public.orders SET pickup_code = public.generate_auth_code() WHERE pickup_code IS NULL;
UPDATE public.orders SET delivery_code = public.generate_auth_code() WHERE delivery_code IS NULL;

-- RLS: couriers can view paid orders ready for delivery (or assigned to them)
DROP POLICY IF EXISTS "Couriers view deliverable orders" ON public.orders;
CREATE POLICY "Couriers view deliverable orders" ON public.orders
  FOR SELECT TO public
  USING (
    public.has_role(auth.uid(), 'courier'::app_role)
    AND status = 'paid'
    AND (
      delivery_status IN ('unassigned','assigned','picked_up','in_transit')
      OR courier_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Couriers update assigned orders" ON public.orders;
CREATE POLICY "Couriers update assigned orders" ON public.orders
  FOR UPDATE TO public
  USING (
    public.has_role(auth.uid(), 'courier'::app_role)
    AND (courier_id = auth.uid() OR courier_id IS NULL)
  );

DROP POLICY IF EXISTS "Couriers view items of deliverable orders" ON public.order_items;
CREATE POLICY "Couriers view items of deliverable orders" ON public.order_items
  FOR SELECT TO public
  USING (
    public.has_role(auth.uid(), 'courier'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.status = 'paid'
        AND (
          o.delivery_status IN ('unassigned','assigned','picked_up','in_transit')
          OR o.courier_id = auth.uid()
        )
    )
  );

-- Couriers can view shop info (pickup address) of orders they handle
DROP POLICY IF EXISTS "Couriers view shops of their orders" ON public.shops;
CREATE POLICY "Couriers view shops of their orders" ON public.shops
  FOR SELECT TO public
  USING (
    public.has_role(auth.uid(), 'courier'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.shop_id = shops.id
        AND o.status = 'paid'
        AND (o.courier_id = auth.uid() OR o.delivery_status = 'unassigned')
    )
  );

-- RPC: courier claims an order
CREATE OR REPLACE FUNCTION public.courier_claim_order(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'courier'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  UPDATE public.orders
     SET courier_id = v_user, delivery_status = 'assigned'
   WHERE id = p_order_id
     AND status = 'paid'
     AND (courier_id IS NULL OR courier_id = v_user)
     AND delivery_status IN ('unassigned','assigned');
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande indisponible'; END IF;
END; $$;

-- RPC: confirm pickup with vendor code
CREATE OR REPLACE FUNCTION public.courier_confirm_pickup(p_order_id uuid, p_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_code text;
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'courier'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  SELECT pickup_code INTO v_code FROM public.orders
   WHERE id = p_order_id AND courier_id = v_user;
  IF v_code IS NULL THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF trim(p_code) <> v_code THEN RAISE EXCEPTION 'Code de prise en charge invalide'; END IF;
  UPDATE public.orders
     SET delivery_status = 'picked_up', picked_up_at = now()
   WHERE id = p_order_id AND courier_id = v_user;
END; $$;

-- RPC: courier sets in_transit
CREATE OR REPLACE FUNCTION public.courier_set_in_transit(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'courier'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  UPDATE public.orders
     SET delivery_status = 'in_transit'
   WHERE id = p_order_id AND courier_id = v_user
     AND delivery_status = 'picked_up';
  IF NOT FOUND THEN RAISE EXCEPTION 'Action impossible'; END IF;
END; $$;

-- RPC: confirm delivery with buyer code
CREATE OR REPLACE FUNCTION public.courier_confirm_delivery(p_order_id uuid, p_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_code text; v_status delivery_status;
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'courier'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  SELECT delivery_code, delivery_status INTO v_code, v_status FROM public.orders
   WHERE id = p_order_id AND courier_id = v_user;
  IF v_code IS NULL THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF v_status NOT IN ('picked_up','in_transit') THEN
    RAISE EXCEPTION 'Le colis doit d''abord être pris en charge';
  END IF;
  IF trim(p_code) <> v_code THEN RAISE EXCEPTION 'Code de livraison invalide'; END IF;
  UPDATE public.orders
     SET delivery_status = 'delivered', delivered_at = now()
   WHERE id = p_order_id AND courier_id = v_user;
END; $$;

-- RPC: signup as courier (called after auth.signUp)
CREATE OR REPLACE FUNCTION public.assign_courier_role()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user, 'courier'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END; $$;
