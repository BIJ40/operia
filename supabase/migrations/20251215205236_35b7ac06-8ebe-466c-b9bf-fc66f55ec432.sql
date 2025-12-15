-- Create storage buckets for DocGen module
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('doc-templates', 'doc-templates', false),
  ('doc-generated', 'doc-generated', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for doc-templates bucket (DOCX templates - admin upload only)
CREATE POLICY "N4+ can upload templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'doc-templates' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND global_role >= 'franchisor_admin'
  )
);

CREATE POLICY "Authenticated users can read templates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'doc-templates');

CREATE POLICY "N4+ can delete templates"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'doc-templates' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND global_role >= 'franchisor_admin'
  )
);

-- RLS policies for doc-generated bucket (previews + final docs)
CREATE POLICY "Users can read their agency docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'doc-generated'
  AND (
    -- Path format: {agency_id}/...
    (storage.foldername(name))[1] IN (
      SELECT agency_id::text FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND global_role >= 'franchisor_admin'
    )
  )
);

CREATE POLICY "Edge functions can write generated docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'doc-generated');

CREATE POLICY "Edge functions can update generated docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'doc-generated');

CREATE POLICY "N2+ can delete generated docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'doc-generated'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT agency_id::text FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND global_role >= 'franchisor_admin'
    )
  )
);