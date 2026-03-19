
-- Fix security linter issues

-- 1. Fix view security: set SECURITY INVOKER explicitly
ALTER VIEW public.agency_financial_summary SET (security_invoker = on);

-- 2. Fix function search_path for trigger functions
CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_prevent_locked_month_update()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL AND NEW.locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Ce mois est verrouillé et ne peut pas être modifié';
  END IF;
  RETURN NEW;
END;
$$;
