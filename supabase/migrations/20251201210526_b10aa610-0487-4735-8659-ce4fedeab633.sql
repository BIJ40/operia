-- ============================================================================
-- P1.1 - RLS FRANCHISEUR : Remplacer has_franchiseur_role() par global_role
-- ============================================================================

-- Créer fonction helper pour vérifier les assignments d'agences
CREATE OR REPLACE FUNCTION public.get_user_assigned_agencies(_user_id uuid)
RETURNS TABLE(agency_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id 
  FROM franchiseur_agency_assignments 
  WHERE user_id = _user_id;
$$;

-- Fonction pour vérifier si un user a accès à une agence spécifique
CREATE OR REPLACE FUNCTION public.can_access_agency(_user_id uuid, _agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- N5+ = accès global
  SELECT CASE
    WHEN has_min_global_role(_user_id, 5) THEN true
    -- N3/N4 sans assignments = accès global (legacy)
    WHEN has_min_global_role(_user_id, 3) AND NOT EXISTS (
      SELECT 1 FROM franchiseur_agency_assignments WHERE user_id = _user_id
    ) THEN true
    -- N3/N4 avec assignments = accès limité
    WHEN has_min_global_role(_user_id, 3) AND EXISTS (
      SELECT 1 FROM franchiseur_agency_assignments 
      WHERE user_id = _user_id AND agency_id = _agency_id
    ) THEN true
    ELSE false
  END;
$$;

-- ============================================================================
-- Réécrire les policies franchiseur avec la nouvelle logique
-- ============================================================================

-- ANIMATOR VISITS
DROP POLICY IF EXISTS "Animators can view their own visits" ON animator_visits;
DROP POLICY IF EXISTS "Animators can insert their own visits" ON animator_visits;
DROP POLICY IF EXISTS "Animators can update their own visits" ON animator_visits;
DROP POLICY IF EXISTS "Animators can delete their own visits" ON animator_visits;

CREATE POLICY "Franchisor can view visits"
ON animator_visits FOR SELECT
USING (
  animator_id = auth.uid() 
  OR can_access_agency(auth.uid(), agency_id)
);

CREATE POLICY "Franchisor can insert visits"
ON animator_visits FOR INSERT
WITH CHECK (
  animator_id = auth.uid() 
  OR can_access_agency(auth.uid(), agency_id)
);

CREATE POLICY "Franchisor can update visits"
ON animator_visits FOR UPDATE
USING (
  animator_id = auth.uid() 
  OR can_access_agency(auth.uid(), agency_id)
);

CREATE POLICY "Franchisor can delete visits"
ON animator_visits FOR DELETE
USING (
  animator_id = auth.uid() 
  OR can_access_agency(auth.uid(), agency_id)
);

-- EXPENSE REQUESTS
DROP POLICY IF EXISTS "Users can view expense requests" ON expense_requests;
DROP POLICY IF EXISTS "Users can update expense requests" ON expense_requests;

CREATE POLICY "Users can view expense requests"
ON expense_requests FOR SELECT
USING (
  requester_id = auth.uid() 
  OR approver_id = auth.uid()
  OR has_min_global_role(auth.uid(), 3) -- N3+ franchiseur
);

CREATE POLICY "Users can update expense requests"
ON expense_requests FOR UPDATE
USING (
  requester_id = auth.uid() 
  OR approver_id = auth.uid()
  OR has_min_global_role(auth.uid(), 3) -- N3+ franchiseur
);

-- AGENCY ROYALTY CALCULATIONS
DROP POLICY IF EXISTS "Directeur and DG can view royalty calculations" ON agency_royalty_calculations;
DROP POLICY IF EXISTS "Directeur and DG can manage royalty calculations" ON agency_royalty_calculations;

CREATE POLICY "Franchisor can view royalty calculations"
ON agency_royalty_calculations FOR SELECT
USING (can_access_agency(auth.uid(), agency_id));

CREATE POLICY "Franchisor can manage royalty calculations"
ON agency_royalty_calculations FOR ALL
USING (can_access_agency(auth.uid(), agency_id))
WITH CHECK (can_access_agency(auth.uid(), agency_id));

-- AGENCY ROYALTY CONFIG
DROP POLICY IF EXISTS "Directeur and DG can view royalty configs" ON agency_royalty_config;
DROP POLICY IF EXISTS "Directeur and DG can manage royalty configs" ON agency_royalty_config;

CREATE POLICY "Franchisor can view royalty configs"
ON agency_royalty_config FOR SELECT
USING (can_access_agency(auth.uid(), agency_id));

CREATE POLICY "Franchisor can manage royalty configs"
ON agency_royalty_config FOR ALL
USING (can_access_agency(auth.uid(), agency_id))
WITH CHECK (can_access_agency(auth.uid(), agency_id));

-- AGENCY ROYALTY TIERS
DROP POLICY IF EXISTS "Directeur and DG can view royalty tiers" ON agency_royalty_tiers;
DROP POLICY IF EXISTS "Directeur and DG can manage royalty tiers" ON agency_royalty_tiers;

CREATE POLICY "Franchisor can view royalty tiers"
ON agency_royalty_tiers FOR SELECT
USING (
  can_access_agency(auth.uid(), (
    SELECT agency_id FROM agency_royalty_config WHERE id = config_id
  ))
);

CREATE POLICY "Franchisor can manage royalty tiers"
ON agency_royalty_tiers FOR ALL
USING (
  can_access_agency(auth.uid(), (
    SELECT agency_id FROM agency_royalty_config WHERE id = config_id
  ))
)
WITH CHECK (
  can_access_agency(auth.uid(), (
    SELECT agency_id FROM agency_royalty_config WHERE id = config_id
  ))
);

-- ============================================================================
-- P1.2 - RLS SUPPORT CONSOLE : Aligner avec Option B
-- ============================================================================

-- Créer fonction helper pour vérifier support.agent
CREATE OR REPLACE FUNCTION public.is_support_agent(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (enabled_modules->'support'->'options'->>'agent')::boolean,
    false
  )
  FROM profiles
  WHERE id = _user_id;
$$;

-- Réécrire les policies support_tickets
DROP POLICY IF EXISTS "Users can view their own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can insert their own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Support staff can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Support staff can manage all tickets" ON support_tickets;

-- Lecture : créateur, assigned_to, agents support, N5+
CREATE POLICY "Users can view support tickets"
ON support_tickets FOR SELECT
USING (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
  OR is_support_agent(auth.uid())
  OR has_min_global_role(auth.uid(), 5)
);

-- Insertion : tout utilisateur authentifié
CREATE POLICY "Users can insert support tickets"
ON support_tickets FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Mise à jour : créateur, assigned_to, agents support, N5+
CREATE POLICY "Users can update support tickets"
ON support_tickets FOR UPDATE
USING (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
  OR is_support_agent(auth.uid())
  OR has_min_global_role(auth.uid(), 5)
);

-- Suppression : N5+ uniquement
CREATE POLICY "Platform admin can delete support tickets"
ON support_tickets FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- P1.3 - MIGRATION AGENCY_ID : Remplir agency_id depuis agence slug
-- ============================================================================

-- Remplir agency_id pour tous les profils où c'est NULL mais agence existe
UPDATE profiles p
SET agency_id = (
  SELECT a.id 
  FROM apogee_agencies a 
  WHERE a.slug = p.agence
)
WHERE p.agency_id IS NULL 
AND p.agence IS NOT NULL
AND EXISTS (
  SELECT 1 FROM apogee_agencies a WHERE a.slug = p.agence
);

-- Créer fonction helper pour obtenir l'agency_id de l'utilisateur
CREATE OR REPLACE FUNCTION public.get_user_agency_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id FROM profiles WHERE id = _user_id;
$$;

-- Réécrire la policy apogee_agencies pour utiliser agency_id
DROP POLICY IF EXISTS "Role-based agency access" ON apogee_agencies;

CREATE POLICY "Role-based agency access"
ON apogee_agencies FOR SELECT
USING (
  has_min_global_role(auth.uid(), 5)
  OR has_support_access(auth.uid())
  OR has_franchiseur_access(auth.uid())
  OR id = get_user_agency_id(auth.uid())
);

-- Réécrire agency_collaborators pour utiliser agency_id
DROP POLICY IF EXISTS "read_agency_collaborators" ON agency_collaborators;
DROP POLICY IF EXISTS "insert_agency_collaborators" ON agency_collaborators;
DROP POLICY IF EXISTS "update_agency_collaborators" ON agency_collaborators;

CREATE POLICY "Users can view agency collaborators"
ON agency_collaborators FOR SELECT
USING (
  has_min_global_role(auth.uid(), 3)
  OR agency_id = get_user_agency_id(auth.uid())
);

CREATE POLICY "Users can insert agency collaborators"
ON agency_collaborators FOR INSERT
WITH CHECK (
  has_min_global_role(auth.uid(), 3)
  OR (
    has_min_global_role(auth.uid(), 2)
    AND agency_id = get_user_agency_id(auth.uid())
  )
);

CREATE POLICY "Users can update agency collaborators"
ON agency_collaborators FOR UPDATE
USING (
  has_min_global_role(auth.uid(), 3)
  OR (
    has_min_global_role(auth.uid(), 2)
    AND agency_id = get_user_agency_id(auth.uid())
  )
);