
-- 1. D'abord supprimer les logs d'audit liés aux collaborateurs orphelins
DELETE FROM rh_audit_log 
WHERE collaborator_id IN (
  SELECT id FROM collaborators WHERE user_id IS NULL
);

DELETE FROM rh_audit_log 
WHERE collaborator_id IN (
  SELECT c.id FROM collaborators c
  WHERE c.user_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = c.user_id 
    AND p.agency_id IS NOT NULL
    AND p.agency_id != c.agency_id
  )
);

-- 2. Nettoyage des collaborateurs orphelins (user_id = NULL)
DELETE FROM collaborators 
WHERE user_id IS NULL;

-- 3. Nettoyage des collaborateurs dont le profile a changé d'agence
DELETE FROM collaborators c
WHERE c.user_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = c.user_id 
  AND p.agency_id IS NOT NULL
  AND p.agency_id != c.agency_id
);

-- 4. Corriger le trigger de synchronisation pour inclure agency_id
CREATE OR REPLACE FUNCTION sync_profile_to_collaborator()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE collaborators 
  SET 
    first_name = COALESCE(NEW.first_name, first_name),
    last_name = COALESCE(NEW.last_name, last_name),
    email = NEW.email,
    phone = NEW.phone,
    role = COALESCE(NEW.role_agence, role),
    agency_id = COALESCE(NEW.agency_id, agency_id)
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger pour gérer les suppressions de profiles
CREATE OR REPLACE FUNCTION handle_profile_deletion()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE collaborators 
  SET 
    leaving_date = CURRENT_DATE,
    user_id = NULL
  WHERE user_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_delete ON profiles;
CREATE TRIGGER on_profile_delete
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_deletion();
