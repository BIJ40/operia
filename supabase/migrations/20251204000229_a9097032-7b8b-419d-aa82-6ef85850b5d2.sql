
-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view conversation members" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can view members of their conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.conversation_members;
DROP POLICY IF EXISTS "Members can leave conversations" ON public.conversation_members;

-- Create a security definer function to check conversation membership without recursion
CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conv_id AND user_id = uid
  );
$$;

-- Create non-recursive RLS policies for conversation_members
CREATE POLICY "Users can view own memberships"
ON public.conversation_members
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view co-members"
ON public.conversation_members
FOR SELECT
USING (
  public.is_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY "Users can insert own membership"
ON public.conversation_members
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Conversation owners/admins can add members"
ON public.conversation_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_members cm
    WHERE cm.conversation_id = conversation_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Users can leave conversations"
ON public.conversation_members
FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Owners/admins can remove members"
ON public.conversation_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM conversation_members cm
    WHERE cm.conversation_id = conversation_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Members can update own settings"
ON public.conversation_members
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
