-- ============================================
-- SECURITY FIX: Restrict plan configuration tables
-- ============================================

-- 1. CRITICAL: plan_tier_modules - restrict to N4+
DROP POLICY IF EXISTS "Authenticated users can read plan tier modules" ON plan_tier_modules;
DROP POLICY IF EXISTS "N4+ can read plan modules" ON plan_tier_modules;

CREATE POLICY "N4+ can read plan tier modules"
ON plan_tier_modules
FOR SELECT
USING (has_min_global_role(auth.uid(), 4));

-- 2. WARNING: plan_tiers - restrict to N4+
DROP POLICY IF EXISTS "Authenticated users can read plan tiers" ON plan_tiers;
DROP POLICY IF EXISTS "N4+ can read plan tiers" ON plan_tiers;

CREATE POLICY "N4+ can read plan tiers"
ON plan_tiers
FOR SELECT
USING (has_min_global_role(auth.uid(), 4));

-- 3. WARNING: rh_competences_catalogue - restrict to N2+ (agency users who need HR)
DROP POLICY IF EXISTS "Authenticated users can read competences catalogue" ON rh_competences_catalogue;
DROP POLICY IF EXISTS "N2+ can read competences catalogue" ON rh_competences_catalogue;

CREATE POLICY "N2+ can read competences catalogue"
ON rh_competences_catalogue
FOR SELECT
USING (has_min_global_role(auth.uid(), 2));

-- Note: Extensions in public schema is a low-priority architectural concern
-- that requires Supabase project-level configuration changes, not a migration fix