-- Table pour stocker les tags personnalisés créés par les utilisateurs
CREATE TABLE public.apogee_ticket_tags (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT DEFAULT 'purple',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Insérer les tags par défaut
INSERT INTO public.apogee_ticket_tags (id, label, color) VALUES
  ('BUG', 'BUG', 'red'),
  ('EVO', 'EVO', 'blue'),
  ('NTH', 'NTH', 'gray')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.apogee_ticket_tags ENABLE ROW LEVEL SECURITY;

-- Policies - lecture pour tous les utilisateurs avec accès au module
CREATE POLICY "Users with apogee_tickets module can view tags"
  ON public.apogee_ticket_tags
  FOR SELECT
  USING (
    has_min_global_role(auth.uid(), 5)
    OR (
      SELECT (p.enabled_modules->'apogee_tickets'->>'enabled')::boolean
      FROM profiles p WHERE p.id = auth.uid()
    )
  );

-- Insertion pour tous les utilisateurs avec accès au module
CREATE POLICY "Users with apogee_tickets module can create tags"
  ON public.apogee_ticket_tags
  FOR INSERT
  WITH CHECK (
    has_min_global_role(auth.uid(), 5)
    OR (
      SELECT (p.enabled_modules->'apogee_tickets'->>'enabled')::boolean
      FROM profiles p WHERE p.id = auth.uid()
    )
  );