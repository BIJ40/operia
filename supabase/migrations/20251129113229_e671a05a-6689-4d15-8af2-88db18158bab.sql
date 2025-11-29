-- ============================================================================
-- Suppression finale : has_role() et user_roles
-- ============================================================================

-- 1. Supprimer la fonction has_role()
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- 2. Supprimer la table user_roles
DROP TABLE IF EXISTS public.user_roles;

-- 3. Supprimer l'enum app_role (plus utilisé nulle part)
DROP TYPE IF EXISTS public.app_role;