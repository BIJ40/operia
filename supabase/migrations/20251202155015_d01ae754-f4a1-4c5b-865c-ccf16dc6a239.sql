-- Update RLS policies on franchiseur_agency_assignments to use has_min_global_role

-- Drop old policies
DROP POLICY IF EXISTS "Franchiseur users can view assignments" ON public.franchiseur_agency_assignments;
DROP POLICY IF EXISTS "Franchiseur directors can manage assignments" ON public.franchiseur_agency_assignments;

-- Create new policies using has_min_global_role
-- N3+ can view assignments (animateur level and above)
CREATE POLICY "Franchisor N3+ can view assignments"
ON public.franchiseur_agency_assignments
FOR SELECT
USING (has_min_global_role(auth.uid(), 3));

-- N4+ can manage assignments (directeur level and above)
CREATE POLICY "Franchisor N4+ can manage assignments"
ON public.franchiseur_agency_assignments
FOR ALL
USING (has_min_global_role(auth.uid(), 4))
WITH CHECK (has_min_global_role(auth.uid(), 4));

-- Now drop the obsolete has_franchiseur_role function
DROP FUNCTION IF EXISTS public.has_franchiseur_role(uuid, franchiseur_role);