CREATE OR REPLACE FUNCTION public.has_module_v2(_user_id uuid, _module_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM get_user_permissions(_user_id) p
    WHERE p.module_key = _module_key
    AND p.granted = true
  )
$$;