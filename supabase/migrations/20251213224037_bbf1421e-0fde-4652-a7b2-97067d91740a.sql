-- ============================================================================
-- Console Droits & Accès - Migration Complète
-- ============================================================================

-- 1. Table plan_tiers (templates de plans)
CREATE TABLE IF NOT EXISTS public.plan_tiers (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  display_order int DEFAULT 0,
  is_system boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insérer les 3 plans de base
INSERT INTO public.plan_tiers (key, label, description, display_order) VALUES
  ('FREE', 'Gratuit', 'Accès de base - Support et Academy uniquement', 1),
  ('STARTER', 'Starter', 'Accès intermédiaire - Pilotage et RH', 2),
  ('PRO', 'Pro', 'Accès complet - Toutes les fonctionnalités', 3)
ON CONFLICT (key) DO NOTHING;

-- 2. Table plan_tier_modules (modules par plan)
CREATE TABLE IF NOT EXISTS public.plan_tier_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_key text NOT NULL REFERENCES public.plan_tiers(key) ON DELETE CASCADE,
  module_key text NOT NULL,
  enabled boolean DEFAULT true,
  options_override jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tier_key, module_key)
);

-- Peupler les modules par plan
-- FREE : support, help_academy
INSERT INTO public.plan_tier_modules (tier_key, module_key, enabled, options_override) VALUES
  ('FREE', 'support', true, '{"user": true}'),
  ('FREE', 'help_academy', true, '{"apogee": true, "apporteurs": true}')
ON CONFLICT (tier_key, module_key) DO NOTHING;

-- STARTER : + pilotage_agence, rh, parc
INSERT INTO public.plan_tier_modules (tier_key, module_key, enabled, options_override) VALUES
  ('STARTER', 'support', true, '{"user": true}'),
  ('STARTER', 'help_academy', true, '{"apogee": true, "helpconfort": true, "apporteurs": true}'),
  ('STARTER', 'pilotage_agence', true, '{"indicateurs": true, "stats_hub": true, "actions_a_mener": true, "diffusion": true}'),
  ('STARTER', 'rh', true, '{"coffre": true, "rh_viewer": true}'),
  ('STARTER', 'parc', true, '{"vehicules": true, "epi": true}')
ON CONFLICT (tier_key, module_key) DO NOTHING;

-- PRO : + reseau_franchiseur, messaging, unified_search, apogee_tickets
INSERT INTO public.plan_tier_modules (tier_key, module_key, enabled, options_override) VALUES
  ('PRO', 'support', true, '{"user": true, "agent": true}'),
  ('PRO', 'help_academy', true, '{"apogee": true, "helpconfort": true, "apporteurs": true, "edition": true}'),
  ('PRO', 'pilotage_agence', true, '{"indicateurs": true, "stats_hub": true, "actions_a_mener": true, "diffusion": true, "exports": true, "veille_apporteurs": true}'),
  ('PRO', 'rh', true, '{"coffre": true, "rh_viewer": true, "rh_admin": true}'),
  ('PRO', 'parc', true, '{"vehicules": true, "epi": true, "equipements": true}'),
  ('PRO', 'reseau_franchiseur', true, '{"dashboard": true, "stats": true, "agences": true, "redevances": true, "comparatifs": true}'),
  ('PRO', 'messaging', true, '{"dm": true, "groups": true}'),
  ('PRO', 'unified_search', true, '{"stats": true, "docs": true}'),
  ('PRO', 'apogee_tickets', true, '{"kanban": true, "import": true, "manage": true}')
ON CONFLICT (tier_key, module_key) DO NOTHING;

-- 3. Table agency_subscription (souscription par agence)
CREATE TABLE IF NOT EXISTS public.agency_subscription (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL UNIQUE,
  tier_key text NOT NULL REFERENCES public.plan_tiers(key),
  status text NOT NULL CHECK (status IN ('active', 'suspended', 'cancelled')) DEFAULT 'active',
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_agency_subscription_tier ON public.agency_subscription(tier_key);
CREATE INDEX IF NOT EXISTS idx_agency_subscription_status ON public.agency_subscription(status);

-- 4. Table agency_module_overrides (overrides par agence)
CREATE TABLE IF NOT EXISTS public.agency_module_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  module_key text NOT NULL,
  forced_enabled boolean,
  options_override jsonb,
  set_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (agency_id, module_key)
);

-- 5. Table permission_audit (historique centralisé)
CREATE TABLE IF NOT EXISTS public.permission_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  target_user_id uuid,
  agency_id uuid,
  changes jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_permission_audit_editor ON public.permission_audit(editor_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_target ON public.permission_audit(target_user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_created ON public.permission_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_audit_agency ON public.permission_audit(agency_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_entity_type ON public.permission_audit(entity_type);

-- 6. Ajouter support_role à profiles (sans supprimer support_level)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_role') THEN
    CREATE TYPE support_role AS ENUM ('none', 'agent', 'admin');
  END IF;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS support_role support_role DEFAULT 'none';

-- Mapper depuis support_level existant
UPDATE public.profiles
SET support_role = CASE
  WHEN support_level >= 3 THEN 'admin'::support_role
  WHEN support_level >= 1 THEN 'agent'::support_role
  ELSE 'none'::support_role
END
WHERE support_role = 'none' AND support_level IS NOT NULL AND support_level > 0;

-- 7. Fonctions DB sources de vérité

-- 7.1 Modules effectifs d'une agence
CREATE OR REPLACE FUNCTION public.get_agency_enabled_modules(p_agency_id uuid)
RETURNS TABLE(module_key text, enabled boolean, options jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT
    ptm.module_key,
    COALESCE(amo.forced_enabled, ptm.enabled) AS enabled,
    COALESCE(amo.options_override, ptm.options_override, '{}'::jsonb) AS options
  FROM agency_subscription s
  JOIN plan_tier_modules ptm ON ptm.tier_key = s.tier_key
  LEFT JOIN agency_module_overrides amo 
    ON amo.agency_id = s.agency_id AND amo.module_key = ptm.module_key
  WHERE s.agency_id = p_agency_id
    AND s.status = 'active';
$$;

-- 7.2 Modules effectifs utilisateur (agence + user overrides)
CREATE OR REPLACE FUNCTION public.get_user_effective_modules(p_user_id uuid)
RETURNS TABLE(module_key text, enabled boolean, options jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  WITH agency_modules AS (
    SELECT * FROM get_agency_enabled_modules(get_user_agency_id(p_user_id))
  ),
  user_overrides AS (
    SELECT module_key, true AS enabled, options
    FROM user_modules
    WHERE user_id = p_user_id
  )
  SELECT
    COALESCE(a.module_key, u.module_key) AS module_key,
    COALESCE(u.enabled, a.enabled, false) AS enabled,
    COALESCE(u.options, a.options, '{}'::jsonb) AS options
  FROM agency_modules a
  FULL OUTER JOIN user_overrides u ON u.module_key = a.module_key
  WHERE COALESCE(u.enabled, a.enabled, false) = true
    OR u.module_key IS NOT NULL;
$$;

-- 7.3 Vérifier si un utilisateur peut gérer un autre (enforcement DB)
CREATE OR REPLACE FUNCTION public.can_manage_user_db(p_editor_id uuid, p_target_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_editor_role global_role;
  v_editor_level int;
  v_target_role global_role;
  v_target_level int;
  v_editor_agency uuid;
  v_target_agency uuid;
BEGIN
  -- Récupérer les rôles et agences
  SELECT global_role, agency_id INTO v_editor_role, v_editor_agency FROM profiles WHERE id = p_editor_id;
  SELECT global_role, agency_id INTO v_target_role, v_target_agency FROM profiles WHERE id = p_target_id;
  
  -- Calculer les niveaux
  v_editor_level := get_user_global_role_level(p_editor_id);
  v_target_level := get_user_global_role_level(p_target_id);
  
  -- N0 (base_user) : gérable UNIQUEMENT par N5/N6
  IF v_target_role = 'base_user' THEN
    RETURN v_editor_level >= 5;
  END IF;
  
  -- Règle N-1 : editor doit être > target
  IF v_editor_level <= v_target_level THEN
    RETURN false;
  END IF;
  
  -- N2 : uniquement sa propre agence
  IF v_editor_role = 'franchisee_admin' THEN
    RETURN v_editor_agency IS NOT NULL AND v_editor_agency = v_target_agency;
  END IF;
  
  -- N3 : agences assignées via franchiseur_agency_assignments
  IF v_editor_role = 'franchisor_user' THEN
    IF v_target_agency IS NULL THEN RETURN true; END IF;
    RETURN EXISTS (
      SELECT 1 FROM franchiseur_agency_assignments
      WHERE user_id = p_editor_id AND agency_id = v_target_agency
    );
  END IF;
  
  -- N4+ : toutes agences
  RETURN true;
END;
$$;

-- 8. RLS Policies

-- 8.1 plan_tiers : lecture publique, écriture N5+
ALTER TABLE public.plan_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read plans" ON public.plan_tiers;
CREATE POLICY "Anyone can read plans" ON public.plan_tiers 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "N5+ can manage plans" ON public.plan_tiers;
CREATE POLICY "N5+ can manage plans" ON public.plan_tiers 
  FOR ALL USING (has_min_global_role(auth.uid(), 5)) 
  WITH CHECK (has_min_global_role(auth.uid(), 5));

-- 8.2 plan_tier_modules : lecture publique, écriture N5+
ALTER TABLE public.plan_tier_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read plan modules" ON public.plan_tier_modules;
CREATE POLICY "Anyone can read plan modules" ON public.plan_tier_modules 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "N5+ can manage plan modules" ON public.plan_tier_modules;
CREATE POLICY "N5+ can manage plan modules" ON public.plan_tier_modules 
  FOR ALL USING (has_min_global_role(auth.uid(), 5)) 
  WITH CHECK (has_min_global_role(auth.uid(), 5));

-- 8.3 agency_subscription : N4+ peut gérer, N2+ voit sa propre agence
ALTER TABLE public.agency_subscription ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "N4+ can manage all subscriptions" ON public.agency_subscription;
CREATE POLICY "N4+ can manage all subscriptions" ON public.agency_subscription
  FOR ALL USING (has_min_global_role(auth.uid(), 4))
  WITH CHECK (has_min_global_role(auth.uid(), 4));

DROP POLICY IF EXISTS "N2+ can view own agency subscription" ON public.agency_subscription;
CREATE POLICY "N2+ can view own agency subscription" ON public.agency_subscription
  FOR SELECT USING (agency_id = get_user_agency_id(auth.uid()));

-- 8.4 agency_module_overrides : N4+ peut gérer
ALTER TABLE public.agency_module_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "N4+ can manage agency overrides" ON public.agency_module_overrides;
CREATE POLICY "N4+ can manage agency overrides" ON public.agency_module_overrides
  FOR ALL USING (has_min_global_role(auth.uid(), 4))
  WITH CHECK (has_min_global_role(auth.uid(), 4));

DROP POLICY IF EXISTS "N2+ can view own agency overrides" ON public.agency_module_overrides;
CREATE POLICY "N2+ can view own agency overrides" ON public.agency_module_overrides
  FOR SELECT USING (agency_id = get_user_agency_id(auth.uid()));

-- 8.5 permission_audit : visibilité selon niveau
ALTER TABLE public.permission_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "N5+ can see all audit" ON public.permission_audit;
CREATE POLICY "N5+ can see all audit" ON public.permission_audit 
  FOR SELECT USING (has_min_global_role(auth.uid(), 5));

DROP POLICY IF EXISTS "N4 sees relevant audit" ON public.permission_audit;
CREATE POLICY "N4 sees relevant audit" ON public.permission_audit 
  FOR SELECT USING (
    has_min_global_role(auth.uid(), 4) 
    AND NOT has_min_global_role(auth.uid(), 5)
    AND (
      target_user_id IS NULL 
      OR get_user_global_role_level(target_user_id) < 4
    )
  );

DROP POLICY IF EXISTS "N3 sees assigned agency audit" ON public.permission_audit;
CREATE POLICY "N3 sees assigned agency audit" ON public.permission_audit 
  FOR SELECT USING (
    has_min_global_role(auth.uid(), 3) 
    AND NOT has_min_global_role(auth.uid(), 4)
    AND agency_id IN (
      SELECT faa.agency_id FROM franchiseur_agency_assignments faa WHERE faa.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "N2 sees own agency audit" ON public.permission_audit;
CREATE POLICY "N2 sees own agency audit" ON public.permission_audit 
  FOR SELECT USING (
    has_min_global_role(auth.uid(), 2) 
    AND NOT has_min_global_role(auth.uid(), 3)
    AND agency_id = get_user_agency_id(auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated can insert audit" ON public.permission_audit;
CREATE POLICY "Authenticated can insert audit" ON public.permission_audit 
  FOR INSERT WITH CHECK (editor_id = auth.uid());

-- 9. Trigger pour updated_at sur agency_subscription
CREATE OR REPLACE FUNCTION public.update_agency_subscription_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_agency_subscription_updated_at ON public.agency_subscription;
CREATE TRIGGER update_agency_subscription_updated_at
  BEFORE UPDATE ON public.agency_subscription
  FOR EACH ROW EXECUTE FUNCTION public.update_agency_subscription_updated_at();

-- 10. Assigner plan STARTER par défaut aux agences existantes sans souscription
INSERT INTO public.agency_subscription (agency_id, tier_key, status, assigned_by)
SELECT 
  a.id, 
  'STARTER', 
  'active', 
  (SELECT id FROM profiles WHERE global_role = 'superadmin' LIMIT 1)
FROM apogee_agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM agency_subscription s WHERE s.agency_id = a.id
)
ON CONFLICT (agency_id) DO NOTHING;