-- Supprimer la policy INSERT trop simple créée précédemment
DROP POLICY IF EXISTS "authenticated_can_insert_notifications" ON public.rh_notifications;
DROP POLICY IF EXISTS "any_user_can_create_notifications" ON public.rh_notifications;
DROP POLICY IF EXISTS "users_can_create_notifications_scoped" ON public.rh_notifications;
DROP POLICY IF EXISTS "rh_notifications_insert" ON public.rh_notifications;

-- Policy INSERT sécurisée : 
-- - sender_id = utilisateur courant
-- - agency_id = agence de l'utilisateur (via SECURITY DEFINER)
-- - recipient dans la même agence OU sender N5+
CREATE POLICY "rh_notifications_insert_scoped"
ON public.rh_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND agency_id = get_user_agency_id(auth.uid())
  AND (
    recipient_id IS NULL
    OR get_user_agency_id(recipient_id) = get_user_agency_id(auth.uid())
    OR has_min_global_role(auth.uid(), 5)
  )
);