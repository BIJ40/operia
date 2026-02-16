-- Supprimer le trigger enforce_agency_role_floor qui empêche de mettre un utilisateur en franchisee_user quand il a une agence
-- Ce trigger forçait automatiquement le rôle N2 (franchisee_admin) pour tout utilisateur avec agence
-- La règle métier est maintenant gérée côté applicatif uniquement (formulaires) et non plus au niveau DB

DROP TRIGGER IF EXISTS trg_enforce_agency_role_floor ON profiles;

-- On garde la fonction pour référence mais le trigger ne sera plus actif
COMMENT ON FUNCTION public.enforce_agency_role_floor() IS 
'DÉSACTIVÉ: Le trigger a été supprimé. La règle du plancher N2 est maintenant gérée uniquement côté applicatif dans les formulaires de création/édition utilisateur.';