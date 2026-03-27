CREATE OR REPLACE FUNCTION sync_collaborator_on_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.syncing_from_collaborator', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  PERFORM set_config('app.syncing_from_profile', 'true', true);
  
  IF OLD.agency_id IS NOT NULL AND NEW.agency_id IS NULL THEN
    UPDATE collaborators
    SET leaving_date = COALESCE(leaving_date, CURRENT_DATE), updated_at = now()
    WHERE user_id = NEW.id AND agency_id = OLD.agency_id AND leaving_date IS NULL;
    RETURN NEW;
  END IF;
  
  IF OLD.agency_id IS NOT NULL AND NEW.agency_id IS NOT NULL 
     AND OLD.agency_id IS DISTINCT FROM NEW.agency_id THEN
    UPDATE collaborators
    SET leaving_date = COALESCE(leaving_date, CURRENT_DATE), updated_at = now()
    WHERE user_id = NEW.id AND agency_id = OLD.agency_id AND leaving_date IS NULL;
    
    INSERT INTO collaborators (
      agency_id, user_id, first_name, last_name, email, phone,
      is_registered_user, type, role, poste, apogee_user_id
    ) VALUES (
      NEW.agency_id, NEW.id,
      COALESCE(NEW.first_name, ''), COALESCE(NEW.last_name, ''),
      NEW.email, NEW.phone, true,
      CASE 
        WHEN LOWER(NEW.role_agence) = 'technicien' THEN 'TECHNICIEN'
        WHEN LOWER(NEW.role_agence) = 'administratif' THEN 'ADMINISTRATIF'
        WHEN LOWER(NEW.role_agence) = 'dirigeant' THEN 'DIRIGEANT'
        WHEN LOWER(NEW.role_agence) = 'commercial' THEN 'COMMERCIAL'
        ELSE 'AUTRE'
      END,
      COALESCE(NULLIF(NEW.role_agence, ''), 'autre'),
      NEW.poste,
      NEW.apogee_user_id
    )
    ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET
      agency_id = EXCLUDED.agency_id,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      type = EXCLUDED.type,
      poste = EXCLUDED.poste,
      leaving_date = NULL,
      apogee_user_id = EXCLUDED.apogee_user_id,
      updated_at = now();
    RETURN NEW;
  END IF;
  
  UPDATE collaborators
  SET 
    first_name = NEW.first_name,
    last_name = NEW.last_name,
    email = COALESCE(NEW.email, email),
    phone = COALESCE(NEW.phone, phone),
    apogee_user_id = NEW.apogee_user_id,
    poste = COALESCE(NEW.poste, poste),
    type = CASE 
      WHEN NEW.role_agence IS NOT NULL AND NEW.role_agence != '' THEN
        CASE 
          WHEN LOWER(NEW.role_agence) = 'technicien' THEN 'TECHNICIEN'
          WHEN LOWER(NEW.role_agence) = 'administratif' THEN 'ADMINISTRATIF'
          WHEN LOWER(NEW.role_agence) = 'dirigeant' THEN 'DIRIGEANT'
          WHEN LOWER(NEW.role_agence) = 'commercial' THEN 'COMMERCIAL'
          ELSE type
        END
      ELSE type
    END,
    updated_at = now()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION sync_profile_on_collaborator_update()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.syncing_from_profile', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  IF NEW.user_id IS NOT NULL THEN
    PERFORM set_config('app.syncing_from_collaborator', 'true', true);
    
    UPDATE profiles
    SET 
      first_name = NEW.first_name,
      last_name = NEW.last_name,
      email = COALESCE(NEW.email, email),
      phone = COALESCE(NEW.phone, phone),
      apogee_user_id = NEW.apogee_user_id,
      role_agence = CASE
        WHEN NEW.type = 'TECHNICIEN' THEN 'technicien'
        WHEN NEW.type = 'ADMINISTRATIF' THEN 'administratif'
        WHEN NEW.type = 'DIRIGEANT' THEN 'dirigeant'
        WHEN NEW.type = 'COMMERCIAL' THEN 'commercial'
        ELSE LOWER(COALESCE(NEW.role, 'autre'))
      END,
      poste = COALESCE(NEW.poste, poste),
      agence = (SELECT slug FROM apogee_agencies WHERE id = NEW.agency_id),
      updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;