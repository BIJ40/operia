-- Add updated_at column to apogee_ticket_comments for edit tracking
ALTER TABLE public.apogee_ticket_comments 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NULL;