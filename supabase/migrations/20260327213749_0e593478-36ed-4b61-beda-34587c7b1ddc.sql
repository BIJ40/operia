
-- Phase 1: Rename suivi module tables (NOT the main SaaS agencies table apogee_agencies)
ALTER TABLE public.agencies RENAME TO agency_suivi_settings;
ALTER TABLE public.payments RENAME TO payments_clients_suivi;

-- Recreate the public view used by the suivi client portal
DROP VIEW IF EXISTS public.agencies_public;
CREATE VIEW public.agencies_public AS
SELECT id,
    slug,
    name,
    logo_url,
    primary_color,
    is_default,
    is_active,
    stripe_enabled,
    google_reviews_url,
    created_at,
    updated_at
FROM public.agency_suivi_settings
WHERE is_active = true;

-- Rename RLS policies on payments_clients_suivi to reflect new table name
ALTER POLICY "Service role can insert payments" ON public.payments_clients_suivi RENAME TO "Service role can insert payments_clients_suivi";
ALTER POLICY "Service role can read payments" ON public.payments_clients_suivi RENAME TO "Service role can read payments_clients_suivi";
