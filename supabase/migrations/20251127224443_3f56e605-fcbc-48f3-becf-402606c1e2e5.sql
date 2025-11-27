-- Add is_in_progress and completed_at columns to blocks table
ALTER TABLE public.blocks 
ADD COLUMN IF NOT EXISTS is_in_progress boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;