-- Fonction RPC SECURITY DEFINER pour récupérer les N2+ d'une agence
-- Contourne les RLS pour permettre à N1 de trouver les destinataires de notif
CREATE OR REPLACE FUNCTION public.get_agency_rh_managers(p_agency_id uuid)
RETURNS TABLE(id uuid, first_name text, last_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name
  FROM public.profiles p
  WHERE p.agency_id = p_agency_id
    AND (
      -- N2+ (franchisee_admin et plus)
      p.global_role IN ('franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin')
      OR
      -- Ou a le rôle RH sur cette agence
      EXISTS (
        SELECT 1 FROM public.agency_rh_roles r 
        WHERE r.user_id = p.id AND r.agency_id = p_agency_id
      )
    );
$$;

-- Permissions
REVOKE ALL ON FUNCTION public.get_agency_rh_managers(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_agency_rh_managers(uuid) TO authenticated;