-- =============================================
-- FIX: Explicit denial of anonymous access to profiles table
-- This ensures unauthenticated users cannot read profile data
-- =============================================

-- Drop any existing baseline policy if it exists
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Create explicit denial for anonymous (unauthenticated) users
-- All SELECT policies already require auth.uid(), but this makes denial explicit
CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
FOR SELECT 
TO anon
USING (false);

-- Also ensure the anon role cannot INSERT, UPDATE or DELETE
DROP POLICY IF EXISTS "Deny anonymous insert to profiles" ON public.profiles;
CREATE POLICY "Deny anonymous insert to profiles" 
ON public.profiles 
FOR INSERT 
TO anon
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anonymous update to profiles" ON public.profiles;
CREATE POLICY "Deny anonymous update to profiles" 
ON public.profiles 
FOR UPDATE 
TO anon
USING (false);

DROP POLICY IF EXISTS "Deny anonymous delete to profiles" ON public.profiles;
CREATE POLICY "Deny anonymous delete to profiles" 
ON public.profiles 
FOR DELETE 
TO anon
USING (false);

-- =============================================
-- FIX: Enhanced access logging for collaborator_sensitive_data
-- Add index for audit queries on access logs
-- =============================================

-- Add index on last_accessed_at for audit trail queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_collaborator_sensitive_data_last_accessed 
ON public.collaborator_sensitive_data(last_accessed_at DESC);

-- Add index on last_accessed_by for user-based audit queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_collaborator_sensitive_data_last_accessed_by 
ON public.collaborator_sensitive_data(last_accessed_by);

-- Comment documenting security measures in place
COMMENT ON TABLE public.collaborator_sensitive_data IS 
'RGPD-protected sensitive employee data. Security measures:
1. AES-256-GCM encryption via Edge Function (sensitive-data)
2. Access logged via last_accessed_by/last_accessed_at columns
3. RLS restricts to RH admins of same agency or platform admins
4. Edge Function validates auth + permissions before decrypt';