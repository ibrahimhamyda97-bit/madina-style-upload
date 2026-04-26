
CREATE OR REPLACE FUNCTION public.enforce_admin_role_exclusivity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    -- Devient admin : supprimer tous les autres rôles existants
    DELETE FROM public.user_roles
    WHERE user_id = NEW.user_id AND role <> 'admin';
  ELSE
    -- Tente d'ajouter un autre rôle : refuser si l'utilisateur est admin
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'admin') THEN
      RAISE EXCEPTION 'Un administrateur ne peut pas avoir d''autres rôles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_admin_role_exclusivity ON public.user_roles;
CREATE TRIGGER trg_enforce_admin_role_exclusivity
BEFORE INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_role_exclusivity();
