-- ============================================================================
-- SUPPRESSION DES COLONNES LEGACY DE PROFILES
-- ============================================================================

-- Supprimer les colonnes legacy qui ne sont plus utilisées
ALTER TABLE profiles DROP COLUMN IF EXISTS group_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS role_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS system_role;
ALTER TABLE profiles DROP COLUMN IF EXISTS support_level;
ALTER TABLE profiles DROP COLUMN IF EXISTS service_competencies;

-- Note: Les données historiques dans ces colonnes sont perdues.
-- Cette migration finalise le nettoyage V2.