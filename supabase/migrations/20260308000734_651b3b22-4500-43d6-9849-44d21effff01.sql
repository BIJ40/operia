-- Phase 1 Security Fix: Remove legacy base64 decoding from get_collaborator_sensitive_data
-- All access to sensitive data MUST go through the 'sensitive-data' Edge Function (AES-256-GCM)
-- This SQL function was a legacy fallback using insecure base64 "encryption"

CREATE OR REPLACE FUNCTION public.get_collaborator_sensitive_data(p_collaborator_id uuid)
RETURNS TABLE(ssn text, emergency_contact text, emergency_phone text, birth_date text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- SECURITY: Direct SQL access to sensitive data is no longer permitted.
  -- All reads/writes must go through the 'sensitive-data' Edge Function
  -- which implements AES-256-GCM encryption/decryption.
  RAISE EXCEPTION 'Direct SQL access to sensitive data is disabled. Use the sensitive-data Edge Function instead.'
    USING HINT = 'Call the sensitive-data edge function with action=read',
          ERRCODE = 'insufficient_privilege';
END;
$function$;

COMMENT ON FUNCTION public.get_collaborator_sensitive_data IS 
'DEPRECATED: Direct SQL access disabled for security. Use sensitive-data Edge Function (AES-256-GCM).';