-- Add storage policies for rh-documents bucket
CREATE POLICY "Authenticated users can upload rh documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rh-documents');

CREATE POLICY "Authenticated users can view rh documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rh-documents');

CREATE POLICY "Authenticated users can update rh documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'rh-documents')
  WITH CHECK (bucket_id = 'rh-documents');

CREATE POLICY "Authenticated users can delete rh documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'rh-documents');
