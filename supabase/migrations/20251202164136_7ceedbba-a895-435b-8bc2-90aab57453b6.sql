-- Table pour les paramètres de permissions des tickets Apogée
CREATE TABLE public.apogee_ticket_field_permissions (
  id TEXT PRIMARY KEY DEFAULT 'default',
  -- Qui peut supprimer un ticket (array de rôles: developer, tester, franchiseur)
  can_delete_ticket TEXT[] DEFAULT ARRAY['franchiseur']::TEXT[],
  -- Qui peut éditer H min / H max (estimation)
  can_edit_estimation TEXT[] DEFAULT ARRAY['developer']::TEXT[],
  -- Qui peut éditer owner_side (PEC)
  can_edit_owner_side TEXT[] DEFAULT ARRAY['developer', 'franchiseur']::TEXT[],
  -- Qui peut éditer la priorité (heat_priority)
  can_edit_priority TEXT[] DEFAULT ARRAY['developer', 'tester', 'franchiseur']::TEXT[],
  -- Qui peut éditer le module
  can_edit_module TEXT[] DEFAULT ARRAY['developer', 'franchiseur']::TEXT[],
  -- Qui peut qualifier un ticket (AI)
  can_qualify_ticket TEXT[] DEFAULT ARRAY['developer', 'franchiseur']::TEXT[],
  -- Qui peut fusionner des tickets (doublons)
  can_merge_tickets TEXT[] DEFAULT ARRAY['developer', 'franchiseur']::TEXT[],
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insérer la config par défaut
INSERT INTO public.apogee_ticket_field_permissions (id) VALUES ('default');

-- RLS
ALTER TABLE public.apogee_ticket_field_permissions ENABLE ROW LEVEL SECURITY;

-- Lecture pour tous les utilisateurs avec module apogee_tickets ou admin
CREATE POLICY "Users with apogee_tickets module can read permissions" 
ON public.apogee_ticket_field_permissions FOR SELECT 
USING (
  (SELECT (((profiles.enabled_modules -> 'apogee_tickets'::text) ->> 'enabled'::text))::boolean
   FROM profiles WHERE profiles.id = auth.uid()) = true
  OR has_min_global_role(auth.uid(), 5)
);

-- Modification uniquement par les admins
CREATE POLICY "Only admins can update permissions" 
ON public.apogee_ticket_field_permissions FOR UPDATE 
USING (has_min_global_role(auth.uid(), 5));

-- Trigger pour updated_at
CREATE TRIGGER update_apogee_ticket_field_permissions_updated_at
  BEFORE UPDATE ON public.apogee_ticket_field_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();