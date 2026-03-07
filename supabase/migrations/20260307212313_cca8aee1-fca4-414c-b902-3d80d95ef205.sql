-- FIX: time_events UPDATE/DELETE missing agency scope
DROP POLICY IF EXISTS "time_events_update_n2" ON time_events;
DROP POLICY IF EXISTS "time_events_delete_n2" ON time_events;

CREATE POLICY "time_events_update_n2"
ON time_events
FOR UPDATE
TO authenticated
USING (
  (collaborator_id IN (
    SELECT c.id FROM collaborators c
    WHERE c.agency_id = get_user_agency_id(auth.uid())
  ) AND has_min_global_role(auth.uid(), 2))
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "time_events_delete_n2"
ON time_events
FOR DELETE
TO authenticated
USING (
  (collaborator_id IN (
    SELECT c.id FROM collaborators c
    WHERE c.agency_id = get_user_agency_id(auth.uid())
  ) AND has_min_global_role(auth.uid(), 2))
  OR has_min_global_role(auth.uid(), 5)
);