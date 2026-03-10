
-- Allow admins (min_role >= 5) to read apporteur_sessions for audit purposes
CREATE POLICY "admins_can_read_sessions_for_audit"
  ON public.apporteur_sessions
  FOR SELECT
  TO authenticated
  USING (has_min_global_role(auth.uid(), 5));
