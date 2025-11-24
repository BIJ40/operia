-- Fonction pour récupérer l'email d'un utilisateur à partir de son pseudo
CREATE OR REPLACE FUNCTION public.get_email_from_pseudo(_pseudo text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _email text;
BEGIN
  -- Chercher l'ID de l'utilisateur avec ce pseudo
  SELECT id INTO _user_id
  FROM public.profiles
  WHERE LOWER(pseudo) = LOWER(_pseudo)
  LIMIT 1;
  
  -- Si trouvé, récupérer l'email depuis auth.users
  IF _user_id IS NOT NULL THEN
    SELECT email INTO _email
    FROM auth.users
    WHERE id = _user_id
    LIMIT 1;
    
    RETURN _email;
  END IF;
  
  -- Si non trouvé, retourner le format par défaut
  RETURN _pseudo || '@internal.helpogee.local';
END;
$$;