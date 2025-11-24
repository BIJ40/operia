-- Ajouter une policy pour permettre aux admins de modifier tous les profils
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));