-- Mettre à jour la politique de suppression des annonces
-- Seuls les créateurs (N3+) peuvent supprimer leurs propres annonces
-- Les N5+ (platform_admin, superadmin) peuvent supprimer toutes les annonces

DROP POLICY IF EXISTS "Franchisor users can delete announcements" ON priority_announcements;

CREATE POLICY "Users can delete their own announcements or admins can delete all"
ON priority_announcements
FOR DELETE
TO authenticated
USING (
  -- L'utilisateur est le créateur
  (created_by = auth.uid() AND has_min_global_role(auth.uid(), 3))
  OR
  -- Ou l'utilisateur est platform_admin/superadmin
  has_min_global_role(auth.uid(), 5)
);