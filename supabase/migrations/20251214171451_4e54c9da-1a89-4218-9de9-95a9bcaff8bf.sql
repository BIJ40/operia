-- Ajouter policy UPDATE pour permettre de marquer les notifications comme lues
DROP POLICY IF EXISTS "rh_notifications_update_own" ON public.rh_notifications;

CREATE POLICY "rh_notifications_update_own"
ON public.rh_notifications
FOR UPDATE
TO authenticated
USING (
  recipient_id = auth.uid()
  OR collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
)
WITH CHECK (
  recipient_id = auth.uid()
  OR collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
);