-- Supprimer toutes les policies existantes sur support_tickets
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'support_tickets'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON support_tickets';
    END LOOP;
END $$;

-- Créer les nouvelles policies
-- Admin users can do everything
CREATE POLICY "Admins can manage all tickets"
  ON support_tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Support staff can manage all tickets
CREATE POLICY "Support staff can manage all tickets"
  ON support_tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'support'
    )
  );

-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets"
  ON support_tickets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tickets
CREATE POLICY "Users can insert their own tickets"
  ON support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets (for rating)
CREATE POLICY "Users can update their own tickets"
  ON support_tickets
  FOR UPDATE
  USING (auth.uid() = user_id);