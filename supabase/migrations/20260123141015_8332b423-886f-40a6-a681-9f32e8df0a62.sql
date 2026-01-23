-- Fix: Allow users to INSERT exchanges on their own support tickets
-- The issue is that the subquery checks apogee_tickets which the user cannot SELECT

DROP POLICY IF EXISTS "exchanges_insert_policy" ON public.apogee_ticket_support_exchanges;

-- Create a more permissive INSERT policy using SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.can_insert_exchange_for_ticket(p_ticket_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_support_initiator_id uuid;
BEGIN
  -- Superadmins and module access always allowed
  IF has_min_global_role(p_user_id, 3) OR has_apogee_tickets_access(p_user_id) THEN
    RETURN true;
  END IF;
  
  -- Check if user is the support initiator of this ticket
  SELECT support_initiator_user_id INTO v_support_initiator_id
  FROM apogee_tickets
  WHERE id = p_ticket_id;
  
  RETURN v_support_initiator_id = p_user_id;
END;
$$;

CREATE POLICY "exchanges_insert_policy" 
ON public.apogee_ticket_support_exchanges 
FOR INSERT 
WITH CHECK (
  sender_user_id = auth.uid()
  AND can_insert_exchange_for_ticket(ticket_id, auth.uid())
);