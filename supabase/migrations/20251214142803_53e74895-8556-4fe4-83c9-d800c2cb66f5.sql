-- Corriger le trigger sync_profile_on_collaborator_update pour inclure role et agency_id
CREATE OR REPLACE FUNCTION public.sync_profile_on_collaborator_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Éviter la récursion infinie
  IF current_setting('app.syncing_from_profile', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  -- Sync vers profiles si user_id est défini
  IF NEW.user_id IS NOT NULL THEN
    -- Marquer qu'on synchronise depuis collaborator
    PERFORM set_config('app.syncing_from_collaborator', 'true', true);
    
    UPDATE profiles
    SET 
      first_name = NEW.first_name,
      last_name = NEW.last_name,
      email = COALESCE(NEW.email, email),
      phone = COALESCE(NEW.phone, phone),
      apogee_user_id = NEW.apogee_user_id,
      role_agence = NEW.role,
      agence = (SELECT slug FROM apogee_agencies WHERE id = NEW.agency_id),
      updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Backfill: synchroniser les role_agence manquants depuis collaborators
UPDATE profiles p
SET role_agence = c.role
FROM collaborators c
WHERE c.user_id = p.id
  AND c.role IS NOT NULL
  AND (p.role_agence IS NULL OR p.role_agence != c.role);

-- Backfill: synchroniser les agence manquants depuis collaborators  
UPDATE profiles p
SET agence = a.slug
FROM collaborators c
JOIN apogee_agencies a ON a.id = c.agency_id
WHERE c.user_id = p.id
  AND c.agency_id IS NOT NULL
  AND (p.agence IS NULL OR p.agence != a.slug);