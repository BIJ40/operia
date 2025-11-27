-- 1. Créer la fonction security definer pour obtenir l'agence utilisateur
CREATE OR REPLACE FUNCTION public.get_user_agency(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agence FROM profiles WHERE id = _user_id
$$;

-- 2. Supprimer l'ancienne politique trop permissive
DROP POLICY IF EXISTS "Authenticated users can view agencies" ON public.apogee_agencies;

-- 3. Créer la nouvelle politique restrictive basée sur les rôles
CREATE POLICY "Role-based agency access" 
ON public.apogee_agencies
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'franchiseur'::app_role)
  OR has_role(auth.uid(), 'support'::app_role)
  OR slug = public.get_user_agency(auth.uid())
);