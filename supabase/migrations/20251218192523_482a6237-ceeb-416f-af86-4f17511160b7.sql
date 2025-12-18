-- Create storage bucket for RH meetings files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rh-meetings', 'rh-meetings', false, 52428800, ARRAY['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for rh-meetings bucket
CREATE POLICY "Users can view their agency meeting files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'rh-meetings' AND
  (storage.foldername(name))[1] IN (
    SELECT agency_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can upload to their agency meeting files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'rh-meetings' AND
  (storage.foldername(name))[1] IN (
    SELECT agency_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their agency meeting files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'rh-meetings' AND
  (storage.foldername(name))[1] IN (
    SELECT agency_id::text FROM public.profiles WHERE id = auth.uid()
  )
);