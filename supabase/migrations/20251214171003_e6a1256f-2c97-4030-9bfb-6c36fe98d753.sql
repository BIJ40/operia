-- Adjust RLS policies for rh_notifications to allow N1 employees to see their own notifications
-- and N2+ RH users to see notifications for their agency

-- Drop existing SELECT policies on rh_notifications
DO $$
BEGIN
  PERFORM 1 FROM pg_policies 
   WHERE schemaname = 'public' AND tablename = 'rh_notifications';
  IF FOUND THEN
    EXECUTE 'DROP POLICY IF EXISTS "n2_can_view_agency_notifications" ON public.rh_notifications';
    EXECUTE 'DROP POLICY IF EXISTS "rh_notifications_select" ON public.rh_notifications';
    EXECUTE 'DROP POLICY IF EXISTS "rh_notifications_employee_select" ON public.rh_notifications';
    EXECUTE 'DROP POLICY IF EXISTS "rh_notifications_rh_select" ON public.rh_notifications';
  END IF;
END $$;

-- Employees (N1) can see notifications where they are direct recipient
-- or notifications linked to their collaborator record
CREATE POLICY "rh_notifications_employee_select"
ON public.rh_notifications
FOR SELECT
TO authenticated
USING (
  recipient_id = auth.uid()
  OR collaborator_id IN (
    SELECT c.id FROM public.collaborators c WHERE c.user_id = auth.uid()
  )
);

-- RH / managers (N2+) can see all notifications for their agency
CREATE POLICY "rh_notifications_rh_select"
ON public.rh_notifications
FOR SELECT
TO authenticated
USING (
  has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
);
