-- Add INSERT policy for support-attachments bucket
CREATE POLICY "Authenticated users can upload support attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'support-attachments' AND auth.uid() IS NOT NULL);

-- Add DELETE policy for support-attachments bucket (for user to delete their own)
CREATE POLICY "Users can delete their own support attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'support-attachments' 
  AND (
    has_min_global_role(auth.uid(), 5) 
    OR has_support_access(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT id::text FROM support_tickets WHERE user_id = auth.uid()
    )
  )
);