-- Fix the track_entity_changes trigger function to handle tables without agency_id
-- salary_history doesn't have agency_id column

CREATE OR REPLACE FUNCTION public.track_entity_changes()
RETURNS TRIGGER AS $$
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
  
  -- Générer label lisible - handle tables that don't have first_name/last_name
  IF TG_OP = 'DELETE' THEN
    v_entity_label := CASE TG_TABLE_NAME
      WHEN 'collaborators' THEN OLD.first_name || ' ' || OLD.last_name
      WHEN 'fleet_vehicles' THEN OLD.registration
      WHEN 'apogee_tickets' THEN OLD.element_concerne
      WHEN 'apporteurs' THEN OLD.name
      WHEN 'employment_contracts' THEN 'Contrat ' || COALESCE(OLD.contract_type, 'CDI')
      WHEN 'salary_history' THEN 'Entrée salaire'
      ELSE NULL
    END;
    -- Get agency_id - handle tables without this column
    v_agency_id := CASE TG_TABLE_NAME
      WHEN 'salary_history' THEN NULL  -- salary_history has no agency_id
      ELSE OLD.agency_id
    END;
  ELSE
    v_entity_label := CASE TG_TABLE_NAME
      WHEN 'collaborators' THEN NEW.first_name || ' ' || NEW.last_name
      WHEN 'fleet_vehicles' THEN NEW.registration
      WHEN 'apogee_tickets' THEN NEW.element_concerne
      WHEN 'apporteurs' THEN NEW.name
      WHEN 'employment_contracts' THEN 'Contrat ' || COALESCE(NEW.contract_type, 'CDI')
      WHEN 'salary_history' THEN 'Entrée salaire'
      ELSE NULL
    END;
    -- Get agency_id - handle tables without this column
    v_agency_id := CASE TG_TABLE_NAME
      WHEN 'salary_history' THEN NULL  -- salary_history has no agency_id
      ELSE NEW.agency_id
    END;
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;