-- ============================================
-- RESET DES PERMISSIONS - Migration idempotente
-- ============================================
-- Cette migration supprime toutes les données de permissions
-- du nouveau système pour repartir sur une base propre.
-- Elle NE MODIFIE PAS la structure des tables.
-- ============================================

-- 1) Supprimer tous les overrides individuels
DELETE FROM public.user_permissions;

-- 2) Supprimer toutes les permissions de groupe
DELETE FROM public.group_permissions;

-- 3) Réinitialiser les rattachements dans profiles
UPDATE public.profiles
SET 
  group_id = NULL,
  system_role = 'utilisateur'::system_role;