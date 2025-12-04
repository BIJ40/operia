-- RH-P0-03: Verrou concurrentiel pour document_requests

-- Ajout des colonnes de verrouillage
ALTER TABLE public.document_requests
ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS locked_at timestamptz;

-- Index pour les requêtes de verrouillage
CREATE INDEX IF NOT EXISTS idx_document_requests_locked 
ON public.document_requests(locked_by, locked_at) 
WHERE locked_by IS NOT NULL;

-- Fonction RPC pour verrouiller une demande (avec vérification conditionnelle)
CREATE OR REPLACE FUNCTION public.lock_document_request(p_request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_agency_id uuid;
  v_request record;
  v_lock_timeout interval := interval '15 minutes';
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- Récupérer l'agence de l'utilisateur
  SELECT agency_id INTO v_user_agency_id FROM profiles WHERE id = v_user_id;

  -- Récupérer la demande avec vérification d'agence
  SELECT * INTO v_request 
  FROM document_requests 
  WHERE id = p_request_id AND agency_id = v_user_agency_id;

  IF v_request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Demande non trouvée ou accès refusé');
  END IF;

  -- Vérifier si déjà verrouillée par quelqu'un d'autre (et pas expirée)
  IF v_request.locked_by IS NOT NULL 
     AND v_request.locked_by != v_user_id 
     AND v_request.locked_at > (now() - v_lock_timeout) THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Demande en cours de traitement par un autre utilisateur',
      'locked_by', v_request.locked_by,
      'locked_at', v_request.locked_at
    );
  END IF;

  -- Verrouiller la demande
  UPDATE document_requests
  SET locked_by = v_user_id, locked_at = now()
  WHERE id = p_request_id;

  RETURN json_build_object('success', true, 'locked_at', now());
END;
$$;

-- Fonction RPC pour déverrouiller une demande
CREATE OR REPLACE FUNCTION public.unlock_document_request(p_request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_request record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- Récupérer la demande
  SELECT * INTO v_request FROM document_requests WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Demande non trouvée');
  END IF;

  -- Seul le verrouilleur ou un admin peut déverrouiller
  IF v_request.locked_by IS NOT NULL 
     AND v_request.locked_by != v_user_id 
     AND NOT has_min_global_role(v_user_id, 5) THEN
    RETURN json_build_object('success', false, 'error', 'Vous ne pouvez pas déverrouiller cette demande');
  END IF;

  -- Déverrouiller
  UPDATE document_requests
  SET locked_by = NULL, locked_at = NULL
  WHERE id = p_request_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Fonction pour forcer le déverrouillage des locks expirés (admin ou cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_request_locks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE document_requests
  SET locked_by = NULL, locked_at = NULL
  WHERE locked_by IS NOT NULL 
    AND locked_at < (now() - interval '15 minutes');
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;