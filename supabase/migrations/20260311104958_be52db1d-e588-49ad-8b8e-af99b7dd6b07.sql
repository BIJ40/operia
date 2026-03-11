-- Add UPDATE policy on apogee_ticket_comments so users can edit their own comments
CREATE POLICY "Users can update own comments"
  ON public.apogee_ticket_comments FOR UPDATE TO authenticated
  USING (created_by_user_id = auth.uid() AND has_apogee_tickets_access(auth.uid()))
  WITH CHECK (created_by_user_id = auth.uid() AND has_apogee_tickets_access(auth.uid()));