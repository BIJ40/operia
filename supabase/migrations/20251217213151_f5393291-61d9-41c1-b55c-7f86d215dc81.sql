-- Sync Apogée technician link between profiles and collaborators

-- 1) profiles.apogee_user_id -> collaborators.apogee_user_id
CREATE OR REPLACE FUNCTION public.sync_apogee_user_id_profiles_to_collaborators()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent recursion if the UPDATE below triggers the reverse trigger
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'INSERT') OR (NEW.apogee_user_id IS DISTINCT FROM OLD.apogee_user_id) THEN
    UPDATE public.collaborators
    SET apogee_user_id = NEW.apogee_user_id,
        updated_at = now()
    WHERE user_id = NEW.id
      AND apogee_user_id IS DISTINCT FROM NEW.apogee_user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_apogee_user_id ON public.profiles;
CREATE TRIGGER trg_profiles_sync_apogee_user_id
AFTER INSERT OR UPDATE OF apogee_user_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_apogee_user_id_profiles_to_collaborators();


-- 2) collaborators.apogee_user_id -> profiles.apogee_user_id
CREATE OR REPLACE FUNCTION public.sync_apogee_user_id_collaborators_to_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'INSERT') OR (NEW.apogee_user_id IS DISTINCT FROM OLD.apogee_user_id) THEN
    UPDATE public.profiles
    SET apogee_user_id = NEW.apogee_user_id,
        updated_at = now()
    WHERE id = NEW.user_id
      AND NEW.user_id IS NOT NULL
      AND apogee_user_id IS DISTINCT FROM NEW.apogee_user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_collaborators_sync_apogee_user_id ON public.collaborators;
CREATE TRIGGER trg_collaborators_sync_apogee_user_id
AFTER INSERT OR UPDATE OF apogee_user_id ON public.collaborators
FOR EACH ROW
EXECUTE FUNCTION public.sync_apogee_user_id_collaborators_to_profiles();


-- 3) One-time backfill (keeps existing non-null values if already present)
UPDATE public.collaborators c
SET apogee_user_id = p.apogee_user_id,
    updated_at = now()
FROM public.profiles p
WHERE c.user_id = p.id
  AND c.apogee_user_id IS NULL
  AND p.apogee_user_id IS NOT NULL;

UPDATE public.profiles p
SET apogee_user_id = c.apogee_user_id,
    updated_at = now()
FROM public.collaborators c
WHERE c.user_id = p.id
  AND p.apogee_user_id IS NULL
  AND c.apogee_user_id IS NOT NULL;
