-- RPC pour créer une demande de document (logique métier côté DB)
CREATE OR REPLACE FUNCTION request_document(
  p_request_type text,
  p_description text DEFAULT NULL
)
RETURNS document_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collaborator_id uuid;
  v_agency_id uuid;
  v_row document_requests;
BEGIN
  -- Récupération du collaborateur courant
  v_collaborator_id := get_current_collaborator_id();
  IF v_collaborator_id IS NULL THEN
    RAISE EXCEPTION 'Collaborateur introuvable pour cet utilisateur';
  END IF;

  -- Récupération de l'agence courante
  v_agency_id := get_user_agency_id(auth.uid());
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Agence introuvable pour cet utilisateur';
  END IF;

  INSERT INTO document_requests (
    collaborator_id,
    agency_id,
    request_type,
    description
  )
  VALUES (
    v_collaborator_id,
    v_agency_id,
    p_request_type,
    p_description
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;