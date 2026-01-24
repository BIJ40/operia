-- ============================================================================
-- PHASE 0 : Protection des accès /projects
-- Table de whitelist sécurisée pour garantir l'accès aux utilisateurs protégés
-- ============================================================================

-- Table de protection des accès spéciaux
CREATE TABLE IF NOT EXISTS protected_user_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('projects', 'support_agent', 'faq_admin')),
  snapshot_at TIMESTAMPTZ DEFAULT now(),
  original_modules JSONB,
  is_locked BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, access_type)
);

-- Commentaire table
COMMENT ON TABLE protected_user_access IS 'Whitelist des accès spéciaux protégés - ne peut être modifiée que par superadmin';

-- RLS
ALTER TABLE protected_user_access ENABLE ROW LEVEL SECURITY;

-- Lecture pour platform_admin et superadmin
CREATE POLICY "platform_admin_can_view_protected_access" ON protected_user_access
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND global_role IN ('platform_admin', 'superadmin')
    )
  );

-- Modification uniquement par superadmin
CREATE POLICY "superadmin_can_manage_protected_access" ON protected_user_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND global_role = 'superadmin'
    )
  );

-- ============================================================================
-- SNAPSHOT des 6 utilisateurs protégés pour /projects
-- ============================================================================

INSERT INTO protected_user_access (user_id, access_type, original_modules, notes)
VALUES
  -- Partenaires externes (N0) avec accès projet
  ('e43de17a-ce1d-4238-aeaa-4b57f4b822e2', 'projects', '{"source": "dynoco", "role": "base_user"}', 'Hugo Bulthé - Dynoco'),
  ('46ca0725-c16e-4d95-a8df-42deecbbc61c', 'projects', '{"source": "seb-connect", "role": "base_user"}', 'Gregory Gauthier - SEB Connect'),
  ('962cbd88-5d29-45a9-86dc-637ebe76eae5', 'projects', '{"source": "core-si", "role": "base_user"}', 'Philippe Massari - Core SI'),
  
  -- Utilisateurs internes
  ('acf6013b-e774-4aa0-88c7-bfe44dd82607', 'projects', '{"source": "helpconfort", "role": "franchisee_admin"}', 'Florian Dhaillecourt - HelpConfort'),
  ('4837965e-11e0-4639-8283-1808292a1c2b', 'projects', '{"source": "lps-reseaux", "role": "franchisor_user"}', 'Eric Baligout - LPS Réseaux'),
  ('9b80c88a-546c-4329-b04a-6977c5e46fad', 'projects', '{"source": "helpconfort", "role": "superadmin"}', 'Jérôme Ducourneau - Fondateur')
ON CONFLICT (user_id, access_type) DO NOTHING;