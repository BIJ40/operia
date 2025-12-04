-- ==============================================
-- P0-04: Table de logging des accès documents
-- ==============================================
CREATE TABLE IF NOT EXISTS document_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES collaborator_documents(id) ON DELETE CASCADE,
  accessed_by uuid REFERENCES profiles(id) NOT NULL,
  access_type text NOT NULL CHECK (access_type IN ('view', 'download', 'preview')),
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_access_logs_document ON document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_user ON document_access_logs(accessed_by);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_created ON document_access_logs(created_at DESC);

ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;

-- Seuls les admins N5+ peuvent voir les logs d'accès
CREATE POLICY "Admins can view access logs"
ON document_access_logs FOR SELECT
USING (has_min_global_role(auth.uid(), 5));

-- INSERT autorisé pour les utilisateurs authentifiés (via RPC)
CREATE POLICY "Authenticated users can log access"
ON document_access_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ==============================================
-- P0-05: Superadmin bypass sur toutes les tables RH
-- ==============================================

-- collaborator_documents: ajouter N6 bypass
DROP POLICY IF EXISTS "collaborator_documents_admin_select" ON collaborator_documents;
CREATE POLICY "collaborator_documents_admin_select"
ON collaborator_documents FOR SELECT
USING (
  has_min_global_role(auth.uid(), 6)
  OR (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_min_global_role(auth.uid(), 2) OR has_agency_rh_role(auth.uid(), agency_id))
  )
);

DROP POLICY IF EXISTS "collaborator_documents_admin_update" ON collaborator_documents;
CREATE POLICY "collaborator_documents_admin_update"
ON collaborator_documents FOR UPDATE
USING (
  has_min_global_role(auth.uid(), 6)
  OR (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_min_global_role(auth.uid(), 2) OR has_agency_rh_role(auth.uid(), agency_id))
  )
);

DROP POLICY IF EXISTS "collaborator_documents_admin_delete" ON collaborator_documents;
CREATE POLICY "collaborator_documents_admin_delete"
ON collaborator_documents FOR DELETE
USING (
  has_min_global_role(auth.uid(), 6)
  OR (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_min_global_role(auth.uid(), 2) OR has_agency_rh_role(auth.uid(), agency_id))
  )
);

-- document_requests: ajouter N6 bypass
DROP POLICY IF EXISTS "document_requests_agency_select" ON document_requests;
CREATE POLICY "document_requests_agency_select"
ON document_requests FOR SELECT
USING (
  has_min_global_role(auth.uid(), 6)
  OR (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_min_global_role(auth.uid(), 2) OR has_agency_rh_role(auth.uid(), agency_id))
  )
);

DROP POLICY IF EXISTS "document_requests_agency_update" ON document_requests;
CREATE POLICY "document_requests_agency_update"
ON document_requests FOR UPDATE
USING (
  has_min_global_role(auth.uid(), 6)
  OR (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_min_global_role(auth.uid(), 2) OR has_agency_rh_role(auth.uid(), agency_id))
  )
);

-- salary_history: ajouter N6 bypass (via module rh_admin)
DROP POLICY IF EXISTS "salary_history_select" ON salary_history;
CREATE POLICY "salary_history_select"
ON salary_history FOR SELECT
USING (
  has_min_global_role(auth.uid(), 6)
  OR EXISTS (
    SELECT 1 FROM employment_contracts ec
    WHERE ec.id = salary_history.contract_id
    AND (
      has_min_global_role(auth.uid(), 3)
      OR (
        ec.agency_id = get_user_agency_id(auth.uid())
        AND (
          has_min_global_role(auth.uid(), 2)
          OR (
            SELECT (enabled_modules->'rh'->'options'->>'rh_admin')::boolean
            FROM profiles WHERE id = auth.uid()
          ) = true
        )
      )
    )
  )
);

-- collaborators: ajouter N6 bypass
DROP POLICY IF EXISTS "collaborators_select" ON collaborators;
CREATE POLICY "collaborators_select"
ON collaborators FOR SELECT
USING (
  has_min_global_role(auth.uid(), 6)
  OR has_min_global_role(auth.uid(), 3)
  OR (
    agency_id = get_user_agency_id(auth.uid())
    AND (
      has_min_global_role(auth.uid(), 2) 
      OR has_agency_rh_role(auth.uid(), agency_id) 
      OR user_id = auth.uid()
    )
  )
);

-- employment_contracts: ajouter N6 bypass
DROP POLICY IF EXISTS "employment_contracts_select" ON employment_contracts;
CREATE POLICY "employment_contracts_select"
ON employment_contracts FOR SELECT
USING (
  has_min_global_role(auth.uid(), 6)
  OR has_min_global_role(auth.uid(), 3)
  OR (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_min_global_role(auth.uid(), 2) OR has_agency_rh_role(auth.uid(), agency_id))
  )
);

-- payslip_data: ajouter N6 bypass
DROP POLICY IF EXISTS "payslip_data_admin_select" ON payslip_data;
CREATE POLICY "payslip_data_admin_select"
ON payslip_data FOR SELECT
USING (
  has_min_global_role(auth.uid(), 6)
  OR (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_min_global_role(auth.uid(), 2) OR has_agency_rh_role(auth.uid(), agency_id))
  )
);

-- rh_audit_log: ajouter N6 bypass 
DROP POLICY IF EXISTS "rh_audit_log_select" ON rh_audit_log;
CREATE POLICY "rh_audit_log_select"
ON rh_audit_log FOR SELECT
USING (
  has_min_global_role(auth.uid(), 6)
  OR (
    agency_id = get_user_agency_id(auth.uid())
    AND has_min_global_role(auth.uid(), 2)
  )
);

-- rh_notifications: ajouter N6 bypass
DROP POLICY IF EXISTS "rh_notifications_select" ON rh_notifications;
CREATE POLICY "rh_notifications_select"
ON rh_notifications FOR SELECT
USING (
  has_min_global_role(auth.uid(), 6)
  OR recipient_id = auth.uid()
  OR collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
);

-- ==============================================
-- Fonction RPC pour logger l'accès avec création signedUrl
-- ==============================================
CREATE OR REPLACE FUNCTION log_document_access(
  p_document_id uuid,
  p_access_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO document_access_logs (document_id, accessed_by, access_type)
  VALUES (p_document_id, auth.uid(), p_access_type);
END;
$$;