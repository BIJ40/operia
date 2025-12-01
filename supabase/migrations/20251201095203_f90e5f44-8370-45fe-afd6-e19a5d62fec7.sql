-- Add tracking columns to apogee_tickets
ALTER TABLE public.apogee_tickets 
ADD COLUMN IF NOT EXISTS last_modified_by_user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS last_modified_at timestamp with time zone DEFAULT now();

-- Create apogee_ticket_views table for tracking user views
CREATE TABLE IF NOT EXISTS public.apogee_ticket_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.apogee_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, user_id)
);

-- Enable RLS
ALTER TABLE public.apogee_ticket_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for apogee_ticket_views
CREATE POLICY "Users can view their own ticket views"
ON public.apogee_ticket_views
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own ticket views"
ON public.apogee_ticket_views
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own ticket views"
ON public.apogee_ticket_views
FOR UPDATE
USING (user_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_ticket_views_ticket_user ON public.apogee_ticket_views(ticket_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_last_modified ON public.apogee_tickets(last_modified_at);

-- Trigger to auto-update last_modified fields on ticket changes
CREATE OR REPLACE FUNCTION public.update_ticket_last_modified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.last_modified_at = now();
  NEW.last_modified_by_user_id = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_ticket_last_modified
BEFORE UPDATE ON public.apogee_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_ticket_last_modified();