-- =============================================================================
-- P0: SOCLE SUIVI RH - Tables spécialisées
-- =============================================================================

-- 1. Ajouter apogee_user_id sur profiles si pas déjà présent (pour mapping /me/planning)
-- Note: déjà présent selon le schéma, on skip

-- 2. Table préférences colonnes RH
CREATE TABLE public.rh_table_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hidden_columns TEXT[] DEFAULT '{}',
  column_order TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Table EPI & Sécurité (liée à collaborators)
CREATE TABLE public.rh_epi_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  -- Tailles
  taille_haut TEXT,
  taille_bas TEXT,
  pointure TEXT,
  taille_gants TEXT,
  -- EPI
  epi_requis TEXT[] DEFAULT '{}',
  epi_remis TEXT[] DEFAULT '{}',
  date_derniere_remise DATE,
  date_renouvellement DATE,
  statut_epi TEXT DEFAULT 'OK' CHECK (statut_epi IN ('OK', 'TO_RENEW', 'MISSING')),
  notes_securite TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collaborator_id)
);

-- 4. Table Compétences & Habilitations
CREATE TABLE public.rh_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  habilitation_electrique_statut TEXT,
  habilitation_electrique_date DATE,
  caces JSONB DEFAULT '[]', -- [{type: "CACES 1", date: "2024-01-01", expiration: "2029-01-01"}]
  autres_habilitations JSONB DEFAULT '[]',
  derniere_maj TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collaborator_id)
);

-- 5. Table Parc & Matériel attribué
CREATE TABLE public.rh_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  vehicule_attribue TEXT,
  carte_carburant BOOLEAN DEFAULT false,
  numero_carte_carburant TEXT, -- N2 strict
  carte_societe BOOLEAN DEFAULT false,
  tablette_telephone TEXT,
  imei TEXT, -- N2 strict
  autres_equipements JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collaborator_id)
);

-- 6. Table IT & Accès (ultra sensible)
CREATE TABLE public.rh_it_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  acces_outils TEXT[] DEFAULT '{}', -- Liste des outils accessibles
  identifiants_encrypted TEXT, -- Chiffré côté app
  notes_it TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collaborator_id)
);

-- 7. Ajouter employee_visible sur collaborator_documents si pas présent
ALTER TABLE public.collaborator_documents 
ADD COLUMN IF NOT EXISTS employee_visible BOOLEAN DEFAULT false;

-- =============================================================================
-- P1: PORTAIL SALARIÉ - Tables
-- =============================================================================

-- 8. Signatures utilisateur
CREATE TABLE public.user_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signature_svg TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 9. Demandes RH (EPI, Congés, etc.)
CREATE TABLE public.rh_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type TEXT NOT NULL CHECK (request_type IN ('EPI_RENEWAL', 'LEAVE', 'DOCUMENT', 'OTHER')),
  employee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
  payload JSONB DEFAULT '{}', -- Contenu variable selon type
  generated_letter_path TEXT, -- Path storage pour PDF généré
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  decision_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.rh_table_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_epi_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_it_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_requests ENABLE ROW LEVEL SECURITY;

-- rh_table_prefs: utilisateur gère ses propres préférences
CREATE POLICY "Users manage own table prefs" ON public.rh_table_prefs
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- rh_epi_profiles: N2+ de l'agence uniquement
CREATE POLICY "N2+ can manage EPI profiles" ON public.rh_epi_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM collaborators c
      WHERE c.id = rh_epi_profiles.collaborator_id
      AND c.agency_id = get_user_agency_id(auth.uid())
      AND has_min_global_role(auth.uid(), 2)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collaborators c
      WHERE c.id = rh_epi_profiles.collaborator_id
      AND c.agency_id = get_user_agency_id(auth.uid())
      AND has_min_global_role(auth.uid(), 2)
    )
  );

-- rh_competencies: N2+ de l'agence uniquement
CREATE POLICY "N2+ can manage competencies" ON public.rh_competencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM collaborators c
      WHERE c.id = rh_competencies.collaborator_id
      AND c.agency_id = get_user_agency_id(auth.uid())
      AND has_min_global_role(auth.uid(), 2)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collaborators c
      WHERE c.id = rh_competencies.collaborator_id
      AND c.agency_id = get_user_agency_id(auth.uid())
      AND has_min_global_role(auth.uid(), 2)
    )
  );

-- rh_assets: N2+ de l'agence uniquement
CREATE POLICY "N2+ can manage assets" ON public.rh_assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM collaborators c
      WHERE c.id = rh_assets.collaborator_id
      AND c.agency_id = get_user_agency_id(auth.uid())
      AND has_min_global_role(auth.uid(), 2)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collaborators c
      WHERE c.id = rh_assets.collaborator_id
      AND c.agency_id = get_user_agency_id(auth.uid())
      AND has_min_global_role(auth.uid(), 2)
    )
  );

-- rh_it_access: N2+ de l'agence uniquement (ultra sensible)
CREATE POLICY "N2+ can manage IT access" ON public.rh_it_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM collaborators c
      WHERE c.id = rh_it_access.collaborator_id
      AND c.agency_id = get_user_agency_id(auth.uid())
      AND has_min_global_role(auth.uid(), 2)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collaborators c
      WHERE c.id = rh_it_access.collaborator_id
      AND c.agency_id = get_user_agency_id(auth.uid())
      AND has_min_global_role(auth.uid(), 2)
    )
  );

-- user_signatures: utilisateur gère sa propre signature
CREATE POLICY "Users manage own signature" ON public.user_signatures
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- rh_requests: N1 gère ses demandes, N2+ voit/traite celles de son agence
CREATE POLICY "Employees manage own requests" ON public.rh_requests
  FOR ALL USING (
    employee_user_id = auth.uid()
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
  )
  WITH CHECK (
    employee_user_id = auth.uid()
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_rh_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_rh_table_prefs_updated_at BEFORE UPDATE ON rh_table_prefs FOR EACH ROW EXECUTE FUNCTION update_rh_updated_at();
CREATE TRIGGER update_rh_epi_profiles_updated_at BEFORE UPDATE ON rh_epi_profiles FOR EACH ROW EXECUTE FUNCTION update_rh_updated_at();
CREATE TRIGGER update_rh_competencies_updated_at BEFORE UPDATE ON rh_competencies FOR EACH ROW EXECUTE FUNCTION update_rh_updated_at();
CREATE TRIGGER update_rh_assets_updated_at BEFORE UPDATE ON rh_assets FOR EACH ROW EXECUTE FUNCTION update_rh_updated_at();
CREATE TRIGGER update_rh_it_access_updated_at BEFORE UPDATE ON rh_it_access FOR EACH ROW EXECUTE FUNCTION update_rh_updated_at();
CREATE TRIGGER update_user_signatures_updated_at BEFORE UPDATE ON user_signatures FOR EACH ROW EXECUTE FUNCTION update_rh_updated_at();
CREATE TRIGGER update_rh_requests_updated_at BEFORE UPDATE ON rh_requests FOR EACH ROW EXECUTE FUNCTION update_rh_updated_at();