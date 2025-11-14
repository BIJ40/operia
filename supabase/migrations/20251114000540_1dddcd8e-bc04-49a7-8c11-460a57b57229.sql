-- Create blocks table to store all content securely
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('category', 'section')),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  icon TEXT,
  color_preset TEXT NOT NULL DEFAULT 'white',
  "order" INTEGER NOT NULL DEFAULT 0,
  slug TEXT NOT NULL,
  parent_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE,
  attachments JSONB DEFAULT '[]'::jsonb,
  hide_from_sidebar BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_blocks_type ON public.blocks(type);
CREATE INDEX IF NOT EXISTS idx_blocks_parent_id ON public.blocks(parent_id);
CREATE INDEX IF NOT EXISTS idx_blocks_slug ON public.blocks(slug);
CREATE INDEX IF NOT EXISTS idx_blocks_order ON public.blocks("order");

-- Enable Row Level Security
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read blocks
CREATE POLICY "Anyone can view blocks"
  ON public.blocks
  FOR SELECT
  USING (true);

-- Policy: Only admins can insert blocks
CREATE POLICY "Only admins can insert blocks"
  ON public.blocks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Only admins can update blocks
CREATE POLICY "Only admins can update blocks"
  ON public.blocks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Only admins can delete blocks
CREATE POLICY "Only admins can delete blocks"
  ON public.blocks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_blocks_timestamp
  BEFORE UPDATE ON public.blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_blocks_updated_at();