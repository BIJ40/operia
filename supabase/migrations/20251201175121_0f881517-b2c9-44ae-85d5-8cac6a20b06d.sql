-- Create storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-images', 'announcement-images', true);

-- RLS policies for announcement-images bucket
-- Allow authenticated users to view all images (bucket is public)
CREATE POLICY "Anyone can view announcement images"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcement-images');

-- Allow franchisor_user+ and platform_admin+ to upload images
CREATE POLICY "Franchisor and admins can upload announcement images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'announcement-images' 
  AND auth.uid() IN (
    SELECT id FROM profiles 
    WHERE global_role IN ('franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin')
  )
);

-- Allow franchisor_user+ and platform_admin+ to update images
CREATE POLICY "Franchisor and admins can update announcement images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'announcement-images' 
  AND auth.uid() IN (
    SELECT id FROM profiles 
    WHERE global_role IN ('franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin')
  )
);

-- Allow franchisor_user+ and platform_admin+ to delete images
CREATE POLICY "Franchisor and admins can delete announcement images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'announcement-images' 
  AND auth.uid() IN (
    SELECT id FROM profiles 
    WHERE global_role IN ('franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin')
  )
);