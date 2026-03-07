-- Fix: UPDATE policy needs WITH CHECK for upsert to work
DROP POLICY IF EXISTS "Users can update their agency admin documents" ON agency_admin_documents;
CREATE POLICY "Users can update their agency admin documents"
  ON agency_admin_documents FOR UPDATE TO authenticated
  USING (agency_id IN (SELECT profiles.agency_id FROM profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (agency_id IN (SELECT profiles.agency_id FROM profiles WHERE profiles.id = auth.uid()));
