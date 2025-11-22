-- Create table for storing document chunks with embeddings
CREATE TABLE IF NOT EXISTS public.guide_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id TEXT NOT NULL,
  block_type TEXT NOT NULL,
  block_title TEXT NOT NULL,
  block_slug TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guide_chunks_block_id ON public.guide_chunks(block_id);
CREATE INDEX IF NOT EXISTS idx_guide_chunks_block_type ON public.guide_chunks(block_type);
CREATE INDEX IF NOT EXISTS idx_guide_chunks_updated_at ON public.guide_chunks(updated_at);

-- Enable RLS
ALTER TABLE public.guide_chunks ENABLE ROW LEVEL SECURITY;

-- Anyone can read chunks (for search)
CREATE POLICY "Anyone can view guide chunks"
  ON public.guide_chunks
  FOR SELECT
  USING (true);

-- Only admins can insert chunks
CREATE POLICY "Only admins can insert guide chunks"
  ON public.guide_chunks
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update chunks
CREATE POLICY "Only admins can update guide chunks"
  ON public.guide_chunks
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete chunks
CREATE POLICY "Only admins can delete guide chunks"
  ON public.guide_chunks
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_guide_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_guide_chunks_updated_at_trigger
  BEFORE UPDATE ON public.guide_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_guide_chunks_updated_at();