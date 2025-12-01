-- Add back deprecated priority column to support_tickets as nullable text to avoid schema cache errors
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS priority text NULL;