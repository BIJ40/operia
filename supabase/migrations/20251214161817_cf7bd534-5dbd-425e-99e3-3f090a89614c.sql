-- Fix RLS on rh_notifications: allow any authenticated user to INSERT notifications

DROP POLICY IF EXISTS "RH can create notifications" ON public.rh_notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON public.rh_notifications;

-- Any authenticated user can create notifications (for employee requests and RH responses)
CREATE POLICY "any_user_can_create_notifications"
ON public.rh_notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure UPDATE policy allows recipients to mark as read
DROP POLICY IF EXISTS "Users can update own notifications" ON public.rh_notifications;
CREATE POLICY "recipient_can_update_notifications"
ON public.rh_notifications
FOR UPDATE
USING (
  recipient_id = auth.uid() 
  OR collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
);