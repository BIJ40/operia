-- =============================================
-- Phase 2.1: Coffre-fort RH (collaborator_documents)
-- =============================================

-- 1) Table collaborator_documents
CREATE TABLE IF NOT EXISTS public.collaborator_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,
  
  -- Document metadata
  doc_type text NOT NULL, -- PAYSLIP, CONTRACT, AVENANT, ATTESTATION, MEDICAL_VISIT, SANCTION, HR_NOTE, OTHER
  title text NOT NULL,
  description text,
  
  -- File info
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  file_type text, -- mime type
  
  -- For payslips
  period_month integer, -- 1-12
  period_year integer,
  
  -- Visibility
  visibility text NOT NULL DEFAULT 'ADMIN_ONLY', -- ADMIN_ONLY, EMPLOYEE_VISIBLE
  
  -- Audit
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS collaborator_documents_collab_idx 
  ON collaborator_documents(collaborator_id);
CREATE INDEX IF NOT EXISTS collaborator_documents_agency_idx 
  ON collaborator_documents(agency_id);
CREATE INDEX IF NOT EXISTS collaborator_documents_type_idx 
  ON collaborator_documents(doc_type);
CREATE INDEX IF NOT EXISTS collaborator_documents_visibility_idx 
  ON collaborator_documents(visibility);

-- 2) Enable RLS
ALTER TABLE collaborator_documents ENABLE ROW LEVEL SECURITY;

-- 3) RLS Policies

-- Dirigeant/RH de l'agence : accès complet
CREATE POLICY collaborator_documents_admin_select
ON collaborator_documents
FOR SELECT
USING (
  agency_id = get_user_agency_id(auth.uid())
  AND (
    has_min_global_role(auth.uid(), 2)
    OR has_agency_rh_role(auth.uid(), agency_id)
  )
);

CREATE POLICY collaborator_documents_admin_insert
ON collaborator_documents
FOR INSERT
WITH CHECK (
  agency_id = get_user_agency_id(auth.uid())
  AND (
    has_min_global_role(auth.uid(), 2)
    OR has_agency_rh_role(auth.uid(), agency_id)
  )
);

CREATE POLICY collaborator_documents_admin_update
ON collaborator_documents
FOR UPDATE
USING (
  agency_id = get_user_agency_id(auth.uid())
  AND (
    has_min_global_role(auth.uid(), 2)
    OR has_agency_rh_role(auth.uid(), agency_id)
  )
);

CREATE POLICY collaborator_documents_admin_delete
ON collaborator_documents
FOR DELETE
USING (
  agency_id = get_user_agency_id(auth.uid())
  AND (
    has_min_global_role(auth.uid(), 2)
    OR has_agency_rh_role(auth.uid(), agency_id)
  )
);

-- Salarié : lecture seule de SES documents visibles
CREATE POLICY collaborator_documents_employee_select
ON collaborator_documents
FOR SELECT
USING (
  visibility = 'EMPLOYEE_VISIBLE'
  AND collaborator_id = get_current_collaborator_id()
);

-- N3+ (franchiseur) : aucun accès aux documents RH nominatifs
-- (pas de policy pour eux = pas d'accès)

-- 4) Storage bucket pour les documents RH
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rh-documents',
  'rh-documents',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- 5) Storage RLS policies

-- Dirigeant/RH peut tout faire sur les fichiers de son agence
CREATE POLICY rh_documents_admin_all
ON storage.objects
FOR ALL
USING (
  bucket_id = 'rh-documents'
  AND (
    has_min_global_role(auth.uid(), 2)
    OR has_agency_rh_role(auth.uid(), get_user_agency_id(auth.uid()))
  )
)
WITH CHECK (
  bucket_id = 'rh-documents'
  AND (
    has_min_global_role(auth.uid(), 2)
    OR has_agency_rh_role(auth.uid(), get_user_agency_id(auth.uid()))
  )
);

-- Salarié peut télécharger ses propres documents
CREATE POLICY rh_documents_employee_select
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'rh-documents'
  AND (
    -- Le path doit contenir son collaborator_id
    (storage.foldername(name))[1] = get_current_collaborator_id()::text
  )
);

-- 6) Updated_at trigger
CREATE TRIGGER update_collaborator_documents_updated_at
BEFORE UPDATE ON collaborator_documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();