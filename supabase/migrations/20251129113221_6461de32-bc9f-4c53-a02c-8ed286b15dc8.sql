-- ============================================================================
-- MIGRATION V2 : Dernières policies dépendant de user_roles
-- ============================================================================

-- STORAGE.OBJECTS - category-images
DROP POLICY IF EXISTS "Les administrateurs peuvent uploader des images de catégories" ON storage.objects;
DROP POLICY IF EXISTS "Les administrateurs peuvent supprimer des images de catégories" ON storage.objects;

CREATE POLICY "Les administrateurs peuvent uploader des images de catégories"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'category-images' AND has_min_global_role(auth.uid(), 5));

CREATE POLICY "Les administrateurs peuvent supprimer des images de catégories"
ON storage.objects FOR DELETE
USING (bucket_id = 'category-images' AND has_min_global_role(auth.uid(), 5));

-- USER_PRESENCE
DROP POLICY IF EXISTS "Admins can view all presence" ON public.user_presence;

CREATE POLICY "Admins can view all presence"
ON public.user_presence FOR SELECT
USING (has_min_global_role(auth.uid(), 5));

-- USER_CONNECTION_LOGS
DROP POLICY IF EXISTS "Admins can view all connection logs" ON public.user_connection_logs;

CREATE POLICY "Admins can view all connection logs"
ON public.user_connection_logs FOR SELECT
USING (has_min_global_role(auth.uid(), 5));