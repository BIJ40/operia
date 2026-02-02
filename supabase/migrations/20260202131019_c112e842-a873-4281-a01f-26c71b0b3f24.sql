-- Fix: make track_entity_changes robust for generic trigger usage
-- It must never reference NEW.<column> directly, because columns differ per table.

CREATE OR REPLACE FUNCTION public.track_entity_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_module TEXT;
  v_entity_label TEXT;
  v_agency_id UUID;
  v_new JSONB;
  v_old JSONB;
  v_entity_id UUID;
BEGIN
  -- Snapshot rows as JSONB (safe even when table schemas differ)
  IF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_old := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_new := to_jsonb(NEW);
    v_old := to_jsonb(OLD);
  ELSIF TG_OP = 'DELETE' THEN
    v_new := NULL;
    v_old := to_jsonb(OLD);
  END IF;

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

  -- Entity id (assumes tracked tables use UUID PK named 'id')
  v_entity_id := NULLIF(COALESCE(v_new->>'id', v_old->>'id'), '')::uuid;

  -- Agency id (optional depending on table)
  v_agency_id := NULLIF(COALESCE(v_new->>'agency_id', v_old->>'agency_id'), '')::uuid;

  -- Human-friendly label without touching NEW.<field>
  v_entity_label := CASE TG_TABLE_NAME
    WHEN 'collaborators' THEN NULLIF(
      btrim(
        COALESCE(v_new->>'first_name', v_old->>'first_name', '') || ' ' ||
        COALESCE(v_new->>'last_name', v_old->>'last_name', '')
      ),
      ''
    )
    WHEN 'fleet_vehicles' THEN COALESCE(v_new->>'registration', v_old->>'registration')
    WHEN 'apogee_tickets' THEN COALESCE(v_new->>'element_concerne', v_old->>'element_concerne')
    WHEN 'apporteurs' THEN COALESCE(v_new->>'name', v_old->>'name')
    WHEN 'employment_contracts' THEN 'Contrat ' || COALESCE(v_new->>'contract_type', v_old->>'contract_type', 'CDI')
    WHEN 'salary_history' THEN 'Entrée salaire'
    ELSE NULL
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (
      agency_id, actor_type, actor_id, action, module,
      entity_type, entity_id, entity_label,
      old_values, new_values, metadata
    ) VALUES (
      v_agency_id, 'user', auth.uid(), 'CREATE', v_module,
      TG_TABLE_NAME, v_entity_id, v_entity_label,
      NULL, v_new,
      jsonb_build_object('trigger', TG_NAME, 'table', TG_TABLE_NAME)
    );

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (
      agency_id, actor_type, actor_id, action, module,
      entity_type, entity_id, entity_label,
      old_values, new_values, metadata
    ) VALUES (
      v_agency_id, 'user', auth.uid(), 'UPDATE', v_module,
      TG_TABLE_NAME, v_entity_id, v_entity_label,
      v_old, v_new,
      jsonb_build_object('trigger', TG_NAME, 'table', TG_TABLE_NAME)
    );

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (
      agency_id, actor_type, actor_id, action, module,
      entity_type, entity_id, entity_label,
      old_values, new_values, metadata
    ) VALUES (
      v_agency_id, 'system', NULL, 'DELETE', v_module,
      TG_TABLE_NAME, v_entity_id, v_entity_label,
      v_old, NULL,
      jsonb_build_object('trigger', TG_NAME, 'table', TG_TABLE_NAME)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;