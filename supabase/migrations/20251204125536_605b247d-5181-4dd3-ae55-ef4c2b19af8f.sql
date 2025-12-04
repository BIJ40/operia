-- P0-02: Add RLS policies for rate_limits table (used by edge functions)
-- This table stores rate limiting data and should only be accessible via service role
CREATE POLICY "rate_limits_no_public_access"
  ON public.rate_limits
  FOR ALL
  USING (false);

-- P1-01: Add DELETE policy on document_requests for agency RH staff (N2+)
CREATE POLICY "document_requests_agency_delete"
  ON public.document_requests
  FOR DELETE
  USING (
    agency_id IN (
      SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid()
    )
    AND has_min_global_role(auth.uid(), 2)
  );