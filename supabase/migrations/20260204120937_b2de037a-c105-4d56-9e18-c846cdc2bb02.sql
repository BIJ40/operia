-- =====================================================
-- 1. SÉCURISER rh_competences_catalogue - Accès RH uniquement
-- =====================================================

-- Supprimer toutes les anciennes politiques sur la table
DROP POLICY IF EXISTS "anon_can_read_catalogue" ON public.rh_competences_catalogue;
DROP POLICY IF EXISTS "read_competences_catalogue" ON public.rh_competences_catalogue;
DROP POLICY IF EXISTS "insert_competences_catalogue" ON public.rh_competences_catalogue;
DROP POLICY IF EXISTS "delete_competences_catalogue" ON public.rh_competences_catalogue;
DROP POLICY IF EXISTS "Anyone can read competences catalogue" ON public.rh_competences_catalogue;
DROP POLICY IF EXISTS "Agency users can read their competences" ON public.rh_competences_catalogue;
DROP POLICY IF EXISTS "Agency admins can insert competences" ON public.rh_competences_catalogue;
DROP POLICY IF EXISTS "Agency admins can delete competences" ON public.rh_competences_catalogue;

-- S'assurer que RLS est activé
ALTER TABLE public.rh_competences_catalogue ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : RH/N2+ de l'agence ou N5+
CREATE POLICY "rh_competences_catalogue_select" ON public.rh_competences_catalogue
FOR SELECT TO authenticated
USING (
  -- N5+ voit tout
  public.has_min_global_role(auth.uid(), 5)
  OR
  -- Compétences par défaut (sans agence) : visibles par tous les RH/N2+
  (agency_id IS NULL AND (
    public.has_min_global_role(auth.uid(), 2)
    OR public.has_agency_rh_role(auth.uid(), public.get_user_agency_id(auth.uid()))
  ))
  OR
  -- Compétences agence : visibles par RH/N2+ de cette agence
  (agency_id IS NOT NULL AND (
    (public.has_min_global_role(auth.uid(), 2) AND public.get_user_agency_id(auth.uid()) = agency_id)
    OR public.has_agency_rh_role(auth.uid(), agency_id)
  ))
);

-- Politique d'insertion : RH/N2+ de l'agence ou N5+
CREATE POLICY "rh_competences_catalogue_insert" ON public.rh_competences_catalogue
FOR INSERT TO authenticated
WITH CHECK (
  public.has_min_global_role(auth.uid(), 5)
  OR
  (agency_id IS NOT NULL AND (
    (public.has_min_global_role(auth.uid(), 2) AND public.get_user_agency_id(auth.uid()) = agency_id)
    OR public.has_agency_rh_role(auth.uid(), agency_id)
  ))
);

-- Politique de suppression : RH/N2+ de l'agence ou N5+ (seulement non-defaults)
CREATE POLICY "rh_competences_catalogue_delete" ON public.rh_competences_catalogue
FOR DELETE TO authenticated
USING (
  is_default = false
  AND (
    public.has_min_global_role(auth.uid(), 5)
    OR
    (agency_id IS NOT NULL AND (
      (public.has_min_global_role(auth.uid(), 2) AND public.get_user_agency_id(auth.uid()) = agency_id)
      OR public.has_agency_rh_role(auth.uid(), agency_id)
    ))
  )
);

-- =====================================================
-- 2. SÉCURISER blocks - Créer une vue publique séparée
-- =====================================================

-- Supprimer les anciennes politiques publiques sur blocks
DROP POLICY IF EXISTS "public_blocks_read" ON public.blocks;
DROP POLICY IF EXISTS "anon_can_read_blocks" ON public.blocks;
DROP POLICY IF EXISTS "Anyone can read blocks" ON public.blocks;
DROP POLICY IF EXISTS "Blocks are viewable by everyone" ON public.blocks;
DROP POLICY IF EXISTS "blocks_public_read" ON public.blocks;

-- S'assurer que RLS est activé
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Politique de lecture pour utilisateurs authentifiés
CREATE POLICY "blocks_authenticated_read" ON public.blocks
FOR SELECT TO authenticated
USING (true);

-- Politique d'écriture pour N3+
CREATE POLICY "blocks_write_n3plus" ON public.blocks
FOR ALL TO authenticated
USING (public.has_min_global_role(auth.uid(), 3))
WITH CHECK (public.has_min_global_role(auth.uid(), 3));

-- Créer une vue sécurisée pour l'accès public (guide-apogee)
-- Cette vue expose uniquement les colonnes non sensibles
DROP VIEW IF EXISTS public.blocks_public;

CREATE VIEW public.blocks_public 
WITH (security_invoker = false, security_barrier = true) AS
SELECT 
  id,
  type,
  title,
  slug,
  content,
  parent_id,
  "order",
  icon,
  color_preset,
  hide_from_sidebar,
  hide_title,
  attachments,
  content_type,
  tips_type,
  summary,
  show_summary,
  is_in_progress,
  completed_at,
  content_updated_at,
  is_empty
FROM public.blocks
WHERE hide_from_sidebar IS NOT TRUE;

-- Accorder l'accès à la vue publique aux anonymes
GRANT SELECT ON public.blocks_public TO anon;
GRANT SELECT ON public.blocks_public TO authenticated;