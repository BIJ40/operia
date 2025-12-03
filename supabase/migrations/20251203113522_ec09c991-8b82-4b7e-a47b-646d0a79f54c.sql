-- 1) Table des demandes de documents
CREATE TABLE document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES apogee_agencies(id),
  request_type text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'PENDING',
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  response_note text,
  response_document_id uuid REFERENCES collaborator_documents(id),
  processed_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index utiles
CREATE INDEX document_requests_agency_status_idx ON document_requests (agency_id, status);
CREATE INDEX document_requests_collaborator_idx ON document_requests (collaborator_id, requested_at DESC);

-- 2) RLS
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

-- Salarié : voir ses propres demandes
CREATE POLICY document_requests_employee_select
ON document_requests FOR SELECT
USING (collaborator_id = get_current_collaborator_id());

-- Salarié : créer ses propres demandes
CREATE POLICY document_requests_employee_insert
ON document_requests FOR INSERT
WITH CHECK (
  collaborator_id = get_current_collaborator_id()
  AND agency_id = get_user_agency_id(auth.uid())
);

-- Agence (dirigeant + RH) : voir toutes les demandes de l'agence
CREATE POLICY document_requests_agency_select
ON document_requests FOR SELECT
USING (
  agency_id = get_user_agency_id(auth.uid())
  AND (
    has_min_global_role(auth.uid(), 2)
    OR has_agency_rh_role(auth.uid(), agency_id)
  )
);

-- Agence (dirigeant + RH) : mettre à jour les demandes
CREATE POLICY document_requests_agency_update
ON document_requests FOR UPDATE
USING (
  agency_id = get_user_agency_id(auth.uid())
  AND (
    has_min_global_role(auth.uid(), 2)
    OR has_agency_rh_role(auth.uid(), agency_id)
  )
)
WITH CHECK (agency_id = get_user_agency_id(auth.uid()));