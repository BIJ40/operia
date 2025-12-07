-- Tables pour le chat support en temps réel

-- Sessions de chat en direct
CREATE TABLE public.live_support_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  agency_slug TEXT,
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'transferred')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Messages du chat en direct
CREATE TABLE public.live_support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_support_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_from_support BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_live_support_sessions_user_id ON public.live_support_sessions(user_id);
CREATE INDEX idx_live_support_sessions_agent_id ON public.live_support_sessions(agent_id);
CREATE INDEX idx_live_support_sessions_status ON public.live_support_sessions(status);
CREATE INDEX idx_live_support_messages_session_id ON public.live_support_messages(session_id);

-- Enable RLS
ALTER TABLE public.live_support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour sessions
CREATE POLICY "Users can view their own sessions"
ON public.live_support_sessions FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = agent_id);

CREATE POLICY "Users can create sessions"
ON public.live_support_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Support agents can view all active sessions"
ON public.live_support_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      p.global_role IN ('superadmin', 'platform_admin', 'franchisor_admin')
      OR (p.enabled_modules::jsonb->'support'->'options'->>'agent')::boolean = true
    )
  )
);

CREATE POLICY "Support agents can update sessions"
ON public.live_support_sessions FOR UPDATE
USING (
  auth.uid() = agent_id OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      p.global_role IN ('superadmin', 'platform_admin', 'franchisor_admin')
      OR (p.enabled_modules::jsonb->'support'->'options'->>'agent')::boolean = true
    )
  )
);

-- RLS Policies pour messages
CREATE POLICY "Users can view messages in their sessions"
ON public.live_support_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.live_support_sessions s
    WHERE s.id = session_id
    AND (s.user_id = auth.uid() OR s.agent_id = auth.uid())
  )
);

CREATE POLICY "Support agents can view all messages"
ON public.live_support_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      p.global_role IN ('superadmin', 'platform_admin', 'franchisor_admin')
      OR (p.enabled_modules::jsonb->'support'->'options'->>'agent')::boolean = true
    )
  )
);

CREATE POLICY "Session participants can insert messages"
ON public.live_support_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.live_support_sessions s
    WHERE s.id = session_id
    AND (s.user_id = auth.uid() OR s.agent_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      p.global_role IN ('superadmin', 'platform_admin', 'franchisor_admin')
      OR (p.enabled_modules::jsonb->'support'->'options'->>'agent')::boolean = true
    )
  )
);

-- Trigger pour updated_at
CREATE TRIGGER update_live_support_sessions_updated_at
BEFORE UPDATE ON public.live_support_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_support_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_support_messages;