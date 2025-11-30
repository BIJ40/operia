-- P2#4 RAG Ingestion Pipeline Tables

-- Table pour suivre les jobs d'ingestion
CREATE TABLE IF NOT EXISTS rag_index_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  total_documents integer DEFAULT 0,
  processed_documents integer DEFAULT 0,
  error_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Table pour suivre les documents d'un job
CREATE TABLE IF NOT EXISTS rag_index_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES rag_index_jobs(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  file_path text,
  file_size integer,
  status text NOT NULL DEFAULT 'pending',
  chunk_count integer DEFAULT 0,
  context_type text DEFAULT 'auto',
  detected_context text,
  apporteur_code text,
  univers_code text,
  role_cible text,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE rag_index_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_index_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rag_index_jobs
CREATE POLICY "Admins can read jobs" ON rag_index_jobs 
  FOR SELECT USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admins can insert jobs" ON rag_index_jobs 
  FOR INSERT WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admins can update jobs" ON rag_index_jobs 
  FOR UPDATE USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admins can delete jobs" ON rag_index_jobs 
  FOR DELETE USING (has_min_global_role(auth.uid(), 5));

-- RLS Policies for rag_index_documents
CREATE POLICY "Admins can read docs" ON rag_index_documents 
  FOR SELECT USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admins can insert docs" ON rag_index_documents 
  FOR INSERT WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admins can update docs" ON rag_index_documents 
  FOR UPDATE USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admins can delete docs" ON rag_index_documents 
  FOR DELETE USING (has_min_global_role(auth.uid(), 5));

-- Trigger for updated_at
CREATE TRIGGER update_rag_index_documents_updated_at
  BEFORE UPDATE ON rag_index_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for RAG uploads if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('rag-uploads', 'rag-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for rag-uploads bucket
CREATE POLICY "Admins can upload RAG files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'rag-uploads' 
    AND has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY "Admins can read RAG files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'rag-uploads' 
    AND has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY "Admins can delete RAG files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'rag-uploads' 
    AND has_min_global_role(auth.uid(), 5)
  );