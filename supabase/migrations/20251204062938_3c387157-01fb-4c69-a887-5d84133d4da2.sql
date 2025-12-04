-- Fix conversation_members INSERT policy to allow creator to add all members
DROP POLICY IF EXISTS "Owners and admins can add members" ON public.conversation_members;

CREATE POLICY "Users can add members to conversations"
ON public.conversation_members FOR INSERT
WITH CHECK (
  -- Allow if user is the creator of the conversation (can add any member)
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND c.created_by = auth.uid()
  )
  -- Or allow if user is already owner/admin of the conversation
  OR EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conversation_members.conversation_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('owner', 'admin')
  )
);