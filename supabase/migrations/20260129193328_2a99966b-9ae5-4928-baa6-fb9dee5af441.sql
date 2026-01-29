-- Table pour les documents administratifs de l'agence (Kbis, RC, etc.)
CREATE TABLE public.agency_admin_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  label TEXT NOT NULL,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  expiry_date DATE,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  UNIQUE(agency_id, document_type)
);

-- Index pour les requêtes par agence
CREATE INDEX idx_agency_admin_documents_agency ON public.agency_admin_documents(agency_id);

-- Enable RLS
ALTER TABLE public.agency_admin_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents from their agency
CREATE POLICY "Users can view their agency admin documents"
  ON public.agency_admin_documents
  FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert documents for their agency
CREATE POLICY "Users can insert their agency admin documents"
  ON public.agency_admin_documents
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can update documents from their agency
CREATE POLICY "Users can update their agency admin documents"
  ON public.agency_admin_documents
  FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete documents from their agency
CREATE POLICY "Users can delete their agency admin documents"
  ON public.agency_admin_documents
  FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER update_agency_admin_documents_updated_at
  BEFORE UPDATE ON public.agency_admin_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();