
-- ============================================================================
-- SECURITY FIX: Fix overly permissive RLS policy on unified_notifications
-- ============================================================================

-- The "System can insert notifications" policy uses WITH CHECK(true) for public role
-- This is too permissive. Replace with proper policies.

-- Drop the permissive policy
DROP POLICY IF EXISTS "System can insert notifications" ON unified_notifications;

-- Create policies with proper restrictions:
-- 1. Service role (trusted system role) can insert any notifications
CREATE POLICY "Service role can insert notifications"
ON unified_notifications FOR INSERT
TO service_role
WITH CHECK (true);

-- 2. Authenticated users can only insert notifications for themselves
CREATE POLICY "Users can insert own notifications"
ON unified_notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
