-- Update RLS policy on guide_chunks to require authentication for SELECT
-- Drop existing permissive policy
DROP POLICY IF EXISTS "Anyone can view guide chunks" ON public.guide_chunks;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can read guide chunks"
ON public.guide_chunks
FOR SELECT
USING (auth.uid() IS NOT NULL);