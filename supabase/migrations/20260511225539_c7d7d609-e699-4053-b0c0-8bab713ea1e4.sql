-- Allow the vendor (shop owner) to confirm pickup by entering the courier's pickup code.
CREATE OR REPLACE FUNCTION public.vendor_confirm_pickup(p_order_id uuid, p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_code text;
  v_status delivery_status;
  v_courier uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- The caller must own at least one shop present in the order's items
  IF NOT public.shop_owner_in_order(p_order_id, v_user) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT pickup_code, delivery_status, courier_id
    INTO v_code, v_status, v_courier
  FROM public.orders
  WHERE id = p_order_id;

  IF v_code IS NULL THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  IF v_courier IS NULL OR v_status <> 'assigned' THEN
    RAISE EXCEPTION 'Aucun livreur assigné à cette commande';
  END IF;

  IF trim(p_code) <> v_code THEN
    RAISE EXCEPTION 'Code de récupération invalide';
  END IF;

  UPDATE public.orders
     SET delivery_status = 'picked_up', picked_up_at = now()
   WHERE id = p_order_id;
END;
$$;