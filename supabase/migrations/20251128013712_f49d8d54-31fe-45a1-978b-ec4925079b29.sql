-- Ajouter la contrainte UNIQUE manquante sur (user_id, scope_id) pour user_permissions
-- Cela permet d'utiliser ON CONFLICT (user_id, scope_id) dans les upserts

ALTER TABLE public.user_permissions
ADD CONSTRAINT user_permissions_user_scope_unique
UNIQUE (user_id, scope_id);