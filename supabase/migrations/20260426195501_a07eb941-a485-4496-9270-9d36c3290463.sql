DO $$
DECLARE v_user uuid := 'b4a886c1-753a-4e3c-b2e5-2fc97ffc9746';
DECLARE v_shop_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_shop_ids FROM public.shops WHERE owner_id = v_user;

  -- Cart
  DELETE FROM public.cart_items WHERE user_id = v_user;

  -- Order items + orders du user
  DELETE FROM public.order_items
   WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = v_user);
  DELETE FROM public.orders WHERE user_id = v_user;

  -- Si un livreur, désassigner ses livraisons
  UPDATE public.orders SET courier_id = NULL WHERE courier_id = v_user;

  -- Boutiques restantes éventuelles + dépendances
  IF v_shop_ids IS NOT NULL THEN
    DELETE FROM public.cart_items
     WHERE product_id IN (SELECT id FROM public.products WHERE shop_id = ANY(v_shop_ids));
    DELETE FROM public.product_images
     WHERE product_id IN (SELECT id FROM public.products WHERE shop_id = ANY(v_shop_ids));
    DELETE FROM public.products WHERE shop_id = ANY(v_shop_ids);
    DELETE FROM public.payouts WHERE shop_id = ANY(v_shop_ids);
    DELETE FROM public.shops WHERE id = ANY(v_shop_ids);
  END IF;

  -- Rôles + profil
  DELETE FROM public.user_roles WHERE user_id = v_user;
  DELETE FROM public.profiles WHERE id = v_user;

  -- Compte d'authentification
  DELETE FROM auth.users WHERE id = v_user;
END $$;