-- =============================================================================
-- TICKET 4: RLS SECURITY FIXES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. apogee_guides - Fix "Temporary full access" vulnerability
-- -----------------------------------------------------------------------------

-- Drop the vulnerable policy
DROP POLICY IF EXISTS "Temporary full access for authenticated users" ON public.apogee_guides;

-- Create proper policies
CREATE POLICY "Authenticated users can read guides"
ON public.apogee_guides
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Franchisor admin can insert guides"
ON public.apogee_guides
FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 4));

CREATE POLICY "Franchisor admin can update guides"
ON public.apogee_guides
FOR UPDATE
USING (has_min_global_role(auth.uid(), 4));

CREATE POLICY "Platform admin can delete guides"
ON public.apogee_guides
FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

-- -----------------------------------------------------------------------------
-- 2. planning_signatures - Restrict INSERT/DELETE to authorized users
-- -----------------------------------------------------------------------------

-- Drop existing permissive policies if any
DROP POLICY IF EXISTS "Users can insert planning signatures" ON public.planning_signatures;
DROP POLICY IF EXISTS "Users can delete planning signatures" ON public.planning_signatures;

-- INSERT: user must be franchisor+ OR be the signer themselves
CREATE POLICY "Authorized users can insert planning signatures"
ON public.planning_signatures
FOR INSERT
WITH CHECK (
  has_min_global_role(auth.uid(), 3) 
  OR auth.uid() = signed_by_user_id
);

-- DELETE: same restriction as INSERT
CREATE POLICY "Authorized users can delete planning signatures"
ON public.planning_signatures
FOR DELETE
USING (
  has_min_global_role(auth.uid(), 3)
  OR auth.uid() = signed_by_user_id
);

-- -----------------------------------------------------------------------------
-- 3. support_attachments - Restrict INSERT to ticket owner or support staff
-- -----------------------------------------------------------------------------

-- Drop existing permissive INSERT policy
DROP POLICY IF EXISTS "Users can insert support attachments" ON public.support_attachments;

-- INSERT: user is ticket creator OR has franchisor_user+ role
CREATE POLICY "Ticket owner or support can insert attachments"
ON public.support_attachments
FOR INSERT
WITH CHECK (
  has_min_global_role(auth.uid(), 3)
  OR EXISTS (
    SELECT 1 FROM support_tickets st
    WHERE st.id = ticket_id
    AND st.user_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- 4. apogee_ticket_attachments - Restrict to apogee_tickets module users
-- -----------------------------------------------------------------------------

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated can insert attachments" ON public.apogee_ticket_attachments;
DROP POLICY IF EXISTS "Authenticated can view attachments" ON public.apogee_ticket_attachments;

-- SELECT: users with apogee_tickets module OR platform_admin+
CREATE POLICY "Apogee tickets users can view attachments"
ON public.apogee_ticket_attachments
FOR SELECT
USING (
  (SELECT ((profiles.enabled_modules->'apogee_tickets'->>'enabled')::boolean)
   FROM profiles WHERE profiles.id = auth.uid()) = true
  OR has_min_global_role(auth.uid(), 5)
);

-- INSERT: same restriction
CREATE POLICY "Apogee tickets users can insert attachments"
ON public.apogee_ticket_attachments
FOR INSERT
WITH CHECK (
  (SELECT ((profiles.enabled_modules->'apogee_tickets'->>'enabled')::boolean)
   FROM profiles WHERE profiles.id = auth.uid()) = true
  OR has_min_global_role(auth.uid(), 5)
);