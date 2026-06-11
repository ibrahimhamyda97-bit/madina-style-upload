
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.payout_request_status AS ENUM ('pending','approved','rejected','confirmed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payout_requester_type AS ENUM ('shop','courier');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  requester_type public.payout_requester_type NOT NULL,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  amount_gnf bigint NOT NULL CHECK (amount_gnf > 0),
  payout_method text NOT NULL,
  payout_account text NOT NULL,
  note text,
  status public.payout_request_status NOT NULL DEFAULT 'pending',
  admin_note text,
  payment_reference text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_requester ON public.payout_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_shop ON public.payout_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);

GRANT SELECT, INSERT, UPDATE ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all payout requests" ON public.payout_requests
  FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Requester views own payout requests" ON public.payout_requests
  FOR SELECT USING (auth.uid() = requester_id);

CREATE TRIGGER trg_payout_requests_updated
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Balance helpers ----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shop_available_balance(_shop_id uuid)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH earnings AS (
    SELECT COALESCE(SUM(
      oi.unit_price_gnf * oi.quantity
      - ROUND(oi.unit_price_gnf * oi.quantity * (oi.commission_rate / 100.0))
    ),0)::bigint AS net_due
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.shop_id = _shop_id AND o.status = 'paid'
  ),
  paid AS (
    SELECT COALESCE(SUM(amount_gnf),0)::bigint AS paid
    FROM public.payouts WHERE shop_id = _shop_id
  ),
  reserved AS (
    SELECT COALESCE(SUM(amount_gnf),0)::bigint AS reserved
    FROM public.payout_requests
    WHERE shop_id = _shop_id AND status IN ('pending','approved','confirmed')
  )
  SELECT (earnings.net_due - paid.paid - reserved.reserved)::bigint
  FROM earnings, paid, reserved;
$$;

CREATE OR REPLACE FUNCTION public.courier_available_balance(_courier_id uuid)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH earnings AS (
    SELECT COALESCE(SUM(oi.shipping_fee_gnf * oi.quantity),0)::bigint AS total
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.courier_id = _courier_id
      AND o.delivery_status = 'delivered'
  ),
  reserved AS (
    SELECT COALESCE(SUM(amount_gnf),0)::bigint AS reserved
    FROM public.payout_requests
    WHERE requester_id = _courier_id
      AND requester_type = 'courier'
      AND status IN ('pending','approved','confirmed')
  )
  SELECT (earnings.total - reserved.reserved)::bigint FROM earnings, reserved;
$$;

-- RPCs --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.request_shop_payout(
  p_shop_id uuid,
  p_amount bigint,
  p_method text,
  p_account text,
  p_note text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_balance bigint;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  SELECT owner_id INTO v_owner FROM public.shops WHERE id = p_shop_id;
  IF v_owner IS NULL OR v_owner <> v_user THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  v_balance := public.shop_available_balance(p_shop_id);
  IF p_amount > v_balance THEN RAISE EXCEPTION 'Solde insuffisant (disponible: % GNF)', v_balance; END IF;
  INSERT INTO public.payout_requests (requester_id, requester_type, shop_id, amount_gnf, payout_method, payout_account, note)
  VALUES (v_user, 'shop', p_shop_id, p_amount, p_method, p_account, p_note)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.request_courier_payout(
  p_amount bigint,
  p_method text,
  p_account text,
  p_note text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_balance bigint;
  v_id uuid;
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user,'courier'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  v_balance := public.courier_available_balance(v_user);
  IF p_amount > v_balance THEN RAISE EXCEPTION 'Solde insuffisant (disponible: % GNF)', v_balance; END IF;
  INSERT INTO public.payout_requests (requester_id, requester_type, amount_gnf, payout_method, payout_account, note)
  VALUES (v_user, 'courier', p_amount, p_method, p_account, p_note)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.review_payout_request(
  p_request_id uuid,
  p_approve boolean,
  p_payment_reference text DEFAULT NULL,
  p_admin_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user,'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  UPDATE public.payout_requests
     SET status = CASE WHEN p_approve THEN 'approved'::payout_request_status ELSE 'rejected'::payout_request_status END,
         payment_reference = COALESCE(p_payment_reference, payment_reference),
         admin_note = COALESCE(p_admin_note, admin_note),
         reviewed_by = v_user,
         reviewed_at = now()
   WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable ou déjà traitée'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.confirm_payout_reception(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_req public.payout_requests%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  SELECT * INTO v_req FROM public.payout_requests WHERE id = p_request_id;
  IF v_req.id IS NULL OR v_req.requester_id <> v_user THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF v_req.status <> 'approved' THEN RAISE EXCEPTION 'La demande doit être approuvée'; END IF;

  UPDATE public.payout_requests
     SET status = 'confirmed', confirmed_at = now()
   WHERE id = p_request_id;

  -- Mirror into payouts ledger for shop requests so the historical balance reflects it
  IF v_req.requester_type = 'shop' AND v_req.shop_id IS NOT NULL THEN
    INSERT INTO public.payouts (shop_id, amount_gnf, method, reference, note, created_by)
    VALUES (v_req.shop_id, v_req.amount_gnf, v_req.payout_method, v_req.payment_reference, COALESCE(v_req.note,'Demande de retrait confirmée'), COALESCE(v_req.reviewed_by, v_req.requester_id));
  END IF;
END; $$;
