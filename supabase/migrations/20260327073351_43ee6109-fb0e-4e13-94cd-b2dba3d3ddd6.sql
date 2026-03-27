CREATE OR REPLACE FUNCTION public.protect_global_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si global_role n'est pas modifié, laisser passer
  IF NEW.global_role IS NOT DISTINCT FROM OLD.global_role THEN
    RETURN NEW;
  END IF;

  -- Permettre les modifications via service_role (auth.uid() est NULL)
  -- Cela couvre les edge functions qui utilisent le service_role_key
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Seuls les N5+ peuvent modifier global_role
  IF NOT has_min_global_role(auth.uid(), 5) THEN
    RAISE EXCEPTION 'Insufficient privileges to modify global_role. Required: platform_admin (N5) or higher.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;