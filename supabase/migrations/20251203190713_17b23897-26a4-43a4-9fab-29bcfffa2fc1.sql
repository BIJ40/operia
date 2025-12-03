-- Phase 2.3: Solidification du cycle Demande → Réponse → Notification

-- 1. Ajouter la colonne employee_seen_at à document_requests
ALTER TABLE public.document_requests
ADD COLUMN IF NOT EXISTS employee_seen_at timestamptz NULL;

-- Note: processed_by existe déjà et sert de handled_by_profile_id

-- 2. RPC handle_document_request - traiter une demande RH
CREATE OR REPLACE FUNCTION public.handle_document_request(
  p_request_id uuid,
  p_status text,
  p_response_note text DEFAULT NULL,
  p_response_document_id uuid DEFAULT NULL
)
RETURNS document_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_agency_id uuid;
  v_request_agency_id uuid;
  v_has_rh_access boolean;
  v_result document_requests;
BEGIN
  -- Récupérer l'utilisateur courant
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  -- Récupérer l'agence de l'utilisateur
  SELECT agency_id INTO v_user_agency_id FROM profiles WHERE id = v_user_id;
  IF v_user_agency_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non rattaché à une agence';
  END IF;

  -- Vérifier que l'utilisateur a les droits RH (rh_viewer ou rh_admin)
  SELECT 
    (enabled_modules->'rh'->'options'->>'rh_viewer')::boolean = true
    OR (enabled_modules->'rh'->'options'->>'rh_admin')::boolean = true
    OR has_min_global_role(v_user_id, 2) -- Dirigeant N2+ a accès
  INTO v_has_rh_access
  FROM profiles WHERE id = v_user_id;

  IF NOT COALESCE(v_has_rh_access, false) THEN
    RAISE EXCEPTION 'Accès RH non autorisé';
  END IF;

  -- Vérifier que la demande appartient à la même agence
  SELECT agency_id INTO v_request_agency_id FROM document_requests WHERE id = p_request_id;
  IF v_request_agency_id IS NULL THEN
    RAISE EXCEPTION 'Demande non trouvée';
  END IF;
  IF v_request_agency_id != v_user_agency_id THEN
    RAISE EXCEPTION 'Demande appartenant à une autre agence';
  END IF;

  -- Mettre à jour la demande
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
$$;

-- 3. RPC mark_document_request_seen - marquer une demande comme vue par le salarié
CREATE OR REPLACE FUNCTION public.mark_document_request_seen(p_request_id uuid)
RETURNS document_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collaborator_id uuid;
  v_request_collaborator_id uuid;
  v_result document_requests;
BEGIN
  -- Récupérer le collaborateur courant
  v_collaborator_id := get_current_collaborator_id();
  IF v_collaborator_id IS NULL THEN
    RAISE EXCEPTION 'Collaborateur introuvable pour cet utilisateur';
  END IF;

  -- Vérifier que la demande appartient au collaborateur
  SELECT collaborator_id INTO v_request_collaborator_id FROM document_requests WHERE id = p_request_id;
  IF v_request_collaborator_id IS NULL THEN
    RAISE EXCEPTION 'Demande non trouvée';
  END IF;
  IF v_request_collaborator_id != v_collaborator_id THEN
    RAISE EXCEPTION 'Cette demande ne vous appartient pas';
  END IF;

  -- Marquer comme vue
  UPDATE document_requests
  SET employee_seen_at = now()
  WHERE id = p_request_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- 4. Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.handle_document_request(uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_document_request_seen(uuid) TO authenticated;