-- Remove api_base_url column from apogee_agencies (no longer needed)
-- URL is now constructed dynamically as https://{slug}.hc-apogee.fr/api

ALTER TABLE public.apogee_agencies DROP COLUMN IF EXISTS api_base_url;

-- Drop apogee_api_credentials table (no longer needed - using shared API key)
DROP TABLE IF EXISTS public.apogee_api_credentials;