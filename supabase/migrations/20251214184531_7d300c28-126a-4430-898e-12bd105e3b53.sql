
-- Corriger le search_path des deux nouvelles fonctions
CREATE OR REPLACE FUNCTION sync_profile_to_collaborator()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.collaborators 
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION handle_profile_deletion()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.collaborators 
  SET 
    leaving_date = CURRENT_DATE,
    user_id = NULL
  WHERE user_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
