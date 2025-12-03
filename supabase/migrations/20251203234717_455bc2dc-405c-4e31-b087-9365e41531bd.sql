
-- Table des conversations (DM et groupes)
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'dm' CHECK (type IN ('dm', 'group')),
  name TEXT, -- Nom du groupe (null pour DM)
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des membres de conversation
CREATE TABLE public.conversation_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_muted BOOLEAN NOT NULL DEFAULT false,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Table des messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Table pour le statut de frappe (typing indicator)
CREATE TABLE public.typing_status (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they are members of"
ON public.conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conversations.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members can update conversations"
ON public.conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conversations.id 
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- RLS Policies for conversation_members
CREATE POLICY "Users can view members of their conversations"
ON public.conversation_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conversation_members.conversation_id 
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Owners/admins can add members"
ON public.conversation_members FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    -- Creating new conversation (user adds themselves)
    user_id = auth.uid()
    OR
    -- Adding to existing conversation as owner/admin
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
    )
  )
);

CREATE POLICY "Owners/admins can remove members or self-leave"
ON public.conversation_members FOR DELETE
USING (
  -- Can leave yourself
  user_id = auth.uid()
  OR
  -- Owner/admin can remove others
  EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conversation_members.conversation_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Members can update their own membership"
ON public.conversation_members FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Members can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Senders can update their messages"
ON public.messages FOR UPDATE
USING (sender_id = auth.uid());

-- RLS Policies for typing_status
CREATE POLICY "Users can view typing status in their conversations"
ON public.typing_status FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = typing_status.conversation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their typing status"
ON public.typing_status FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_conversation_members_user ON public.conversation_members(user_id);
CREATE INDEX idx_conversation_members_conversation ON public.conversation_members(conversation_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for updating last_message_at
CREATE TRIGGER update_conversation_last_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message();

-- Enable realtime for messages and typing_status
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;
