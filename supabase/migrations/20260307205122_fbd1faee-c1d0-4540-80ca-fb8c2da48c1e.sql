-- ============================================================================
-- BLOC 1: Réécrire les fonctions SQL pour ne plus utiliser profiles.enabled_modules
-- Source de vérité unique: user_modules + has_module_v2 / has_module_option_v2
-- ============================================================================

-- 1. has_apogee_tickets_access: supprimer le check profiles.enabled_modules
CREATE OR REPLACE FUNCTION public.has_apogee_tickets_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_modules
      WHERE user_id = _user_id
        AND module_key IN ('apogee_tickets', 'ticketing')
    )
    OR public.has_min_global_role(_user_id, 5);
$function$;

-- 2. has_franchiseur_access: utiliser has_module_v2 + rôle N3+
CREATE OR REPLACE FUNCTION public.has_franchiseur_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    has_module_v2(_user_id, 'reseau_franchiseur')
    OR has_min_global_role(_user_id, 3);
$function$;

-- 3. has_support_access: utiliser has_module_v2 + N5+
CREATE OR REPLACE FUNCTION public.has_support_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    has_module_v2(_user_id, 'aide')
    OR has_module_v2(_user_id, 'support')
    OR has_min_global_role(_user_id, 5);
$function$;

-- 4. is_support_agent: utiliser has_module_option_v2
CREATE OR REPLACE FUNCTION public.is_support_agent(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    has_module_option_v2(_user_id, 'aide', 'agent')
    OR has_module_option_v2(_user_id, 'support', 'agent');
$function$;

-- 5. get_collaborator_sensitive_data: remplacer le check JSONB par has_module_option_v2
CREATE OR REPLACE FUNCTION public.get_collaborator_sensitive_data(p_collaborator_id uuid)
RETURNS TABLE(ssn text, emergency_contact text, emergency_phone text, birth_date text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF NOT (
    p_collaborator_id = get_current_collaborator_id()
    OR has_min_global_role(v_user_id, 6)
    OR (
      EXISTS (
        SELECT 1 FROM collaborators c
        WHERE c.id = p_collaborator_id
        AND c.agency_id = get_user_agency_id(v_user_id)
      )
      AND (
        has_module_option_v2(v_user_id, 'rh', 'rh_admin')
        OR has_min_global_role(v_user_id, 5)
      )
    )
  ) THEN
    RAISE EXCEPTION 'Accès non autorisé aux données sensibles';
  END IF;
  
  INSERT INTO sensitive_data_access_log (collaborator_id, accessed_by, access_type)
  VALUES (p_collaborator_id, v_user_id, 'view');
  
  RETURN QUERY
  SELECT 
    convert_from(decode(social_security_number_encrypted, 'base64'), 'UTF8') as ssn,
    convert_from(decode(emergency_contact_encrypted, 'base64'), 'UTF8') as emergency_contact,
    convert_from(decode(emergency_phone_encrypted, 'base64'), 'UTF8') as emergency_phone,
    convert_from(decode(birth_date_encrypted, 'base64'), 'UTF8') as birth_date
  FROM collaborator_sensitive_data
  WHERE collaborator_id = p_collaborator_id;
END;
$function$;

-- 6. handle_document_request: remplacer le check JSONB par has_module_option_v2
CREATE OR REPLACE FUNCTION public.handle_document_request(p_request_id uuid, p_status text, p_response_note text DEFAULT NULL::text, p_response_document_id uuid DEFAULT NULL::uuid)
RETURNS document_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_user_agency_id uuid;
  v_request_agency_id uuid;
  v_has_rh_access boolean;
  v_result document_requests;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  SELECT agency_id INTO v_user_agency_id FROM profiles WHERE id = v_user_id;
  IF v_user_agency_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non rattaché à une agence';
  END IF;

  v_has_rh_access := has_module_option_v2(v_user_id, 'rh', 'rh_viewer')
    OR has_module_option_v2(v_user_id, 'rh', 'rh_admin')
    OR has_min_global_role(v_user_id, 2);

  IF NOT v_has_rh_access THEN
    RAISE EXCEPTION 'Accès RH non autorisé';
  END IF;

  SELECT agency_id INTO v_request_agency_id FROM document_requests WHERE id = p_request_id;
  IF v_request_agency_id IS NULL THEN
    RAISE EXCEPTION 'Demande non trouvée';
  END IF;
  IF v_request_agency_id != v_user_agency_id THEN
    RAISE EXCEPTION 'Demande appartenant à une autre agence';
  END IF;

  UPDATE document_requests
  SET 
    status = p_status,
    response_note = p_response_note,
    response_document_id = p_response_document_id,
    processed_by = v_user_id,
    processed_at = CASE WHEN p_status IN ('COMPLETED', 'REJECTED') THEN now() ELSE processed_at END
  WHERE id = p_request_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;

-- ============================================================================
-- BLOC 1b: Réécrire les ~20 RLS policies
-- ============================================================================

-- apogee_impact_tags
DROP POLICY IF EXISTS "Users with apogee_tickets module can read tags" ON apogee_impact_tags;
CREATE POLICY "Users with apogee_tickets module can read tags"
  ON apogee_impact_tags FOR SELECT TO authenticated
  USING (has_apogee_tickets_access(auth.uid()));

-- apogee_reported_by
DROP POLICY IF EXISTS "Users with apogee_tickets module can read reported_by" ON apogee_reported_by;
CREATE POLICY "Users with apogee_tickets module can read reported_by"
  ON apogee_reported_by FOR SELECT TO authenticated
  USING (has_apogee_tickets_access(auth.uid()));

-- apogee_ticket_attachments
DROP POLICY IF EXISTS "Apogee tickets users can insert attachments" ON apogee_ticket_attachments;
CREATE POLICY "Apogee tickets users can insert attachments"
  ON apogee_ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (has_apogee_tickets_access(auth.uid()));

DROP POLICY IF EXISTS "Apogee tickets users can view attachments" ON apogee_ticket_attachments;
CREATE POLICY "Apogee tickets users can view attachments"
  ON apogee_ticket_attachments FOR SELECT TO authenticated
  USING (has_apogee_tickets_access(auth.uid()));

-- apogee_ticket_comments
DROP POLICY IF EXISTS "Users with apogee_tickets module can insert comments" ON apogee_ticket_comments;
CREATE POLICY "Users with apogee_tickets module can insert comments"
  ON apogee_ticket_comments FOR INSERT TO authenticated
  WITH CHECK (created_by_user_id = auth.uid() AND has_apogee_tickets_access(auth.uid()));

DROP POLICY IF EXISTS "Users with apogee_tickets module can read comments" ON apogee_ticket_comments;
CREATE POLICY "Users with apogee_tickets module can read comments"
  ON apogee_ticket_comments FOR SELECT TO authenticated
  USING (has_apogee_tickets_access(auth.uid()));

-- apogee_ticket_field_permissions
DROP POLICY IF EXISTS "Users with apogee_tickets module can read permissions" ON apogee_ticket_field_permissions;
CREATE POLICY "Users with apogee_tickets module can read permissions"
  ON apogee_ticket_field_permissions FOR SELECT TO authenticated
  USING (has_apogee_tickets_access(auth.uid()));

-- apogee_ticket_history
DROP POLICY IF EXISTS "Users with apogee_tickets module can insert history" ON apogee_ticket_history;
CREATE POLICY "Users with apogee_tickets module can insert history"
  ON apogee_ticket_history FOR INSERT TO authenticated
  WITH CHECK (has_apogee_tickets_access(auth.uid()));

DROP POLICY IF EXISTS "Users with apogee_tickets module can view history" ON apogee_ticket_history;
CREATE POLICY "Users with apogee_tickets module can view history"
  ON apogee_ticket_history FOR SELECT TO authenticated
  USING (has_apogee_tickets_access(auth.uid()));

-- apogee_ticket_tags
DROP POLICY IF EXISTS "Users with apogee_tickets module can create tags" ON apogee_ticket_tags;
CREATE POLICY "Users with apogee_tickets module can create tags"
  ON apogee_ticket_tags FOR INSERT TO authenticated
  WITH CHECK (has_apogee_tickets_access(auth.uid()));

DROP POLICY IF EXISTS "Users with apogee_tickets module can view tags" ON apogee_ticket_tags;
CREATE POLICY "Users with apogee_tickets module can view tags"
  ON apogee_ticket_tags FOR SELECT TO authenticated
  USING (has_apogee_tickets_access(auth.uid()));

-- ticket_embeddings
DROP POLICY IF EXISTS "Users with apogee_tickets module can insert embeddings" ON ticket_embeddings;
CREATE POLICY "Users with apogee_tickets module can insert embeddings"
  ON ticket_embeddings FOR INSERT TO authenticated
  WITH CHECK (has_apogee_tickets_access(auth.uid()));

DROP POLICY IF EXISTS "Users with apogee_tickets module can read embeddings" ON ticket_embeddings;
CREATE POLICY "Users with apogee_tickets module can read embeddings"
  ON ticket_embeddings FOR SELECT TO authenticated
  USING (has_apogee_tickets_access(auth.uid()));

DROP POLICY IF EXISTS "Users with apogee_tickets module can update embeddings" ON ticket_embeddings;
CREATE POLICY "Users with apogee_tickets module can update embeddings"
  ON ticket_embeddings FOR UPDATE TO authenticated
  USING (has_apogee_tickets_access(auth.uid()));

-- ticket_duplicate_suggestions
DROP POLICY IF EXISTS "Users with apogee_tickets module can insert suggestions" ON ticket_duplicate_suggestions;
CREATE POLICY "Users with apogee_tickets module can insert suggestions"
  ON ticket_duplicate_suggestions FOR INSERT TO authenticated
  WITH CHECK (has_apogee_tickets_access(auth.uid()));

DROP POLICY IF EXISTS "Users with apogee_tickets module can read suggestions" ON ticket_duplicate_suggestions;
CREATE POLICY "Users with apogee_tickets module can read suggestions"
  ON ticket_duplicate_suggestions FOR SELECT TO authenticated
  USING (has_apogee_tickets_access(auth.uid()));

DROP POLICY IF EXISTS "Users with apogee_tickets module can update suggestions" ON ticket_duplicate_suggestions;
CREATE POLICY "Users with apogee_tickets module can update suggestions"
  ON ticket_duplicate_suggestions FOR UPDATE TO authenticated
  USING (has_apogee_tickets_access(auth.uid()));

-- collaborator_sensitive_data (RH)
DROP POLICY IF EXISTS "sensitive_data_insert" ON collaborator_sensitive_data;
CREATE POLICY "sensitive_data_insert"
  ON collaborator_sensitive_data FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collaborators c
      WHERE c.id = collaborator_sensitive_data.collaborator_id
        AND c.agency_id = get_user_agency_id(auth.uid())
        AND (has_module_option_v2(auth.uid(), 'rh', 'rh_admin') OR has_min_global_role(auth.uid(), 5))
    )
  );

DROP POLICY IF EXISTS "sensitive_data_rh_admin_access" ON collaborator_sensitive_data;
CREATE POLICY "sensitive_data_rh_admin_access"
  ON collaborator_sensitive_data FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collaborators c
      WHERE c.id = collaborator_sensitive_data.collaborator_id
        AND c.agency_id = get_user_agency_id(auth.uid())
        AND (has_module_option_v2(auth.uid(), 'rh', 'rh_admin') OR has_min_global_role(auth.uid(), 5))
    )
  );

DROP POLICY IF EXISTS "sensitive_data_update" ON collaborator_sensitive_data;
CREATE POLICY "sensitive_data_update"
  ON collaborator_sensitive_data FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collaborators c
      WHERE c.id = collaborator_sensitive_data.collaborator_id
        AND c.agency_id = get_user_agency_id(auth.uid())
        AND (has_module_option_v2(auth.uid(), 'rh', 'rh_admin') OR has_min_global_role(auth.uid(), 5))
    )
  );

-- salary_history
DROP POLICY IF EXISTS "salary_history_select" ON salary_history;
CREATE POLICY "salary_history_select"
  ON salary_history FOR SELECT TO authenticated
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
              OR has_module_option_v2(auth.uid(), 'rh', 'rh_admin')
            )
          )
        )
    )
  );