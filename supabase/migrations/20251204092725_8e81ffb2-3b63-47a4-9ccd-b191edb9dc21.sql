-- RH-P0-01: Table pour les tampons d'agence
CREATE TABLE public.agency_stamps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,
  stamp_type text NOT NULL DEFAULT 'logo' CHECK (stamp_type IN ('logo', 'signature', 'cachet')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, stamp_type)
);

-- Index pour recherche rapide
CREATE INDEX idx_agency_stamps_agency ON agency_stamps(agency_id);

-- RLS
ALTER TABLE agency_stamps ENABLE ROW LEVEL SECURITY;

-- N2+ de l'agence peuvent voir les tampons
CREATE POLICY "agency_stamps_select" ON agency_stamps
  FOR SELECT USING (
    agency_id = get_user_agency_id(auth.uid()) 
    AND has_min_global_role(auth.uid(), 2)
  );

-- N2+ peuvent gérer les tampons de leur agence
CREATE POLICY "agency_stamps_insert" ON agency_stamps
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id(auth.uid()) 
    AND has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "agency_stamps_update" ON agency_stamps
  FOR UPDATE USING (
    agency_id = get_user_agency_id(auth.uid()) 
    AND has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "agency_stamps_delete" ON agency_stamps
  FOR DELETE USING (
    agency_id = get_user_agency_id(auth.uid()) 
    AND has_min_global_role(auth.uid(), 2)
  );

-- Trigger updated_at
CREATE TRIGGER update_agency_stamps_updated_at
  BEFORE UPDATE ON agency_stamps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table historique des documents RH générés
CREATE TABLE public.hr_generated_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid REFERENCES document_requests(id) ON DELETE SET NULL,
  agency_id uuid NOT NULL REFERENCES apogee_agencies(id),
  collaborator_id uuid NOT NULL REFERENCES collaborators(id),
  document_type text NOT NULL,
  title text NOT NULL,
  content text,
  file_path text NOT NULL,
  generated_by uuid NOT NULL REFERENCES profiles(id),
  generated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Index
CREATE INDEX idx_hr_generated_docs_request ON hr_generated_documents(request_id);
CREATE INDEX idx_hr_generated_docs_collab ON hr_generated_documents(collaborator_id);

-- RLS
ALTER TABLE hr_generated_documents ENABLE ROW LEVEL SECURITY;

-- RH peuvent voir les documents générés de leur agence
CREATE POLICY "hr_generated_documents_select" ON hr_generated_documents
  FOR SELECT USING (
    agency_id = get_user_agency_id(auth.uid()) 
    AND (has_min_global_role(auth.uid(), 2) OR has_agency_rh_role(auth.uid(), agency_id))
  );

-- RH peuvent insérer
CREATE POLICY "hr_generated_documents_insert" ON hr_generated_documents
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id(auth.uid()) 
    AND (has_min_global_role(auth.uid(), 2) OR has_agency_rh_role(auth.uid(), agency_id))
  );

-- Employees can see their own generated documents
CREATE POLICY "hr_generated_documents_employee_select" ON hr_generated_documents
  FOR SELECT USING (
    collaborator_id = get_current_collaborator_id()
  );