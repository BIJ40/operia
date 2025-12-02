-- Update RLS policies to use has_min_global_role instead of has_franchiseur_role
-- Mapping: directeur/dg = N4+ (has_min_global_role 4)

-- Drop old policies on agency_royalty_calculations
DROP POLICY IF EXISTS "Franchiseur directors can manage royalty calculations" ON public.agency_royalty_calculations;
DROP POLICY IF EXISTS "Franchiseur users can view royalty calculations" ON public.agency_royalty_calculations;

-- Create new policies using has_min_global_role (N4+ = directeur/dg)
CREATE POLICY "Franchisor N4+ can manage royalty calculations"
ON public.agency_royalty_calculations
FOR ALL
USING (has_min_global_role(auth.uid(), 4))
WITH CHECK (has_min_global_role(auth.uid(), 4));

CREATE POLICY "Franchisor N4+ can view royalty calculations"
ON public.agency_royalty_calculations
FOR SELECT
USING (has_min_global_role(auth.uid(), 4));

-- Drop old policies on agency_royalty_config
DROP POLICY IF EXISTS "Franchiseur directors can manage royalty configs" ON public.agency_royalty_config;
DROP POLICY IF EXISTS "Franchiseur users can view royalty configs" ON public.agency_royalty_config;

-- Create new policies
CREATE POLICY "Franchisor N4+ can manage royalty configs"
ON public.agency_royalty_config
FOR ALL
USING (has_min_global_role(auth.uid(), 4))
WITH CHECK (has_min_global_role(auth.uid(), 4));

CREATE POLICY "Franchisor N4+ can view royalty configs"
ON public.agency_royalty_config
FOR SELECT
USING (has_min_global_role(auth.uid(), 4));

-- Drop old policies on agency_royalty_tiers
DROP POLICY IF EXISTS "Franchiseur directors can manage royalty tiers" ON public.agency_royalty_tiers;
DROP POLICY IF EXISTS "Franchiseur users can view royalty tiers" ON public.agency_royalty_tiers;

-- Create new policies
CREATE POLICY "Franchisor N4+ can manage royalty tiers"
ON public.agency_royalty_tiers
FOR ALL
USING (has_min_global_role(auth.uid(), 4))
WITH CHECK (has_min_global_role(auth.uid(), 4));

CREATE POLICY "Franchisor N4+ can view royalty tiers"
ON public.agency_royalty_tiers
FOR SELECT
USING (has_min_global_role(auth.uid(), 4));