
-- =====================================================
-- PHASE 1: MODULE RH & PARC - SOCLE COLLABORATEURS
-- =====================================================

-- 1. Enrichir la table agency_collaborators avec les nouveaux champs
ALTER TABLE agency_collaborators 
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'AUTRE',
  ADD COLUMN IF NOT EXISTS hiring_date DATE,
  ADD COLUMN IF NOT EXISTS leaving_date DATE,
  ADD COLUMN IF NOT EXISTS apogee_user_id INTEGER,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS social_security_number TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
  ADD COLUMN IF NOT EXISTS emergency_phone TEXT;

-- 2. Créer un index sur apogee_user_id pour les jointures avec l'API Apogée
CREATE INDEX IF NOT EXISTS idx_agency_collaborators_apogee_user_id 
  ON agency_collaborators(apogee_user_id) WHERE apogee_user_id IS NOT NULL;

-- 3. Créer la table pour les rôles RH optionnels par agence
CREATE TABLE IF NOT EXISTS agency_rh_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by UUID REFERENCES profiles(id),
  UNIQUE(agency_id, user_id)
);

-- Enable RLS on agency_rh_roles
ALTER TABLE agency_rh_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function to check if user has RH role in agency
CREATE OR REPLACE FUNCTION public.has_agency_rh_role(_user_id UUID, _agency_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM agency_rh_roles
    WHERE user_id = _user_id AND agency_id = _agency_id
  )
$$;

-- 5. Security definer function to check if user is Dirigeant (N2+) of agency
CREATE OR REPLACE FUNCTION public.is_agency_dirigeant(_user_id UUID, _agency_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id
    AND agency_id = _agency_id
    AND has_min_global_role(_user_id, 2)
  )
$$;

-- 6. RLS Policies for agency_rh_roles
-- Only Dirigeant (N2+) can manage RH roles in their agency
CREATE POLICY "agency_rh_roles_select" ON agency_rh_roles
  FOR SELECT USING (
    has_min_global_role(auth.uid(), 3) -- Franchiseur+ can see all
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
  );

CREATE POLICY "agency_rh_roles_insert" ON agency_rh_roles
  FOR INSERT WITH CHECK (
    has_min_global_role(auth.uid(), 3) -- Franchiseur+ can manage all
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
  );

CREATE POLICY "agency_rh_roles_delete" ON agency_rh_roles
  FOR DELETE USING (
    has_min_global_role(auth.uid(), 3)
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
  );

-- 7. Update RLS policies on agency_collaborators for enhanced access control
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view agency collaborators" ON agency_collaborators;
DROP POLICY IF EXISTS "Users can insert agency collaborators" ON agency_collaborators;
DROP POLICY IF EXISTS "Users can update agency collaborators" ON agency_collaborators;
DROP POLICY IF EXISTS "delete_agency_collaborators" ON agency_collaborators;

-- New comprehensive policies
-- SELECT: Dirigeant/RH of agency can see all, employees can see their own record
CREATE POLICY "collaborators_select" ON agency_collaborators
  FOR SELECT USING (
    has_min_global_role(auth.uid(), 3) -- Franchiseur+ can see all (for aggregated stats)
    OR (
      agency_id = get_user_agency_id(auth.uid()) 
      AND (
        has_min_global_role(auth.uid(), 2) -- Dirigeant
        OR has_agency_rh_role(auth.uid(), agency_id) -- RH role
        OR user_id = auth.uid() -- Own record
      )
    )
  );

-- INSERT: Only Dirigeant or RH of agency
CREATE POLICY "collaborators_insert" ON agency_collaborators
  FOR INSERT WITH CHECK (
    has_min_global_role(auth.uid(), 3)
    OR (
      agency_id = get_user_agency_id(auth.uid())
      AND (
        has_min_global_role(auth.uid(), 2)
        OR has_agency_rh_role(auth.uid(), agency_id)
      )
    )
  );

-- UPDATE: Dirigeant or RH of agency
CREATE POLICY "collaborators_update" ON agency_collaborators
  FOR UPDATE USING (
    has_min_global_role(auth.uid(), 3)
    OR (
      agency_id = get_user_agency_id(auth.uid())
      AND (
        has_min_global_role(auth.uid(), 2)
        OR has_agency_rh_role(auth.uid(), agency_id)
      )
    )
  );

-- DELETE: Only Dirigeant or Franchiseur+
CREATE POLICY "collaborators_delete" ON agency_collaborators
  FOR DELETE USING (
    has_min_global_role(auth.uid(), 3)
    OR (
      agency_id = get_user_agency_id(auth.uid())
      AND has_min_global_role(auth.uid(), 2)
    )
  );

-- 8. Add comment on table for documentation
COMMENT ON TABLE agency_collaborators IS 'Collaborateurs de l''agence (employés, techniciens, assistantes). Module RH & Parc Phase 1.';
COMMENT ON COLUMN agency_collaborators.type IS 'Type: TECHNICIEN, ASSISTANTE, DIRIGEANT, COMMERCIAL, AUTRE';
COMMENT ON COLUMN agency_collaborators.apogee_user_id IS 'ID utilisateur Apogée pour lien manuel avec API';
COMMENT ON COLUMN agency_collaborators.social_security_number IS 'Numéro de sécurité sociale (données sensibles)';
