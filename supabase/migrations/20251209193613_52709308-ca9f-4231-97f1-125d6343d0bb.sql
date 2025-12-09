-- Add apogee_user_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS apogee_user_id INTEGER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_apogee_user_id ON public.profiles(apogee_user_id);

-- Update sync trigger to include apogee_user_id sync from profiles to collaborators
CREATE OR REPLACE FUNCTION public.sync_collaborator_on_profile_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Éviter la récursion infinie
  IF current_setting('app.syncing_from_collaborator', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  -- Marquer qu'on synchronise depuis profile
  PERFORM set_config('app.syncing_from_profile', 'true', true);
  
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

-- Update auto_create_collaborator to include apogee_user_id
CREATE OR REPLACE FUNCTION public.auto_create_collaborator()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Créer collaborateur seulement si l'utilisateur a une agence
  IF NEW.agency_id IS NOT NULL THEN
    INSERT INTO collaborators (
      agency_id,
      user_id,
      first_name,
      last_name,
      email,
      phone,
      is_registered_user,
      type,
      role,
      apogee_user_id,
      created_by
    )
    VALUES (
      NEW.agency_id,
      NEW.id,
      COALESCE(NEW.first_name, ''),
      COALESCE(NEW.last_name, ''),
      NEW.email,
      NEW.phone,
      true,
      CASE 
        WHEN LOWER(NEW.role_agence) LIKE '%technic%' THEN 'TECHNICIEN'
        WHEN LOWER(NEW.role_agence) LIKE '%assist%' THEN 'ASSISTANTE'
        WHEN LOWER(NEW.role_agence) LIKE '%dirig%' OR LOWER(NEW.role_agence) LIKE '%gérant%' THEN 'DIRIGEANT'
        WHEN LOWER(NEW.role_agence) LIKE '%commerc%' THEN 'COMMERCIAL'
        ELSE 'AUTRE'
      END,
      COALESCE(NULLIF(NEW.role_agence, ''), 'autre'),
      NEW.apogee_user_id,
      NEW.id
    )
    ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      apogee_user_id = EXCLUDED.apogee_user_id,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;