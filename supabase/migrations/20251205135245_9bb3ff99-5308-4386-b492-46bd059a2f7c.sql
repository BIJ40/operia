-- Add deleted_at column for soft delete per user
ALTER TABLE public.conversation_members 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Add index for filtering deleted conversations
CREATE INDEX IF NOT EXISTS idx_conversation_members_deleted_at 
ON public.conversation_members(deleted_at) 
WHERE deleted_at IS NULL;

-- Update RLS to allow users to update their own membership (for soft delete)
DROP POLICY IF EXISTS "Users can soft delete their conversations" ON public.conversation_members;
CREATE POLICY "Users can soft delete their conversations"
ON public.conversation_members
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());