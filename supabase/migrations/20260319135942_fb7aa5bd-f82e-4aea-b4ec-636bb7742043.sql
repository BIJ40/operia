-- Fix storage policies: scope by agency path pattern
-- Drop overly broad policies
DROP POLICY IF EXISTS "social_visuals_select" ON storage.objects;
DROP POLICY IF EXISTS "social_visuals_insert" ON storage.objects;
DROP POLICY IF EXISTS "social_visuals_delete" ON storage.objects;

-- Scoped storage policies: path convention = social-visuals/{agency_id}/...
CREATE POLICY "social_visuals_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'social-visuals' 
    AND (
      (storage.foldername(name))[1] = get_user_agency_id(auth.uid())::text
      OR has_min_global_role(auth.uid(), 3)
    )
  );

CREATE POLICY "social_visuals_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'social-visuals' 
    AND (storage.foldername(name))[1] = get_user_agency_id(auth.uid())::text
  );

CREATE POLICY "social_visuals_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'social-visuals' 
    AND (storage.foldername(name))[1] = get_user_agency_id(auth.uid())::text
  );

CREATE POLICY "social_visuals_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'social-visuals' 
    AND (storage.foldername(name))[1] = get_user_agency_id(auth.uid())::text
    AND has_min_global_role(auth.uid(), 2)
  );