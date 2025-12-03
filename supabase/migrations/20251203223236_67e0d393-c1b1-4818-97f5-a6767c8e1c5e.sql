
-- 1. Créer le trigger profiles → collaborators sur INSERT
DROP TRIGGER IF EXISTS trigger_auto_create_collaborator ON profiles;
CREATE TRIGGER trigger_auto_create_collaborator
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_collaborator();

-- 2. Créer le trigger profiles → collaborators sur UPDATE
DROP TRIGGER IF EXISTS trigger_sync_collaborator_on_profile_update ON profiles;
CREATE TRIGGER trigger_sync_collaborator_on_profile_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_collaborator_on_profile_update();

-- 3. Créer la fonction de sync INVERSE: collaborators → profiles
CREATE OR REPLACE FUNCTION sync_profile_on_collaborator_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sync vers profiles seulement si user_id est défini
  IF NEW.user_id IS NOT NULL THEN
    UPDATE profiles
    SET 
      first_name = COALESCE(NEW.first_name, first_name),
      last_name = COALESCE(NEW.last_name, last_name),
      email = COALESCE(NEW.email, email),
      phone = COALESCE(NEW.phone, phone),
      updated_at = now()
    WHERE id = NEW.user_id
    AND (
      first_name IS DISTINCT FROM NEW.first_name OR
      last_name IS DISTINCT FROM NEW.last_name OR
      email IS DISTINCT FROM NEW.email OR
      phone IS DISTINCT FROM NEW.phone
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Créer le trigger collaborators → profiles sur UPDATE
DROP TRIGGER IF EXISTS trigger_sync_profile_on_collaborator_update ON collaborators;
CREATE TRIGGER trigger_sync_profile_on_collaborator_update
  AFTER UPDATE ON collaborators
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_on_collaborator_update();

-- 5. Corriger immédiatement les données désynchronisées (profiles → collaborators)
UPDATE collaborators c
SET 
  first_name = p.first_name,
  last_name = p.last_name,
  email = p.email,
  phone = p.phone,
  updated_at = now()
FROM profiles p
WHERE c.user_id = p.id
AND c.user_id IS NOT NULL
AND (
  c.first_name IS DISTINCT FROM p.first_name OR
  c.last_name IS DISTINCT FROM p.last_name OR
  c.email IS DISTINCT FROM p.email
);
