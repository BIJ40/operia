-- Permettre aux utilisateurs authentifiés de lire les permissions de leur propre rôle
DROP POLICY IF EXISTS "Only admins can view role permissions" ON role_permissions;

CREATE POLICY "Users can view their role permissions"
ON role_permissions
FOR SELECT
TO authenticated
USING (
  -- Les admins peuvent tout voir
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Les utilisateurs peuvent voir les permissions de leur propre rôle
  role_agence = (SELECT role_agence FROM profiles WHERE id = auth.uid())
);