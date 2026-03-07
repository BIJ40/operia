
-- ============================================================================
-- module_registry: hierarchical module governance table
-- ============================================================================

CREATE TABLE module_registry (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  parent_key TEXT REFERENCES module_registry(key) ON DELETE RESTRICT,
  node_type TEXT NOT NULL CHECK (node_type IN ('section', 'screen', 'feature')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_deployed BOOLEAN NOT NULL DEFAULT true,
  required_plan TEXT NOT NULL DEFAULT 'STARTER' CHECK (required_plan IN ('STARTER', 'PRO'))
);

ALTER TABLE module_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "N4+ can read module_registry"
  ON module_registry FOR SELECT TO authenticated
  USING (has_min_global_role(auth.uid(), 4));

CREATE POLICY "N5+ can update module_registry"
  ON module_registry FOR UPDATE TO authenticated
  USING (has_min_global_role(auth.uid(), 5));

-- Index for tree traversal
CREATE INDEX idx_module_registry_parent ON module_registry(parent_key);

-- ============================================================================
-- SEED: canonical tree (~40 nodes)
-- Insert parents first, then children (respecting FK constraint)
-- ============================================================================

-- Level 0: root sections
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan) VALUES
  ('stats',      'Statistiques',  NULL, 'section', 10, true, 'STARTER'),
  ('salaries',   'Salariés',      NULL, 'section', 20, true, 'STARTER'),
  ('outils',     'Outils',        NULL, 'section', 30, true, 'STARTER'),
  ('documents',  'Documents',     NULL, 'screen',  40, true, 'STARTER'),
  ('guides',     'Guides',        NULL, 'section', 50, true, 'STARTER'),
  ('ticketing',  'Ticketing',     NULL, 'section', 60, true, 'STARTER'),
  ('aide',       'Aide',          NULL, 'section', 70, true, 'STARTER');

-- Level 1: stats children
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan) VALUES
  ('stats.general',      'Général',        'stats', 'screen', 1, true, 'STARTER'),
  ('stats.apporteurs',   'Apporteurs',     'stats', 'screen', 2, true, 'STARTER'),
  ('stats.techniciens',  'Techniciens',    'stats', 'screen', 3, true, 'STARTER'),
  ('stats.univers',      'Univers',        'stats', 'screen', 4, true, 'STARTER'),
  ('stats.sav',          'SAV',            'stats', 'screen', 5, true, 'STARTER'),
  ('stats.previsionnel', 'Prévisionnel',   'stats', 'screen', 6, true, 'PRO'),
  ('stats.exports',      'Exports',        'stats', 'feature', 7, true, 'PRO');

-- Level 1: salaries children
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan) VALUES
  ('salaries.gestionnaire', 'Gestionnaire', 'salaries', 'feature', 1, true, 'STARTER'),
  ('salaries.admin_rh',     'Admin RH',     'salaries', 'feature', 2, true, 'PRO');

-- Level 1: outils children
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan) VALUES
  ('outils.actions',       'Actions',        'outils', 'screen',  1, true, 'STARTER'),
  ('outils.apporteurs',    'Apporteurs',     'outils', 'section', 2, true, 'STARTER'),
  ('outils.administratif', 'Administratif',  'outils', 'section', 3, true, 'STARTER'),
  ('outils.parc',          'Parc',           'outils', 'section', 4, true, 'PRO'),
  ('outils.performance',   'Performance',    'outils', 'screen',  5, false, 'PRO'),
  ('outils.commercial',    'Commercial',     'outils', 'screen',  6, false, 'PRO');

-- Level 2: outils.apporteurs children
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan) VALUES
  ('outils.apporteurs.consulter', 'Consulter', 'outils.apporteurs', 'feature', 1, true, 'STARTER'),
  ('outils.apporteurs.gerer',     'Gérer',     'outils.apporteurs', 'feature', 2, true, 'STARTER');

-- Level 2: outils.administratif children
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan) VALUES
  ('outils.administratif.plannings', 'Plannings', 'outils.administratif', 'screen', 1, true, 'STARTER'),
  ('outils.administratif.reunions',  'Réunions',  'outils.administratif', 'screen', 2, false, 'STARTER'),
  ('outils.administratif.documents', 'Documents', 'outils.administratif', 'screen', 3, true, 'STARTER');

-- Level 2: outils.parc children
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan) VALUES
  ('outils.parc.vehicules',   'Véhicules',   'outils.parc', 'screen', 1, true, 'PRO'),
  ('outils.parc.epi',         'EPI',          'outils.parc', 'screen', 2, true, 'PRO'),
  ('outils.parc.equipements', 'Équipements', 'outils.parc', 'screen', 3, true, 'PRO');

-- Level 1: documents children
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan) VALUES
  ('documents.consulter',      'Consulter',      'documents', 'feature', 1, true, 'STARTER'),
  ('documents.gerer',          'Gérer',           'documents', 'feature', 2, true, 'STARTER'),
  ('documents.corbeille_vider','Vider corbeille', 'documents', 'feature', 3, true, 'PRO');

-- Level 1: guides children
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan) VALUES
  ('guides.apogee',      'Apogee',       'guides', 'screen', 1, true, 'STARTER'),
  ('guides.apporteurs',  'Apporteurs',   'guides', 'screen', 2, true, 'STARTER'),
  ('guides.helpconfort', 'HelpConfort',  'guides', 'screen', 3, true, 'STARTER'),
  ('guides.faq',         'FAQ',          'guides', 'screen', 4, true, 'STARTER');

-- Level 1: ticketing children
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan) VALUES
  ('ticketing.kanban',  'Kanban',  'ticketing', 'screen',  1, true, 'STARTER'),
  ('ticketing.create',  'Créer',   'ticketing', 'feature', 2, true, 'STARTER'),
  ('ticketing.manage',  'Gérer',   'ticketing', 'feature', 3, true, 'STARTER'),
  ('ticketing.import',  'Import',  'ticketing', 'feature', 4, false, 'PRO');

-- Level 1: aide children
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan) VALUES
  ('aide.user',  'Utilisateur', 'aide', 'feature', 1, true, 'STARTER'),
  ('aide.agent', 'Agent',       'aide', 'feature', 2, true, 'PRO');

-- ============================================================================
-- UPDATE RPC: get_user_effective_modules
-- Now reads from module_registry instead of plan_tier_modules
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_effective_modules(p_user_id uuid)
 RETURNS TABLE(module_key text, enabled boolean, options jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_agency_id uuid;
  v_tier_key text;
BEGIN
  -- 1. Get user's agency
  SELECT p.agency_id INTO v_agency_id
  FROM profiles p
  WHERE p.id = p_user_id;

  -- 2. Get agency's active plan tier
  IF v_agency_id IS NOT NULL THEN
    SELECT s.tier_key INTO v_tier_key
    FROM agency_subscription s
    WHERE s.agency_id = v_agency_id
      AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;
  END IF;

  -- Default to STARTER if no subscription found
  v_tier_key := COALESCE(UPPER(v_tier_key), 'STARTER');

  -- 3. Build effective modules via cascade:
  --    module_registry (filtered by deploy + plan) ← user_modules overrides
  RETURN QUERY
  WITH RECURSIVE deployed_tree AS (
    -- Root nodes that are deployed
    SELECT mr.key, mr.parent_key, mr.is_deployed, mr.required_plan,
           mr.is_deployed AS effective_deployed,
           mr.required_plan AS effective_plan
    FROM module_registry mr
    WHERE mr.parent_key IS NULL
    
    UNION ALL
    
    -- Children: inherit parent constraints
    SELECT mr.key, mr.parent_key, mr.is_deployed, mr.required_plan,
           -- effective_deployed: false if parent is off OR self is off
           (dt.effective_deployed AND mr.is_deployed) AS effective_deployed,
           -- effective_plan: take the most restrictive (PRO > STARTER)
           CASE 
             WHEN dt.effective_plan = 'PRO' THEN 'PRO'
             ELSE mr.required_plan
           END AS effective_plan
    FROM module_registry mr
    JOIN deployed_tree dt ON mr.parent_key = dt.key
  ),
  registry_modules AS (
    -- Filter: only effectively deployed nodes accessible by the agency plan
    SELECT dt.key AS module_key, true AS enabled, '{}'::jsonb AS options
    FROM deployed_tree dt
    WHERE dt.effective_deployed = true
      AND (
        v_tier_key = 'PRO'                          -- PRO sees everything deployed
        OR dt.effective_plan = 'STARTER'             -- STARTER sees only STARTER nodes
      )
  ),
  -- Also keep legacy plan_tier_modules for backward compat during transition
  legacy_plan_modules AS (
    SELECT 
      ptm.module_key,
      COALESCE(ptm.enabled, false) AS enabled,
      COALESCE(ptm.options_override, '{}'::jsonb) AS options
    FROM plan_tier_modules ptm
    WHERE ptm.tier_key = v_tier_key
      AND COALESCE(ptm.enabled, false) = true
  ),
  user_overrides AS (
    SELECT 
      um.module_key,
      true AS enabled,
      COALESCE(um.options, '{}'::jsonb) AS options
    FROM user_modules um
    WHERE um.user_id = p_user_id
  ),
  combined_base AS (
    -- New registry modules
    SELECT rm.module_key, rm.enabled, rm.options FROM registry_modules rm
    UNION ALL
    -- Legacy modules not already in registry
    SELECT lpm.module_key, lpm.enabled, lpm.options 
    FROM legacy_plan_modules lpm
    WHERE NOT EXISTS (SELECT 1 FROM registry_modules rm WHERE rm.module_key = lpm.module_key)
  ),
  merged AS (
    SELECT 
      cb.module_key,
      COALESCE(uo.enabled, cb.enabled) AS enabled,
      CASE 
        WHEN uo.module_key IS NOT NULL THEN cb.options || uo.options
        ELSE cb.options
      END AS options
    FROM combined_base cb
    LEFT JOIN user_overrides uo ON uo.module_key = cb.module_key
    
    UNION ALL
    
    -- User modules NOT in base (explicit user grants)
    SELECT 
      uo.module_key,
      uo.enabled,
      uo.options
    FROM user_overrides uo
    WHERE NOT EXISTS (
      SELECT 1 FROM combined_base cb WHERE cb.module_key = uo.module_key
    )
  )
  SELECT m.module_key::text, m.enabled, m.options
  FROM merged m
  WHERE m.enabled = true;
END;
$function$;
