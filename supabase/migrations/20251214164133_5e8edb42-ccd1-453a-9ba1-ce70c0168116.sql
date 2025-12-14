-- 1) Nettoyage des policies existantes sur rh_notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.rh_notifications;
DROP POLICY IF EXISTS "rh_notifications_select" ON public.rh_notifications;
DROP POLICY IF EXISTS "recipient_can_update_notifications" ON public.rh_notifications;
DROP POLICY IF EXISTS "users_can_create_notifications_scoped" ON public.rh_notifications;
DROP POLICY IF EXISTS "rh_notifications_insert" ON public.rh_notifications;
DROP POLICY IF EXISTS "rh_notifications_update" ON public.rh_notifications;

-- 2) Supprimer la FK existante vers document_requests si elle existe
ALTER TABLE public.rh_notifications 
DROP CONSTRAINT IF EXISTS rh_notifications_related_request_id_fkey;

-- 3) Ajouter la nouvelle FK vers rh_requests
ALTER TABLE public.rh_notifications
ADD CONSTRAINT rh_notifications_related_request_id_fkey
FOREIGN KEY (related_request_id) REFERENCES public.rh_requests(id) ON DELETE SET NULL;

-- 4) Rendre collaborator_id nullable (si pas déjà)
ALTER TABLE public.rh_notifications
ALTER COLUMN collaborator_id DROP NOT NULL;

-- 5) Recréer les policies RLS proprement

-- SELECT : N1 voit ses notifications personnelles
CREATE POLICY "n1_can_view_own_notifications"
ON public.rh_notifications
FOR SELECT
USING (recipient_id = auth.uid());

-- SELECT : N2+ voit les notifications de son agence
CREATE POLICY "n2_can_view_agency_notifications"
ON public.rh_notifications
FOR SELECT
USING (
  agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
  AND has_min_global_role(auth.uid(), 2)
);

-- INSERT : Utilisateurs authentifiés peuvent créer des notifications pour leur agence
CREATE POLICY "users_can_create_notifications_scoped"
ON public.rh_notifications
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
);

-- UPDATE : Destinataire peut marquer comme lu
CREATE POLICY "recipient_can_update_own_notifications"
ON public.rh_notifications
FOR UPDATE
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());