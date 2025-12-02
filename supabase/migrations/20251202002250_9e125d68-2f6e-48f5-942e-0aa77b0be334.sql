-- Créer la fonction has_franchiseur_role() si elle n'existe pas
CREATE OR REPLACE FUNCTION public.has_franchiseur_role(_user_id UUID, _role franchiseur_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.franchiseur_roles
    WHERE user_id = _user_id
      AND franchiseur_role = _role
  )
$$;

-- Maintenant nettoyer les RLS policies obsolètes
-- RLS sur franchiseur_roles: remplacer has_role par has_min_global_role
DROP POLICY IF EXISTS "Admins can view all franchiseur roles" ON public.franchiseur_roles;
DROP POLICY IF EXISTS "Admins can manage franchiseur roles" ON public.franchiseur_roles;

CREATE POLICY "Admins can view all franchiseur roles"
  ON public.franchiseur_roles
  FOR SELECT
  USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admins can manage franchiseur roles"
  ON public.franchiseur_roles
  FOR ALL
  USING (has_min_global_role(auth.uid(), 5))
  WITH CHECK (has_min_global_role(auth.uid(), 5));

-- RLS sur franchiseur_agency_assignments
DROP POLICY IF EXISTS "Franchiseur users can view assignments" ON public.franchiseur_agency_assignments;
DROP POLICY IF EXISTS "Franchiseur directors can manage assignments" ON public.franchiseur_agency_assignments;

CREATE POLICY "Franchiseur users can view assignments"
  ON public.franchiseur_agency_assignments
  FOR SELECT
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY "Franchiseur directors can manage assignments"
  ON public.franchiseur_agency_assignments
  FOR ALL
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_min_global_role(auth.uid(), 5)
  )
  WITH CHECK (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_min_global_role(auth.uid(), 5)
  );

-- RLS sur agency_royalty_config
DROP POLICY IF EXISTS "Franchiseur users can view royalty configs" ON public.agency_royalty_config;
DROP POLICY IF EXISTS "Franchiseur directors can manage royalty configs" ON public.agency_royalty_config;

CREATE POLICY "Franchiseur users can view royalty configs"
  ON public.agency_royalty_config
  FOR SELECT
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY "Franchiseur directors can manage royalty configs"
  ON public.agency_royalty_config
  FOR ALL
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_min_global_role(auth.uid(), 5)
  )
  WITH CHECK (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_min_global_role(auth.uid(), 5)
  );

-- RLS sur agency_royalty_tiers
DROP POLICY IF EXISTS "Franchiseur users can view royalty tiers" ON public.agency_royalty_tiers;
DROP POLICY IF EXISTS "Franchiseur directors can manage royalty tiers" ON public.agency_royalty_tiers;

CREATE POLICY "Franchiseur users can view royalty tiers"
  ON public.agency_royalty_tiers
  FOR SELECT
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY "Franchiseur directors can manage royalty tiers"
  ON public.agency_royalty_tiers
  FOR ALL
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_min_global_role(auth.uid(), 5)
  )
  WITH CHECK (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_min_global_role(auth.uid(), 5)
  );

-- RLS sur agency_royalty_calculations
DROP POLICY IF EXISTS "Franchiseur users can view royalty calculations" ON public.agency_royalty_calculations;
DROP POLICY IF EXISTS "Franchiseur directors can manage royalty calculations" ON public.agency_royalty_calculations;

CREATE POLICY "Franchiseur users can view royalty calculations"
  ON public.agency_royalty_calculations
  FOR SELECT
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY "Franchiseur directors can manage royalty calculations"
  ON public.agency_royalty_calculations
  FOR ALL
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_min_global_role(auth.uid(), 5)
  )
  WITH CHECK (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_min_global_role(auth.uid(), 5)
  );