DO $$
DECLARE v_shop uuid := 'a70440a9-6033-4570-a622-c14d8a79607a';
BEGIN
  DELETE FROM public.cart_items
   WHERE product_id IN (SELECT id FROM public.products WHERE shop_id = v_shop);
  DELETE FROM public.product_images
   WHERE product_id IN (SELECT id FROM public.products WHERE shop_id = v_shop);
  DELETE FROM public.products WHERE shop_id = v_shop;
  DELETE FROM public.payouts WHERE shop_id = v_shop;
  DELETE FROM public.shops WHERE id = v_shop;
END $$;