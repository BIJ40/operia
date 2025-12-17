-- Table pour stocker la note du kanban (une seule note partagée)
CREATE TABLE public.kanban_postit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insérer une ligne unique
INSERT INTO public.kanban_postit (id, content) VALUES (gen_random_uuid(), '');

-- Enable RLS
ALTER TABLE public.kanban_postit ENABLE ROW LEVEL SECURITY;

-- Tout le monde avec accès au module peut lire
CREATE POLICY "Users with apogee_tickets can read postit"
ON public.kanban_postit
FOR SELECT
TO authenticated
USING (true);

-- Tout le monde avec accès au module peut modifier
CREATE POLICY "Users with apogee_tickets can update postit"
ON public.kanban_postit
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);