-- Fix infinite recursion between RLS policies on shops, orders, order_items.
-- Root cause: SELECT policies cross-reference each other via subqueries,
-- and Postgres evaluates ALL permissive policies (OR-ed), triggering recursion
-- even for users (admins, buyers) that should be authorized via simpler rules.

-- 1) Helper: check if a courier is involved in an order touching a given shop.
CREATE OR REPLACE FUNCTION public.courier_handles_shop(_shop_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.shop_id = _shop_id
      AND o.status = 'paid'
      AND (o.courier_id = _user_id OR o.delivery_status = 'unassigned')
  );
$$;

-- 2) Helper: check if order is deliverable by a given courier.
CREATE OR REPLACE FUNCTION public.courier_can_see_order(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = _order_id
      AND o.status = 'paid'
      AND (
        o.delivery_status IN ('unassigned','assigned','picked_up','in_transit')
        OR o.courier_id = _user_id
      )
  );
$$;

-- 3) Helper: check if a shop owner has items in a given order.
CREATE OR REPLACE FUNCTION public.shop_owner_in_order(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.shops s ON s.id = oi.shop_id
    WHERE oi.order_id = _order_id
      AND s.owner_id = _user_id
  );
$$;

-- 4) Replace the recursive policies with non-recursive equivalents.

-- shops: courier policy
DROP POLICY IF EXISTS "Couriers view shops of their orders" ON public.shops;
CREATE POLICY "Couriers view shops of their orders"
ON public.shops
FOR SELECT
USING (
  public.has_role(auth.uid(), 'courier'::app_role)
  AND public.courier_handles_shop(id, auth.uid())
);

-- order_items: courier policy
DROP POLICY IF EXISTS "Couriers view items of deliverable orders" ON public.order_items;
CREATE POLICY "Couriers view items of deliverable orders"
ON public.order_items
FOR SELECT
USING (
  public.has_role(auth.uid(), 'courier'::app_role)
  AND public.courier_can_see_order(order_id, auth.uid())
);

-- orders: shop owner policy
DROP POLICY IF EXISTS "Shop owners view orders with their items" ON public.orders;
CREATE POLICY "Shop owners view orders with their items"
ON public.orders
FOR SELECT
USING (public.shop_owner_in_order(id, auth.uid()));