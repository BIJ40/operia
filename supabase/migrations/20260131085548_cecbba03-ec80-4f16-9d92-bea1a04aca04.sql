-- =====================================================
-- MEDIA LIBRARY STORAGE BUCKET
-- =====================================================

-- Create storage bucket for media library
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-library',
  'media-library',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-rar-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STORAGE RLS POLICIES
-- =====================================================

-- Policy: Users can upload files to their agency folder
CREATE POLICY "media_library_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-library'
  AND (storage.foldername(name))[1] = public.get_user_agency_id(auth.uid())::text
);

-- Policy: Users can view files from their agency
CREATE POLICY "media_library_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'media-library'
  AND (
    -- N5+ can access all files
    public.has_min_global_role(auth.uid(), 5)
    OR
    -- Same agency
    (storage.foldername(name))[1] = public.get_user_agency_id(auth.uid())::text
  )
);

-- Policy: Users can update their agency files
CREATE POLICY "media_library_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media-library'
  AND (
    public.has_min_global_role(auth.uid(), 5)
    OR
    (storage.foldername(name))[1] = public.get_user_agency_id(auth.uid())::text
  )
);

-- Policy: Users can delete their agency files (only with can_manage_media)
CREATE POLICY "media_library_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media-library'
  AND (
    public.has_min_global_role(auth.uid(), 5)
    OR
    (
      (storage.foldername(name))[1] = public.get_user_agency_id(auth.uid())::text
      AND public.can_manage_media(auth.uid())
    )
  )
);