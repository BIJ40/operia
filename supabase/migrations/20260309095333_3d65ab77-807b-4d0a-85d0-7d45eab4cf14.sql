-- IMPROVE auto_create_collaborator trigger to also match by name (not just email)
-- This prevents future duplicates when a user is created and a collaborator with same name exists
CREATE OR REPLACE FUNCTION public.auto_create_collaborator()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id uuid;
BEGIN
  IF NEW.agency_id IS NOT NULL THEN
    -- Anti-doublon: chercher collaborateur existant sans user_id par email
    IF NEW.email IS NOT NULL AND TRIM(NEW.email) != '' THEN
      SELECT id INTO v_existing_id
      FROM collaborators
      WHERE agency_id = NEW.agency_id
        AND user_id IS NULL
        AND LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        UPDATE collaborators
        SET
          user_id = NEW.id,
          is_registered_user = true,
          first_name = COALESCE(NULLIF(NEW.first_name, ''), first_name),
          last_name = COALESCE(NULLIF(NEW.last_name, ''), last_name),
          phone = COALESCE(NEW.phone, phone),
          apogee_user_id = COALESCE(NEW.apogee_user_id, apogee_user_id),
          updated_at = now()
        WHERE id = v_existing_id;
        RETURN NEW;
      END IF;
    END IF;

    -- Anti-doublon: chercher par nom+prénom exact si pas trouvé par email
    IF NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL 
       AND TRIM(NEW.first_name) != '' AND TRIM(NEW.last_name) != '' THEN
      SELECT id INTO v_existing_id
      FROM collaborators
      WHERE agency_id = NEW.agency_id
        AND user_id IS NULL
        AND LOWER(TRIM(first_name)) = LOWER(TRIM(NEW.first_name))
        AND LOWER(TRIM(last_name)) = LOWER(TRIM(NEW.last_name))
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        UPDATE collaborators
        SET
          user_id = NEW.id,
          is_registered_user = true,
          email = COALESCE(NULLIF(NEW.email, ''), email),
          phone = COALESCE(NEW.phone, phone),
          apogee_user_id = COALESCE(NEW.apogee_user_id, apogee_user_id),
          updated_at = now()
        WHERE id = v_existing_id;
        RETURN NEW;
      END IF;
    END IF;

    INSERT INTO collaborators (
      agency_id, user_id, first_name, last_name, email, phone,
      is_registered_user, type, role, apogee_user_id, created_by
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
      NEW.apogee_user_id, NEW.id
    )
    ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET
      first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
      email = EXCLUDED.email, phone = EXCLUDED.phone,
      apogee_user_id = EXCLUDED.apogee_user_id, updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$;