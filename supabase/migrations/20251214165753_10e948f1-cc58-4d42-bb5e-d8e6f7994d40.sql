
-- Supprimer les policies INSERT existantes et les remplacer par une plus simple
DROP POLICY IF EXISTS "any_user_can_create_notifications" ON public.rh_notifications;
DROP POLICY IF EXISTS "users_can_create_notifications_scoped" ON public.rh_notifications;

-- Nouvelle policy INSERT simple : tout utilisateur authentifié peut créer une notif
-- La logique de scope est gérée côté application
CREATE POLICY "authenticated_can_insert_notifications"
ON public.rh_notifications FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);
