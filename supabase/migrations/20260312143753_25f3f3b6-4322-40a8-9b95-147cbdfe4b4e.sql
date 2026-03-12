
-- =============================================================================
-- FIX: sync_collaborator_on_profile_update — handle agency removal (value→NULL)
-- FIX: Normalize agence empty string to NULL on profiles
-- =============================================================================

-- 1. Updated sync function: handles agency_id going NULL (soft-delete collaborator)
CREATE OR REPLACE FUNCTION public.sync_collaborator_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Avoid infinite recursion
  IF current_setting('app.syncing_from_collaborator', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  PERFORM set_config('app.syncing_from_profile', 'true', true);
  
  -- CASE 1: Agency removed (value → NULL) — soft-delete collaborator
  IF OLD.agency_id IS NOT NULL AND NEW.agency_id IS NULL THEN
    UPDATE collaborators
    SET 
      leaving_date = COALESCE(leaving_date, CURRENT_DATE),
      updated_at = now()
    WHERE user_id = NEW.id
      AND agency_id = OLD.agency_id
      AND leaving_date IS NULL;
    RETURN NEW;
  END IF;
  
  -- CASE 2: Agency changed (value → different value) — soft-delete old, create new
  IF OLD.agency_id IS NOT NULL AND NEW.agency_id IS NOT NULL 
     AND OLD.agency_id IS DISTINCT FROM NEW.agency_id THEN
    -- Soft-delete old collaborator
    UPDATE collaborators
    SET 
      leaving_date = COALESCE(leaving_date, CURRENT_DATE),
      updated_at = now()
    WHERE user_id = NEW.id
      AND agency_id = OLD.agency_id
      AND leaving_date IS NULL;
    
    -- Create new collaborator for new agency
    INSERT INTO collaborators (
      agency_id, user_id, first_name, last_name, email, phone,
      is_registered_user, type, role, apogee_user_id
    ) VALUES (
      NEW.agency_id, NEW.id,
      COALESCE(NEW.first_name, ''), COALESCE(NEW.last_name, ''),
      NEW.email, NEW.phone, true,
      CASE 
        WHEN LOWER(NEW.role_agence) LIKE '%technic%' THEN 'TECHNICIEN'
        WHEN LOWER(NEW.role_agence) LIKE '%assist%' THEN 'ASSISTANTE'
        WHEN LOWER(NEW.role_agence) LIKE '%dirig%' OR LOWER(NEW.role_agence) LIKE '%gérant%' THEN 'DIRIGEANT'
        WHEN LOWER(NEW.role_agence) LIKE '%commerc%' THEN 'COMMERCIAL'
        ELSE 'AUTRE'
      END,
      COALESCE(NULLIF(NEW.role_agence, ''), 'autre'),
      NEW.apogee_user_id
    )
    ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET
      agency_id = EXCLUDED.agency_id,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      leaving_date = NULL,
      apogee_user_id = EXCLUDED.apogee_user_id,
      updated_at = now();
    RETURN NEW;
  END IF;
  
  -- CASE 3: Same agency or NULL→value — sync data
  UPDATE collaborators
  SET 
    first_name = NEW.first_name,
    last_name = NEW.last_name,
    email = COALESCE(NEW.email, email),
    phone = COALESCE(NEW.phone, phone),
    apogee_user_id = NEW.apogee_user_id,
    updated_at = now()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$function$;

-- 2. Normalize: profiles.agence empty string → NULL (cleanup existing data)
UPDATE profiles SET agence = NULL WHERE agence = '';

-- 3. Add a BEFORE UPDATE trigger to normalize agence empty string → NULL
CREATE OR REPLACE FUNCTION public.normalize_profile_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Normalize empty string to NULL for agence
  IF NEW.agence IS NOT NULL AND TRIM(NEW.agence) = '' THEN
    NEW.agence := NULL;
  END IF;
  
  -- If agence is cleared, also clear agency_id
  IF NEW.agence IS NULL AND OLD.agence IS NOT NULL THEN
    NEW.agency_id := NULL;
  END IF;
  
  -- If agency_id is cleared, also clear agence
  IF NEW.agency_id IS NULL AND OLD.agency_id IS NOT NULL THEN
    NEW.agence := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_profile_agency ON profiles;
CREATE TRIGGER trg_normalize_profile_agency
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION normalize_profile_agency();

-- 4. Remove duplicate triggers on profiles (cleanup)
DROP TRIGGER IF EXISTS auto_create_collaborator_trigger ON profiles;
DROP TRIGGER IF EXISTS on_profile_created_create_collaborator ON profiles;
DROP TRIGGER IF EXISTS sync_collaborator_trigger ON profiles;
DROP TRIGGER IF EXISTS on_profile_updated_sync_collaborator ON profiles;

-- Keep only the canonical triggers:
-- trigger_auto_create_collaborator (AFTER INSERT)
-- trigger_sync_collaborator_on_profile_update (AFTER UPDATE)

-- Fix: trigger_auto_create_collaborator should NOT fire on UPDATE
-- It was incorrectly set to AFTER UPDATE, duplicating sync work
DROP TRIGGER IF EXISTS trigger_auto_create_collaborator ON profiles;
CREATE TRIGGER trigger_auto_create_collaborator
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_collaborator();
