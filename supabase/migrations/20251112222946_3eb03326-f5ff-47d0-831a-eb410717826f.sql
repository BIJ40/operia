-- Fonction pour attribuer le rôle admin au premier utilisateur uniquement
CREATE OR REPLACE FUNCTION public.assign_admin_to_first_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Compter le nombre d'utilisateurs existants dans user_roles
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  
  -- Si c'est le premier utilisateur (table vide), on le rend admin
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
    
    RAISE LOG 'Premier utilisateur créé avec rôle admin: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger sur auth.users pour le premier utilisateur
DROP TRIGGER IF EXISTS on_first_user_created ON auth.users;
CREATE TRIGGER on_first_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_admin_to_first_user();