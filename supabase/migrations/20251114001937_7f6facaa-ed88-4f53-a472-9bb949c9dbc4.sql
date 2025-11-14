-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Only admins can insert blocks" ON public.blocks;
DROP POLICY IF EXISTS "Only admins can update blocks" ON public.blocks;
DROP POLICY IF EXISTS "Only admins can delete blocks" ON public.blocks;

-- Recréer les politiques avec la fonction has_role
CREATE POLICY "Only admins can insert blocks"
  ON public.blocks
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update blocks"
  ON public.blocks
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete blocks"
  ON public.blocks
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));