-- ============================================================================
-- FONCTION: Vérifie si l'utilisateur a le niveau global_role minimum requis
-- SECURITY DEFINER pour éviter la récursion RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_min_global_role(_user_id uuid, _min_level integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
    AND (
      CASE global_role
        WHEN 'superadmin' THEN 6
        WHEN 'platform_admin' THEN 5
        WHEN 'franchisor_admin' THEN 4
        WHEN 'franchisor_user' THEN 3
        WHEN 'franchisee_admin' THEN 2
        WHEN 'franchisee_user' THEN 1
        WHEN 'base_user' THEN 0
        ELSE 0
      END
    ) >= _min_level
  )
$$;

-- ============================================================================
-- FONCTION: Récupère l'agence de l'utilisateur (SECURITY DEFINER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_global_role_level(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    CASE p.global_role
      WHEN 'superadmin' THEN 6
      WHEN 'platform_admin' THEN 5
      WHEN 'franchisor_admin' THEN 4
      WHEN 'franchisor_user' THEN 3
      WHEN 'franchisee_admin' THEN 2
      WHEN 'franchisee_user' THEN 1
      WHEN 'base_user' THEN 0
      ELSE 0
    END,
    0
  )
  FROM public.profiles p
  WHERE p.id = _user_id
$$;

-- ============================================================================
-- NOUVELLE POLICY: N3+ peuvent voir tous les profils
-- ============================================================================
CREATE POLICY "N3+ can view all profiles"
ON public.profiles
FOR SELECT
USING (
  -- N3+ (franchisor_user et au-dessus) peuvent voir tous les profils
  public.has_min_global_role(auth.uid(), 3)
);

-- ============================================================================
-- NOUVELLE POLICY: N2 peut voir les profils de son agence
-- ============================================================================
CREATE POLICY "N2 can view same agency profiles"
ON public.profiles
FOR SELECT
USING (
  -- N2 (franchisee_admin) peut voir les profils de sa propre agence
  public.get_user_global_role_level(auth.uid()) = 2
  AND agence = public.get_user_agency(auth.uid())
);

-- ============================================================================
-- NOUVELLE POLICY: N1 peut voir les profils de son agence (lecture seule)
-- ============================================================================
CREATE POLICY "N1 can view same agency profiles"
ON public.profiles
FOR SELECT
USING (
  -- N1 (franchisee_user) peut voir les profils de sa propre agence
  public.get_user_global_role_level(auth.uid()) = 1
  AND agence = public.get_user_agency(auth.uid())
);