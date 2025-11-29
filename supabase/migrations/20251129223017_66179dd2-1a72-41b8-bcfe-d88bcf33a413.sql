-- Table de configuration des owner_side (Porté par)
CREATE TABLE public.apogee_owner_sides (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT DEFAULT 'gray',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.apogee_owner_sides ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users with apogee_tickets module can read owner_sides"
ON public.apogee_owner_sides
FOR SELECT
USING (
  (SELECT ((profiles.enabled_modules->'apogee_tickets'->>'enabled')::boolean) FROM profiles WHERE profiles.id = auth.uid()) = true
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "Admins can manage owner_sides"
ON public.apogee_owner_sides
FOR ALL
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

-- Seed data with default colors
INSERT INTO public.apogee_owner_sides (id, label, color, display_order) VALUES
  ('HC', 'HelpConfort', 'blue', 1),
  ('APOGEE', 'Apogée', 'purple', 2),
  ('PARTAGE', 'Partagé', 'amber', 3);