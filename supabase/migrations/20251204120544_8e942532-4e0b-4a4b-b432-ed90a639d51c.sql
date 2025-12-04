-- P2-01: Sous-dossiers persistants en base
CREATE TABLE IF NOT EXISTS collaborator_document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid REFERENCES collaborators(id) ON DELETE CASCADE NOT NULL,
  parent_folder_id uuid REFERENCES collaborator_document_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  doc_type text NOT NULL, -- Catégorie parente (CONTRACT, PAYSLIP, etc.)
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(collaborator_id, doc_type, parent_folder_id, name)
);

CREATE INDEX idx_doc_folders_collaborator ON collaborator_document_folders(collaborator_id);
CREATE INDEX idx_doc_folders_doc_type ON collaborator_document_folders(collaborator_id, doc_type);

ALTER TABLE collaborator_document_folders ENABLE ROW LEVEL SECURITY;

-- RLS: Same access as collaborator_documents
CREATE POLICY "Users can view folders for their collaborators"
ON collaborator_document_folders FOR SELECT
USING (
  has_min_global_role(auth.uid(), 6)
  OR (
    EXISTS (
      SELECT 1 FROM collaborators c
      WHERE c.id = collaborator_id
      AND c.agency_id = get_user_agency_id(auth.uid())
    )
    AND has_min_global_role(auth.uid(), 2)
  )
  OR (
    EXISTS (
      SELECT 1 FROM collaborators c
      WHERE c.id = collaborator_id
      AND c.user_id = auth.uid()
    )
  )
);

CREATE POLICY "RH managers can manage folders"
ON collaborator_document_folders FOR ALL
USING (
  has_min_global_role(auth.uid(), 6)
  OR (
    EXISTS (
      SELECT 1 FROM collaborators c
      WHERE c.id = collaborator_id
      AND c.agency_id = get_user_agency_id(auth.uid())
    )
    AND has_min_global_role(auth.uid(), 2)
  )
);

-- P2-02: Recherche full-text sur les documents
ALTER TABLE collaborator_documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_documents_search ON collaborator_documents USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('french', 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.file_name, '') || ' ' ||
    COALESCE(NEW.subfolder, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-update
DROP TRIGGER IF EXISTS tr_update_document_search ON collaborator_documents;
CREATE TRIGGER tr_update_document_search
BEFORE INSERT OR UPDATE ON collaborator_documents
FOR EACH ROW
EXECUTE FUNCTION update_document_search_vector();

-- Update existing documents
UPDATE collaborator_documents SET search_vector = to_tsvector('french', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '') || ' ' ||
  COALESCE(file_name, '') || ' ' ||
  COALESCE(subfolder, '')
);

-- RPC for full-text search
CREATE OR REPLACE FUNCTION search_collaborator_documents(
  p_collaborator_id uuid,
  p_search_query text
)
RETURNS SETOF collaborator_documents
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM collaborator_documents
  WHERE collaborator_id = p_collaborator_id
    AND search_vector @@ plainto_tsquery('french', p_search_query)
  ORDER BY ts_rank(search_vector, plainto_tsquery('french', p_search_query)) DESC;
$$;