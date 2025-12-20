-- Fix function search_path security warnings
CREATE OR REPLACE FUNCTION update_epi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION get_collaborator_for_user(p_user_id UUID)
RETURNS TABLE(collaborator_id UUID, collaborator_agency_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.agency_id
  FROM public.collaborators c
  JOIN public.profiles p ON c.email = p.email OR c.id = (
    SELECT col.id FROM public.collaborators col WHERE col.email = (SELECT pr.email FROM auth.users au JOIN public.profiles pr ON pr.id = au.id WHERE au.id = p_user_id)
  )
  WHERE p.id = p_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;