-- Table d'audit RH pour tracer toutes les actions
CREATE TABLE IF NOT EXISTS public.rh_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  collaborator_id uuid REFERENCES public.collaborators(id),
  action_type text NOT NULL, -- DOCUMENT_UPLOAD, DOCUMENT_DELETE, REQUEST_CREATE, REQUEST_UPDATE, CONTRACT_CREATE, etc.
  entity_type text NOT NULL, -- document, request, contract, salary, etc.
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb, -- infos additionnelles (filename, etc.)
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_rh_audit_log_agency ON public.rh_audit_log(agency_id);
CREATE INDEX idx_rh_audit_log_user ON public.rh_audit_log(user_id);
CREATE INDEX idx_rh_audit_log_collaborator ON public.rh_audit_log(collaborator_id);
CREATE INDEX idx_rh_audit_log_action ON public.rh_audit_log(action_type);
CREATE INDEX idx_rh_audit_log_created ON public.rh_audit_log(created_at DESC);

-- RLS
ALTER TABLE public.rh_audit_log ENABLE ROW LEVEL SECURITY;

-- Seuls les N2+ de l'agence peuvent voir l'audit
CREATE POLICY "rh_audit_log_select_agency" ON public.rh_audit_log
  FOR SELECT USING (
    agency_id = get_user_agency_id(auth.uid())
    AND has_min_global_role(auth.uid(), 2)
  );

-- N5+ peuvent voir tout l'audit
CREATE POLICY "rh_audit_log_select_admin" ON public.rh_audit_log
  FOR SELECT USING (has_min_global_role(auth.uid(), 5));

-- Insert autorisé pour les utilisateurs authentifiés (via RPC)
CREATE POLICY "rh_audit_log_insert" ON public.rh_audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Fonction RPC pour logger une action RH
CREATE OR REPLACE FUNCTION public.log_rh_action(
  p_action_type text,
  p_entity_type text,
  p_collaborator_id uuid DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_log_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  v_agency_id := get_user_agency_id(v_user_id);
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non rattaché à une agence';
  END IF;

  INSERT INTO rh_audit_log (
    agency_id, user_id, collaborator_id, action_type, entity_type,
    entity_id, old_values, new_values, metadata
  ) VALUES (
    v_agency_id, v_user_id, p_collaborator_id, p_action_type, p_entity_type,
    p_entity_id, p_old_values, p_new_values, p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;