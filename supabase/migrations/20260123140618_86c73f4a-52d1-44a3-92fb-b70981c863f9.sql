-- Update the INSERT policy to allow support ticket creation
-- Users should be able to create tickets from support chat even without apogee_tickets module access

DROP POLICY IF EXISTS "Users can insert tickets - superadmin bypass" ON public.apogee_tickets;

CREATE POLICY "Users can insert tickets - authenticated or module access" 
ON public.apogee_tickets 
FOR INSERT 
WITH CHECK (
  -- Option 1: User has module access
  has_apogee_tickets_access(auth.uid())
  OR
  -- Option 2: User is authenticated AND creating a support-originated ticket for themselves
  (
    auth.uid() IS NOT NULL
    AND created_from = 'support'
    AND created_by_user_id = auth.uid()
    AND support_initiator_user_id = auth.uid()
  )
);