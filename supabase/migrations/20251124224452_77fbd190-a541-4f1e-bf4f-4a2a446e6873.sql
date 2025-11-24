-- Permettre aux utilisateurs de marquer leurs propres tickets comme résolus
CREATE POLICY "Users can resolve their own tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status != 'resolved')
WITH CHECK (
  auth.uid() = user_id 
  AND status = 'resolved'
  AND resolved_at IS NOT NULL
);