
-- Sub-competencies system

-- 1. Table sous-compétences
CREATE TABLE IF NOT EXISTS public.competence_sub_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  univers_id UUID NOT NULL REFERENCES public.univers_catalog(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique index handling NULL agency_id
CREATE UNIQUE INDEX idx_sub_skills_unique_label
ON public.competence_sub_skills (univers_id, COALESCE(agency_id, '00000000-0000-0000-0000-000000000000'::uuid), label);

-- 2. Junction table
CREATE TABLE IF NOT EXISTS public.collaborator_sub_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  sub_skill_id UUID NOT NULL REFERENCES public.competence_sub_skills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collaborator_id, sub_skill_id)
);

-- 3. RLS
ALTER TABLE public.competence_sub_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborator_sub_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_skills_select" ON public.competence_sub_skills
FOR SELECT TO authenticated
USING (
  agency_id IS NULL
  OR agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "sub_skills_insert" ON public.competence_sub_skills
FOR INSERT TO authenticated
WITH CHECK (
  (agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()) AND has_min_global_role(auth.uid(), 2))
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "sub_skills_delete" ON public.competence_sub_skills
FOR DELETE TO authenticated
USING (
  is_default = false
  AND (
    (agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()) AND has_min_global_role(auth.uid(), 2))
    OR has_min_global_role(auth.uid(), 5)
  )
);

CREATE POLICY "collab_sub_skills_select" ON public.collaborator_sub_skills
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM collaborators c
    WHERE c.id = collaborator_id
    AND (c.agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()) OR has_min_global_role(auth.uid(), 5))
  )
);

CREATE POLICY "collab_sub_skills_insert" ON public.collaborator_sub_skills
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM collaborators c
    WHERE c.id = collaborator_id
    AND (c.agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()) AND has_min_global_role(auth.uid(), 2))
  )
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "collab_sub_skills_delete" ON public.collaborator_sub_skills
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM collaborators c
    WHERE c.id = collaborator_id
    AND (c.agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()) AND has_min_global_role(auth.uid(), 2))
  )
  OR has_min_global_role(auth.uid(), 5)
);

-- 4. Indexes
CREATE INDEX idx_sub_skills_univers ON public.competence_sub_skills(univers_id);
CREATE INDEX idx_sub_skills_agency ON public.competence_sub_skills(agency_id);
CREATE INDEX idx_collab_sub_skills_collab ON public.collaborator_sub_skills(collaborator_id);
CREATE INDEX idx_collab_sub_skills_skill ON public.collaborator_sub_skills(sub_skill_id);

-- 5. Update univers_catalog
UPDATE public.univers_catalog SET is_active = false WHERE code IN (
  'chauffage', 'peinture', 'carrelage', 'recherche_fuite', 'multiservices', 'pmr', 'platrerie'
);

INSERT INTO public.univers_catalog (code, label, is_active, sort_order)
VALUES ('amelioration_logement', 'Amélioration du logement', true, 2)
ON CONFLICT DO NOTHING;

UPDATE public.univers_catalog SET sort_order = 1 WHERE code = 'renovation';
UPDATE public.univers_catalog SET sort_order = 2 WHERE code = 'amelioration_logement';
UPDATE public.univers_catalog SET sort_order = 3 WHERE code = 'volet_roulant';
UPDATE public.univers_catalog SET sort_order = 4 WHERE code = 'electricite';
UPDATE public.univers_catalog SET sort_order = 5 WHERE code = 'plomberie';
UPDATE public.univers_catalog SET sort_order = 6 WHERE code = 'serrurerie';
UPDATE public.univers_catalog SET sort_order = 7 WHERE code = 'vitrerie';
UPDATE public.univers_catalog SET sort_order = 8 WHERE code = 'menuiserie';
