-- PHASE 5: Enforce agency role floor (N2 minimum for users with agency)
-- Rule: If a user has an agency, their global_role must be at least 'franchisee_admin' (N2)

-- Create the enforcement function
CREATE OR REPLACE FUNCTION enforce_agency_role_floor()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user has an agency (either via agency_id field or agence field)
  -- their role must be at least N2 (franchisee_admin)
  IF (NEW.agence IS NOT NULL AND NEW.agence != '') THEN
    -- Check if role is NULL, N0 (base_user), or N1 (franchisee_user)
    IF NEW.global_role IS NULL 
       OR NEW.global_role = 'base_user' 
       OR NEW.global_role = 'franchisee_user' THEN
      -- Upgrade to N2 (franchisee_admin)
      NEW.global_role := 'franchisee_admin';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on profiles table
DROP TRIGGER IF EXISTS trg_enforce_agency_role_floor ON profiles;

CREATE TRIGGER trg_enforce_agency_role_floor
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION enforce_agency_role_floor();

-- Add a comment for documentation
COMMENT ON FUNCTION enforce_agency_role_floor() IS 
'V3.0 PHASE 5: Automatically enforces minimum role N2 (franchisee_admin) for users with an agency. 
This ensures agency users always have sufficient permissions to manage their agency.';

-- Also fix any existing users who violate this rule
UPDATE profiles
SET global_role = 'franchisee_admin'
WHERE agence IS NOT NULL 
  AND agence != ''
  AND (global_role IS NULL OR global_role IN ('base_user', 'franchisee_user'));