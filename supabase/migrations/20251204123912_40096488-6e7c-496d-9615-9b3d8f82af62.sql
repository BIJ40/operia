-- SUP-P0-01 & SUP-P1-02: Add indexes for performance on support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_type_status ON public.support_tickets(type, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_viewed_assigned ON public.support_tickets(viewed_by_support_at, assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);

-- SUP-P1-06: Fix RLS for internal messages - users should NOT see internal notes
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.support_messages;

-- Create new policy that filters out internal notes for non-support users
CREATE POLICY "Users can view messages for their tickets" ON public.support_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t 
    WHERE t.id = support_messages.ticket_id 
    AND (
      t.user_id = auth.uid() 
      OR t.assigned_to = auth.uid() 
      OR is_support_agent(auth.uid()) 
      OR has_min_global_role(auth.uid(), 5)
    )
  )
  AND (
    -- Internal notes only visible to support agents and admins
    support_messages.is_internal_note = false 
    OR is_support_agent(auth.uid()) 
    OR has_min_global_role(auth.uid(), 5)
  )
);