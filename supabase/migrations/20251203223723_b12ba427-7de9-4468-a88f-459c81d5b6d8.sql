
-- Corriger les triggers pour éviter la boucle infinie
-- Utiliser une variable de session pour bloquer la récursion

CREATE OR REPLACE FUNCTION public.sync_collaborator_on_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    email = NEW.email,
    phone = NEW.phone,
    updated_at = now()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_on_collaborator_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;
