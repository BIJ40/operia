-- Security linter (WARN 0024): replace permissive WITH CHECK (true) policy
-- Narrow the INSERT policy to service_role explicitly.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'unified_notifications'
      AND policyname = 'Service role can insert notifications'
  ) THEN
    EXECUTE 'DROP POLICY "Service role can insert notifications" ON public.unified_notifications';
  END IF;
END $$;

CREATE POLICY "Service role can insert notifications"
ON public.unified_notifications
FOR INSERT
TO service_role
WITH CHECK (auth.role() = 'service_role');