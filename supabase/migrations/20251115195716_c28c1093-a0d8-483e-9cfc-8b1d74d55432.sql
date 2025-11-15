-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true);

-- Create documents table to store document metadata
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  
  -- Link to either apogee or apporteur content
  scope TEXT NOT NULL CHECK (scope IN ('apogee', 'apporteur')),
  
  -- Link to block (for apogee)
  block_id TEXT REFERENCES public.blocks(id) ON DELETE CASCADE,
  
  -- Link to apporteur block (for apporteur)
  apporteur_block_id TEXT REFERENCES public.apporteur_blocks(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure at least one reference is set based on scope
  CONSTRAINT valid_reference CHECK (
    (scope = 'apogee' AND block_id IS NOT NULL AND apporteur_block_id IS NULL) OR
    (scope = 'apporteur' AND apporteur_block_id IS NOT NULL AND block_id IS NULL)
  )
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view documents"
ON public.documents
FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert documents"
ON public.documents
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update documents"
ON public.documents
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete documents"
ON public.documents
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Storage policies for documents bucket
CREATE POLICY "Anyone can view documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'documents');

CREATE POLICY "Admins can upload documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'documents' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update documents"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'documents' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'documents' AND has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();