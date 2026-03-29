CREATE OR REPLACE FUNCTION public.has_module_v2(_user_id uuid, _module_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_access
    WHERE user_id = _user_id
      AND module_key = _module_key
      AND granted = true
      AND access_level <> 'none'
  );
$$;