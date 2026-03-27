-- Fix 1: Restrict sms_sent_log SELECT to admin roles only (N4+)
DROP POLICY IF EXISTS "Service role only - select sms log" ON public.sms_sent_log;
CREATE POLICY "Admins can read sms_sent_log"
  ON public.sms_sent_log
  FOR SELECT
  TO authenticated
  USING (public.has_min_global_role(auth.uid(), 4));

-- Fix 2: Recreate agencies_public with security_invoker
DROP VIEW IF EXISTS public.agencies_public;
CREATE VIEW public.agencies_public
WITH (security_invoker = on) AS
SELECT id, slug, name, logo_url, primary_color, is_default, is_active, stripe_enabled, google_reviews_url, created_at, updated_at
FROM agency_suivi_settings
WHERE is_active = true;