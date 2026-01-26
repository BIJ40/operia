-- Permettre la lecture anonyme des blocks (guide public)
-- Les policies INSERT/UPDATE/DELETE restent protégées (admin N5+)
CREATE POLICY "Public can read blocks"
ON public.blocks
FOR SELECT
TO anon
USING (true);