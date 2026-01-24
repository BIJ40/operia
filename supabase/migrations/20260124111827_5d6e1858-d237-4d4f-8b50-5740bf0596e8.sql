-- Fix search_path for the enforce_agency_role_floor function
CREATE OR REPLACE FUNCTION public.enforce_agency_role_floor()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the user has an agency, their role must be at least N2 (franchisee_admin)
  IF (NEW.agence IS NOT NULL AND NEW.agence != '') THEN
    IF NEW.global_role IS NULL 
       OR NEW.global_role = 'base_user' 
       OR NEW.global_role = 'franchisee_user' THEN
      NEW.global_role := 'franchisee_admin';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;