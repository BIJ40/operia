-- RGPD-03: Ajout des ON DELETE CASCADE pour le droit à l'effacement
-- Uniquement sur les tables avec FK vers collaborators existantes

-- collaborator_documents
ALTER TABLE public.collaborator_documents
  DROP CONSTRAINT IF EXISTS collaborator_documents_collaborator_id_fkey,
  ADD CONSTRAINT collaborator_documents_collaborator_id_fkey 
    FOREIGN KEY (collaborator_id) REFERENCES public.collaborators(id) ON DELETE CASCADE;

-- leave_requests
ALTER TABLE public.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_collaborator_id_fkey,
  ADD CONSTRAINT leave_requests_collaborator_id_fkey 
    FOREIGN KEY (collaborator_id) REFERENCES public.collaborators(id) ON DELETE CASCADE;

-- employment_contracts
ALTER TABLE public.employment_contracts
  DROP CONSTRAINT IF EXISTS employment_contracts_collaborator_id_fkey,
  ADD CONSTRAINT employment_contracts_collaborator_id_fkey 
    FOREIGN KEY (collaborator_id) REFERENCES public.collaborators(id) ON DELETE CASCADE;

-- document_requests
ALTER TABLE public.document_requests
  DROP CONSTRAINT IF EXISTS document_requests_collaborator_id_fkey,
  ADD CONSTRAINT document_requests_collaborator_id_fkey 
    FOREIGN KEY (collaborator_id) REFERENCES public.collaborators(id) ON DELETE CASCADE;

-- collaborator_document_folders
ALTER TABLE public.collaborator_document_folders
  DROP CONSTRAINT IF EXISTS collaborator_document_folders_collaborator_id_fkey,
  ADD CONSTRAINT collaborator_document_folders_collaborator_id_fkey 
    FOREIGN KEY (collaborator_id) REFERENCES public.collaborators(id) ON DELETE CASCADE;

-- collaborator_sensitive_data
ALTER TABLE public.collaborator_sensitive_data
  DROP CONSTRAINT IF EXISTS collaborator_sensitive_data_collaborator_id_fkey,
  ADD CONSTRAINT collaborator_sensitive_data_collaborator_id_fkey 
    FOREIGN KEY (collaborator_id) REFERENCES public.collaborators(id) ON DELETE CASCADE;

-- RGPD-05: Suppression des colonnes sensibles dupliquées dans collaborators
ALTER TABLE public.collaborators
  DROP COLUMN IF EXISTS social_security_number,
  DROP COLUMN IF EXISTS birth_date,
  DROP COLUMN IF EXISTS emergency_contact,
  DROP COLUMN IF EXISTS emergency_phone;

COMMENT ON TABLE public.collaborator_sensitive_data IS 'RGPD: Source unique pour les données sensibles chiffrées';