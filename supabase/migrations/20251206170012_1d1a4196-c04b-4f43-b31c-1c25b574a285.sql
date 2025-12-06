-- Fix security warning: set search_path on set_guide_chunks_updated_at
CREATE OR REPLACE FUNCTION public.set_guide_chunks_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;