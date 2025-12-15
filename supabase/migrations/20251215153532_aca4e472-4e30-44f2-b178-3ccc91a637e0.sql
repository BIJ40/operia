-- Add archived_at column to rh_requests
ALTER TABLE public.rh_requests 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES profiles(id);