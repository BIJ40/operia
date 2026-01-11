-- Add storage policies for rh-meetings bucket
-- Allow agency users to upload files to their agency folder
CREATE POLICY "Agency users can upload rh-meetings files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'rh-meetings' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (
    SELECT agency_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Allow agency users to view their agency files
CREATE POLICY "Agency users can view rh-meetings files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'rh-meetings'
  AND (storage.foldername(name))[1] = (
    SELECT agency_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Allow agency users to delete their agency files
CREATE POLICY "Agency users can delete rh-meetings files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'rh-meetings'
  AND (storage.foldername(name))[1] = (
    SELECT agency_id::text FROM profiles WHERE id = auth.uid()
  )
);