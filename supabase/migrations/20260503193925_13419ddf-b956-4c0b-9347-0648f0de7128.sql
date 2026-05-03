
-- 1. Table courier_applications (validation des inscriptions livreur)
CREATE TYPE public.courier_app_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.courier_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  status public.courier_app_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own courier application" ON public.courier_applications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage courier applications" ON public.courier_applications
  FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Moderators manage courier applications" ON public.courier_applications
  FOR ALL USING (public.has_role(auth.uid(),'moderator'::app_role));

CREATE TRIGGER tg_courier_app_updated
  BEFORE UPDATE ON public.courier_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Modifier assign_courier_role : crée une demande au lieu d'attribuer directement
CREATE OR REPLACE FUNCTION public.assign_courier_role()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  INSERT INTO public.courier_applications (user_id, status)
  VALUES (v_user, 'pending')
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'pending', rejection_reason = NULL, reviewed_by = NULL, reviewed_at = NULL;
END; $$;

-- 3. RPC: examiner une demande livreur (admin ou modérateur)
CREATE OR REPLACE FUNCTION public.review_courier_application(p_user_id uuid, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_reviewer uuid := auth.uid();
BEGIN
  IF v_reviewer IS NULL OR (
    NOT public.has_role(v_reviewer,'admin'::app_role)
    AND NOT public.has_role(v_reviewer,'moderator'::app_role)
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  IF p_approve THEN
    UPDATE public.courier_applications
       SET status='approved', reviewed_by=v_reviewer, reviewed_at=now(), rejection_reason=NULL
     WHERE user_id = p_user_id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'courier'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    UPDATE public.courier_applications
       SET status='rejected', reviewed_by=v_reviewer, reviewed_at=now(), rejection_reason=p_reason
     WHERE user_id = p_user_id;
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = 'courier'::app_role;
  END IF;
END; $$;

-- 4. Politiques pour le rôle modérateur
CREATE POLICY "Moderators view all shops" ON public.shops
  FOR SELECT USING (public.has_role(auth.uid(),'moderator'::app_role));
CREATE POLICY "Moderators update shops" ON public.shops
  FOR UPDATE USING (public.has_role(auth.uid(),'moderator'::app_role));

CREATE POLICY "Moderators view all products" ON public.products
  FOR SELECT USING (public.has_role(auth.uid(),'moderator'::app_role));
CREATE POLICY "Moderators update products" ON public.products
  FOR UPDATE USING (public.has_role(auth.uid(),'moderator'::app_role));

CREATE POLICY "Moderators view all orders" ON public.orders
  FOR SELECT USING (public.has_role(auth.uid(),'moderator'::app_role));
CREATE POLICY "Moderators view all order items" ON public.order_items
  FOR SELECT USING (public.has_role(auth.uid(),'moderator'::app_role));

CREATE POLICY "Moderators view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(),'moderator'::app_role));

-- 5. Storage : admin et modérateur peuvent lire les pièces d'identité
CREATE POLICY "Admin reads ID docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'identity-documents' AND public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Moderator reads ID docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'identity-documents' AND public.has_role(auth.uid(),'moderator'::app_role));
