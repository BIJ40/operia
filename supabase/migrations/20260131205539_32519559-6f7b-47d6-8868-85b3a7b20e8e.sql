-- ============================================================================
-- ACTIVITY LOG UNIFIÉ - Table centrale pour Copilote IA
-- ============================================================================

-- 1. Enum pour les types d'acteurs
CREATE TYPE activity_actor_type AS ENUM (
  'user',       -- Utilisateur interne (auth.users)
  'apporteur',  -- Manager apporteur (apporteur_managers)
  'system',     -- Action automatique (trigger, cron)
  'ai'          -- Action IA (Helpi, Copilote futur)
);

-- 2. Table principale activity_log
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.apogee_agencies(id) ON DELETE SET NULL,
  actor_type activity_actor_type NOT NULL DEFAULT 'user',
  actor_id UUID,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_label TEXT,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Index stratégiques
CREATE INDEX idx_activity_log_actor ON activity_log(actor_type, actor_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_module_agency ON activity_log(module, agency_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- N5+ voit tout
CREATE POLICY "activity_log_select_admin" ON activity_log
  FOR SELECT TO authenticated
  USING (has_min_global_role(auth.uid(), 5));

-- N2+ voit son agence
CREATE POLICY "activity_log_select_agency" ON activity_log
  FOR SELECT TO authenticated
  USING (
    agency_id = get_user_agency_id(auth.uid())
    AND has_min_global_role(auth.uid(), 2)
  );

-- Insert bloqué directement, passer par RPC
CREATE POLICY "activity_log_no_direct_insert" ON activity_log
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- 6. Fonction d'insertion sécurisée (Security Definer)
CREATE OR REPLACE FUNCTION public.log_activity(
  p_action TEXT,
  p_module TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_entity_label TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_actor_type activity_actor_type DEFAULT 'user',
  p_actor_id UUID DEFAULT NULL,
  p_agency_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_agency_id UUID;
  v_log_id UUID;
BEGIN
  -- Déterminer l'acteur (user par défaut = auth.uid())
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  
  -- Déterminer l'agence
  v_agency_id := COALESCE(p_agency_id, get_user_agency_id(auth.uid()));
  
  INSERT INTO activity_log (
    agency_id, actor_type, actor_id, action, module,
    entity_type, entity_id, entity_label,
    old_values, new_values, metadata
  ) VALUES (
    v_agency_id, p_actor_type, v_actor_id, p_action, p_module,
    p_entity_type, p_entity_id, p_entity_label,
    p_old_values, p_new_values, COALESCE(p_metadata, '{}')
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 7. Trigger générique de tracking
CREATE OR REPLACE FUNCTION public.track_entity_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module TEXT;
  v_entity_label TEXT;
  v_agency_id UUID;
BEGIN
  -- Mapping table → module
  v_module := CASE TG_TABLE_NAME
    WHEN 'collaborators' THEN 'rh'
    WHEN 'employment_contracts' THEN 'rh'
    WHEN 'salary_history' THEN 'rh'
    WHEN 'document_requests' THEN 'rh'
    WHEN 'collaborator_documents' THEN 'rh'
    WHEN 'fleet_vehicles' THEN 'parc'
    WHEN 'epi_assignments' THEN 'parc'
    WHEN 'epi_incidents' THEN 'parc'
    WHEN 'maintenance_alerts' THEN 'parc'
    WHEN 'apogee_tickets' THEN 'tickets'
    WHEN 'media_assets' THEN 'mediatheque'
    WHEN 'apporteurs' THEN 'apporteurs'
    WHEN 'apporteur_intervention_requests' THEN 'apporteurs'
    WHEN 'apporteur_users' THEN 'apporteurs'
    ELSE 'system'
  END;
  
  -- Générer label lisible
  IF TG_OP = 'DELETE' THEN
    v_entity_label := CASE TG_TABLE_NAME
      WHEN 'collaborators' THEN OLD.first_name || ' ' || OLD.last_name
      WHEN 'fleet_vehicles' THEN OLD.registration
      WHEN 'apogee_tickets' THEN OLD.element_concerne
      WHEN 'apporteurs' THEN OLD.name
      ELSE NULL
    END;
    v_agency_id := OLD.agency_id;
  ELSE
    v_entity_label := CASE TG_TABLE_NAME
      WHEN 'collaborators' THEN NEW.first_name || ' ' || NEW.last_name
      WHEN 'fleet_vehicles' THEN NEW.registration
      WHEN 'apogee_tickets' THEN NEW.element_concerne
      WHEN 'apporteurs' THEN NEW.name
      ELSE NULL
    END;
    v_agency_id := NEW.agency_id;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (
      agency_id, actor_type, actor_id, action, module,
      entity_type, entity_id, entity_label,
      old_values, new_values, metadata
    ) VALUES (
      v_agency_id, 'user', auth.uid(), 'CREATE', v_module,
      TG_TABLE_NAME, NEW.id, v_entity_label,
      NULL, to_jsonb(NEW),
      jsonb_build_object('trigger', TG_NAME, 'table', TG_TABLE_NAME)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_log (
      agency_id, actor_type, actor_id, action, module,
      entity_type, entity_id, entity_label,
      old_values, new_values, metadata
    ) VALUES (
      v_agency_id, 'user', auth.uid(), 'UPDATE', v_module,
      TG_TABLE_NAME, NEW.id, v_entity_label,
      to_jsonb(OLD), to_jsonb(NEW),
      jsonb_build_object('trigger', TG_NAME, 'table', TG_TABLE_NAME)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (
      agency_id, actor_type, actor_id, action, module,
      entity_type, entity_id, entity_label,
      old_values, new_values, metadata
    ) VALUES (
      v_agency_id, 'system', NULL, 'DELETE', v_module,
      TG_TABLE_NAME, OLD.id, v_entity_label,
      to_jsonb(OLD), NULL,
      jsonb_build_object('trigger', TG_NAME, 'table', TG_TABLE_NAME)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 8. Attacher les triggers aux tables critiques

-- RH
CREATE TRIGGER trg_activity_collaborators
  AFTER INSERT OR UPDATE OR DELETE ON collaborators
  FOR EACH ROW EXECUTE FUNCTION track_entity_changes();

CREATE TRIGGER trg_activity_employment_contracts
  AFTER INSERT OR UPDATE OR DELETE ON employment_contracts
  FOR EACH ROW EXECUTE FUNCTION track_entity_changes();

-- Parc
CREATE TRIGGER trg_activity_fleet_vehicles
  AFTER INSERT OR UPDATE OR DELETE ON fleet_vehicles
  FOR EACH ROW EXECUTE FUNCTION track_entity_changes();

CREATE TRIGGER trg_activity_epi_assignments
  AFTER INSERT OR UPDATE OR DELETE ON epi_assignments
  FOR EACH ROW EXECUTE FUNCTION track_entity_changes();

-- Apporteurs
CREATE TRIGGER trg_activity_apporteurs
  AFTER INSERT OR UPDATE OR DELETE ON apporteurs
  FOR EACH ROW EXECUTE FUNCTION track_entity_changes();

CREATE TRIGGER trg_activity_apporteur_requests
  AFTER INSERT OR UPDATE OR DELETE ON apporteur_intervention_requests
  FOR EACH ROW EXECUTE FUNCTION track_entity_changes();