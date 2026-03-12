-- Phase 0: Sécurisation ticketing — ouvrir l'accès à tout utilisateur authentifié
-- Ancien comportement: vérifiait user_modules pour 'apogee_tickets' ou 'ticketing', ou N5+
-- Nouveau comportement: retourne true si l'utilisateur existe dans profiles

CREATE OR REPLACE FUNCTION public.has_apogee_tickets_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id
  );
$$;