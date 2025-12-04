-- Clean up duplicate policies on conversation_members
DROP POLICY IF EXISTS "Users can leave conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Owners/admins can remove members" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON public.conversation_members;
DROP POLICY IF EXISTS "Conversation owners/admins can add members" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.conversation_members;
DROP POLICY IF EXISTS "Members can update their own membership" ON public.conversation_members;

-- Clean up remaining duplicate policies
DROP POLICY IF EXISTS "Owners/admins can add members" ON public.conversation_members;
DROP POLICY IF EXISTS "Owners/admins can remove members or self-leave" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can view co-members" ON public.conversation_members;
DROP POLICY IF EXISTS "Members can update own settings" ON public.conversation_members;

-- Recreate clean policies for conversation_members
CREATE POLICY "Members can view conversation memberships"
ON public.conversation_members FOR SELECT
USING (
  public.is_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY "Owners and admins can add members"
ON public.conversation_members FOR INSERT
WITH CHECK (
  -- Allow if creator is owner/admin of the conversation
  EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conversation_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('owner', 'admin')
  )
  -- Or allow inserting own membership when conversation was just created by this user
  OR (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND c.created_by = auth.uid()
  ))
);

CREATE POLICY "Members can update their own membership"
ON public.conversation_members FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Members can leave or owners can remove"
ON public.conversation_members FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conversation_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('owner', 'admin')
  )
);