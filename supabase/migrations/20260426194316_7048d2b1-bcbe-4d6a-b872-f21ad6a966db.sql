-- Trigger qui empêche un vendeur (non-admin) de posséder plus d'une boutique
CREATE OR REPLACE FUNCTION public.enforce_single_shop_per_vendor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(NEW.owner_id, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.shops
    WHERE owner_id = NEW.owner_id
      AND id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Un vendeur ne peut posséder qu''une seule boutique';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_shop_per_vendor ON public.shops;
CREATE TRIGGER trg_enforce_single_shop_per_vendor
BEFORE INSERT ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_shop_per_vendor();