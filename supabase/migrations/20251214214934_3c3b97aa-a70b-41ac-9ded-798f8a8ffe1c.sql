-- Ajouter la colonne compétences techniques au format JSONB (liste de strings)
ALTER TABLE public.rh_competencies 
ADD COLUMN IF NOT EXISTS competences_techniques TEXT[] DEFAULT '{}';

-- Créer une table pour stocker les compétences techniques disponibles
CREATE TABLE IF NOT EXISTS public.rh_competences_catalogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(agency_id, label)
);

-- Ajouter RLS
ALTER TABLE public.rh_competences_catalogue ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "N2+ can view own agency competences catalogue"
  ON public.rh_competences_catalogue FOR SELECT
  USING (
    agency_id IS NULL -- defaults
    OR agency_id = get_user_agency_id(auth.uid())
    OR has_min_global_role(auth.uid(), 3)
  );

CREATE POLICY "N2+ can manage own agency competences catalogue"
  ON public.rh_competences_catalogue FOR ALL
  USING (
    (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
    OR has_min_global_role(auth.uid(), 3)
  )
  WITH CHECK (
    (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
    OR has_min_global_role(auth.uid(), 3)
  );

-- Insérer les compétences par défaut (sans agency_id = disponibles pour toutes les agences)
INSERT INTO public.rh_competences_catalogue (agency_id, label, is_default) VALUES
  (NULL, 'Plomberie', true),
  (NULL, 'Electricité', true),
  (NULL, 'Vitrerie', true),
  (NULL, 'Menuiserie', true),
  (NULL, 'Serrurerie', true),
  (NULL, 'Peinture', true),
  (NULL, 'Placo', true),
  (NULL, 'Carrelage / Faïence', true)
ON CONFLICT DO NOTHING;