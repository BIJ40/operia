
-- ============================================================================
-- HOTFIX CRITIQUE : Empêcher l'auto-promotion via profiles.global_role
-- 
-- Problème : La policy RLS "Users can update their own profile" (PERMISSIVE)
-- permet à tout utilisateur authentifié de modifier TOUTES les colonnes de 
-- sa propre ligne, y compris global_role → escalade de privilèges.
--
-- Solution : Trigger BEFORE UPDATE qui bloque toute modification de global_role
-- sauf si l'appelant est N5+ (platform_admin ou superadmin).
-- Le trigger utilise has_min_global_role() qui est SECURITY DEFINER.
-- ============================================================================

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

  -- Seuls les N5+ peuvent modifier global_role
  -- auth.uid() retourne l'ID de l'utilisateur courant (contexte RLS)
  IF NOT has_min_global_role(auth.uid(), 5) THEN
    RAISE EXCEPTION 'Insufficient privileges to modify global_role. Required: platform_admin (N5) or higher.'
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  RETURN NEW;
END;
$$;

-- Attacher le trigger à profiles
DROP TRIGGER IF EXISTS trg_protect_global_role ON public.profiles;
CREATE TRIGGER trg_protect_global_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_global_role_update();

-- Également protéger les colonnes sensibles : support_level, is_active
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- support_level : seuls N5+ peuvent modifier
  IF NEW.support_level IS DISTINCT FROM OLD.support_level THEN
    IF NOT has_min_global_role(auth.uid(), 5) THEN
      RAISE EXCEPTION 'Insufficient privileges to modify support_level.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- is_active : seuls N3+ peuvent modifier (désactiver un utilisateur)
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    IF NOT has_min_global_role(auth.uid(), 3) THEN
      RAISE EXCEPTION 'Insufficient privileges to modify is_active.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_sensitive_profile_cols ON public.profiles;
CREATE TRIGGER trg_protect_sensitive_profile_cols
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_columns();
