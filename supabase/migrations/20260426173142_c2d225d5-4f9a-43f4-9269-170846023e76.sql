-- 1. Add commission_rate + payment info to shops
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS payment_operator text,
  ADD COLUMN IF NOT EXISTS payment_number text;

-- 2. Order status enum
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Cart items
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  size product_size NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id, size)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cart" ON public.cart_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cart" ON public.cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cart" ON public.cart_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own cart" ON public.cart_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_cart_items_updated
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Orders (table only, policies after order_items exists)
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference text NOT NULL UNIQUE,
  status order_status NOT NULL DEFAULT 'pending',
  total_gnf bigint NOT NULL DEFAULT 0,
  payment_method text,
  payment_operator text,
  payment_reference text,
  customer_name text,
  customer_phone text,
  customer_address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Order items
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  title text NOT NULL,
  image_url text,
  size product_size NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_gnf bigint NOT NULL,
  commission_rate numeric(5,2) NOT NULL DEFAULT 10.00,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_order_items_shop ON public.order_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- 6. Now create cross-referencing policies
CREATE POLICY "Users view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all orders" ON public.orders
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all orders" ON public.orders
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Shop owners view orders with their items" ON public.orders
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.shops s ON s.id = oi.shop_id
    WHERE oi.order_id = orders.id AND s.owner_id = auth.uid()
  ));

CREATE POLICY "Users view items of own orders" ON public.order_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  ));
CREATE POLICY "Users insert items into own orders" ON public.order_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  ));
CREATE POLICY "Admins manage all order items" ON public.order_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Shop owners view their order items" ON public.order_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.shops s WHERE s.id = order_items.shop_id AND s.owner_id = auth.uid()
  ));

-- 7. Payouts
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  amount_gnf bigint NOT NULL CHECK (amount_gnf > 0),
  method text,
  reference text,
  note text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payouts" ON public.payouts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Shop owners view their payouts" ON public.payouts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.shops s WHERE s.id = payouts.shop_id AND s.owner_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_payouts_shop ON public.payouts(shop_id);