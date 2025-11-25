-- Supprimer toutes les permissions existantes
DELETE FROM role_permissions;

-- Supprimer l'utilisateur technicien si il existe
DELETE FROM profiles WHERE role_agence = 'technicien';