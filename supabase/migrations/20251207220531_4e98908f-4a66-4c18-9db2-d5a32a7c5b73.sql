-- Add attachment support to live_support_messages
ALTER TABLE public.live_support_messages 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- Add notified_at to track when support was notified (only on first user message)
ALTER TABLE public.live_support_sessions
ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;