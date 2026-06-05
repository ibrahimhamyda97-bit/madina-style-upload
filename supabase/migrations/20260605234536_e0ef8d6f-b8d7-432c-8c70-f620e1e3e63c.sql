
REVOKE EXECUTE ON FUNCTION public.get_available_courier_orders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_available_courier_order_items(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_courier_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_courier_order_items(uuid[]) TO authenticated;
