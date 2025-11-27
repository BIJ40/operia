-- Add content_updated_at field for tracking content updates (M.A.J badge)
ALTER TABLE public.blocks 
ADD COLUMN IF NOT EXISTS content_updated_at timestamp with time zone DEFAULT NULL;

-- Add same field to apporteur_blocks for consistency
ALTER TABLE public.apporteur_blocks 
ADD COLUMN IF NOT EXISTS content_updated_at timestamp with time zone DEFAULT NULL;