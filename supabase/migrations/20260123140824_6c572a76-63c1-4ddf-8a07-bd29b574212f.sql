-- Fix: Allow users to SELECT their own support-created tickets
-- The INSERT now works, but the subsequent SELECT fails due to restrictive SELECT policy

-- Drop the old SELECT policy
DROP POLICY IF EXISTS "Users can read tickets - superadmin bypass" ON public.apogee_tickets;

-- Create a new SELECT policy that allows:
-- 1. Module access (as before)
-- 2. Own support-created tickets
CREATE POLICY "Users can read tickets - module or own support tickets" 
ON public.apogee_tickets 
FOR SELECT 
USING (
  -- Option 1: User has module access
  has_apogee_tickets_access(auth.uid())
  OR
  -- Option 2: User created this ticket from support
  (
    auth.uid() IS NOT NULL
    AND created_from = 'support'
    AND support_initiator_user_id = auth.uid()
  )
);