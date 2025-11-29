-- ============================================================================
-- SUPPRESSION DES TABLES LEGACY V1 (non utilisées par le code V2)
-- ============================================================================

-- 1. Supprimer les foreign keys de profiles vers les tables legacy
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_group_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_id_fkey;

-- 2. Supprimer les colonnes legacy de profiles (optionnel, garder pour historique)
-- ALTER TABLE profiles DROP COLUMN IF EXISTS group_id;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS role_id;

-- 3. Supprimer les fonctions DB legacy qui référencent ces tables
DROP FUNCTION IF EXISTS get_effective_permission_level(uuid, text);
DROP FUNCTION IF EXISTS get_effective_permission_level(text, uuid);

-- 4. Supprimer les tables legacy (ordre respectant les dépendances FK)
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS user_capabilities CASCADE;
DROP TABLE IF EXISTS group_permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS scopes CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Note: Les colonnes group_id et role_id sont conservées dans profiles pour référence historique
-- mais ne sont plus utilisées par le code V2.