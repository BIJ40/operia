-- Create quick_notes table for user notes widget
CREATE TABLE IF NOT EXISTS public.user_quick_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow', 'blue', 'green', 'pink', 'purple')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create calendar_connections table for external calendar integrations
CREATE TABLE IF NOT EXISTS public.user_calendar_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'icloud')),
  is_connected BOOLEAN NOT NULL DEFAULT false,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  calendar_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.user_quick_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Policies for quick_notes
CREATE POLICY "Users can manage their own notes"
  ON public.user_quick_notes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for calendar_connections
CREATE POLICY "Users can manage their own calendar connections"
  ON public.user_calendar_connections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_user_quick_notes_user_id ON public.user_quick_notes(user_id);
CREATE INDEX idx_user_calendar_connections_user_id ON public.user_calendar_connections(user_id);