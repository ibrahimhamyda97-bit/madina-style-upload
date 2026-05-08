CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'crown',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members viewable by everyone"
ON public.team_members FOR SELECT USING (true);

CREATE POLICY "Admins manage team members"
ON public.team_members FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.team_members (name, role, icon, position) VALUES
('SAMIROU', 'Directeur Général (DG)', 'crown', 0),
('KOLLET KEITA', 'Modérateur', 'shield', 1);