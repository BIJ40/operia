-- Fix: Add missing UPDATE RLS policy for realisation_media
CREATE POLICY "Users can update media of their agency"
ON public.realisation_media
FOR UPDATE
TO authenticated
USING (agency_id = (SELECT profiles.agency_id FROM profiles WHERE profiles.id = auth.uid()))
WITH CHECK (agency_id = (SELECT profiles.agency_id FROM profiles WHERE profiles.id = auth.uid()));

-- Add EXIF date column for auto-tagging before/after
ALTER TABLE public.realisation_media
ADD COLUMN IF NOT EXISTS exif_taken_at timestamptz DEFAULT NULL;