
-- ============================================================================
-- MODULE 7 : MAINTENANCE PRÉVENTIVE - PHASE A
-- Tables: fleet_vehicles, tools, maintenance_plan_templates, maintenance_plan_items, 
--         maintenance_events, maintenance_alerts
-- ============================================================================

-- 1. maintenance_plan_templates (doit être créée avant tools car référencée)
CREATE TABLE IF NOT EXISTS public.maintenance_plan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('vehicle', 'tool')),
  target_category text,
  description text,
  is_default_for_category boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.maintenance_plan_templates ENABLE ROW LEVEL SECURITY;

-- RLS: Lecture par agence ou N3+, écriture N2+ de l'agence
CREATE POLICY "maintenance_plan_templates_select" ON public.maintenance_plan_templates
  FOR SELECT USING (
    has_min_global_role(auth.uid(), 3) 
    OR agency_id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "maintenance_plan_templates_insert" ON public.maintenance_plan_templates
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "maintenance_plan_templates_update" ON public.maintenance_plan_templates
  FOR UPDATE USING (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "maintenance_plan_templates_delete" ON public.maintenance_plan_templates
  FOR DELETE USING (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 4)
  );

-- 2. maintenance_plan_items
CREATE TABLE IF NOT EXISTS public.maintenance_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_template_id uuid NOT NULL REFERENCES public.maintenance_plan_templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  frequency_unit text NOT NULL CHECK (frequency_unit IN ('days', 'months', 'years', 'km')),
  frequency_value integer NOT NULL,
  first_due_after_days integer,
  is_mandatory boolean NOT NULL DEFAULT true,
  legal_reference text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.maintenance_plan_items ENABLE ROW LEVEL SECURITY;

-- RLS via plan_template
CREATE POLICY "maintenance_plan_items_select" ON public.maintenance_plan_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_plan_templates mpt
      WHERE mpt.id = maintenance_plan_items.plan_template_id
      AND (has_min_global_role(auth.uid(), 3) OR mpt.agency_id = get_user_agency_id(auth.uid()))
    )
  );

CREATE POLICY "maintenance_plan_items_insert" ON public.maintenance_plan_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.maintenance_plan_templates mpt
      WHERE mpt.id = maintenance_plan_items.plan_template_id
      AND mpt.agency_id = get_user_agency_id(auth.uid())
      AND has_min_global_role(auth.uid(), 2)
    )
  );

CREATE POLICY "maintenance_plan_items_update" ON public.maintenance_plan_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_plan_templates mpt
      WHERE mpt.id = maintenance_plan_items.plan_template_id
      AND mpt.agency_id = get_user_agency_id(auth.uid())
      AND has_min_global_role(auth.uid(), 2)
    )
  );

CREATE POLICY "maintenance_plan_items_delete" ON public.maintenance_plan_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_plan_templates mpt
      WHERE mpt.id = maintenance_plan_items.plan_template_id
      AND mpt.agency_id = get_user_agency_id(auth.uid())
      AND has_min_global_role(auth.uid(), 4)
    )
  );

-- 3. fleet_vehicles
CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  registration text UNIQUE,
  brand text,
  model text,
  year integer,
  mileage_km integer,
  assigned_collaborator_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold', 'repair')),
  ct_due_at date,
  last_ct_at date,
  next_revision_at date,
  last_revision_at date,
  next_tires_change_at date,
  qr_token text UNIQUE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;

-- RLS: Lecture par agence ou N3+, écriture N2+
CREATE POLICY "fleet_vehicles_select" ON public.fleet_vehicles
  FOR SELECT USING (
    has_min_global_role(auth.uid(), 3) 
    OR agency_id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "fleet_vehicles_insert" ON public.fleet_vehicles
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "fleet_vehicles_update" ON public.fleet_vehicles
  FOR UPDATE USING (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "fleet_vehicles_delete" ON public.fleet_vehicles
  FOR DELETE USING (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 4)
  );

-- 4. tools (outillage, EPI, matériel divers)
CREATE TABLE IF NOT EXISTS public.tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text NOT NULL CHECK (category IN ('vehicle_tool', 'power_tool', 'ladder', 'epi', 'measuring', 'other')),
  serial_number text,
  assigned_collaborator_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'in_service' CHECK (status IN ('in_service', 'out_of_service', 'lost', 'repair')),
  qr_token text UNIQUE,
  default_plan_template_id uuid REFERENCES public.maintenance_plan_templates(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- RLS: Lecture par agence ou N3+, écriture N2+
CREATE POLICY "tools_select" ON public.tools
  FOR SELECT USING (
    has_min_global_role(auth.uid(), 3) 
    OR agency_id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "tools_insert" ON public.tools
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "tools_update" ON public.tools
  FOR UPDATE USING (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "tools_delete" ON public.tools
  FOR DELETE USING (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 4)
  );

-- 5. maintenance_events
CREATE TABLE IF NOT EXISTS public.maintenance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('vehicle', 'tool')),
  vehicle_id uuid REFERENCES public.fleet_vehicles(id) ON DELETE CASCADE,
  tool_id uuid REFERENCES public.tools(id) ON DELETE CASCADE,
  plan_item_id uuid REFERENCES public.maintenance_plan_items(id) ON DELETE SET NULL,
  label text NOT NULL,
  scheduled_at date NOT NULL,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.collaborators(id),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'overdue', 'completed', 'cancelled')),
  mileage_km integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Contrainte: un event doit avoir soit vehicle_id soit tool_id
  CONSTRAINT maintenance_events_target_check CHECK (
    (target_type = 'vehicle' AND vehicle_id IS NOT NULL AND tool_id IS NULL) OR
    (target_type = 'tool' AND tool_id IS NOT NULL AND vehicle_id IS NULL)
  )
);

ALTER TABLE public.maintenance_events ENABLE ROW LEVEL SECURITY;

-- RLS: Lecture par agence ou N3+, écriture N2+
CREATE POLICY "maintenance_events_select" ON public.maintenance_events
  FOR SELECT USING (
    has_min_global_role(auth.uid(), 3) 
    OR agency_id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "maintenance_events_insert" ON public.maintenance_events
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "maintenance_events_update" ON public.maintenance_events
  FOR UPDATE USING (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "maintenance_events_delete" ON public.maintenance_events
  FOR DELETE USING (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 4)
  );

-- 6. maintenance_alerts
CREATE TABLE IF NOT EXISTS public.maintenance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  maintenance_event_id uuid NOT NULL REFERENCES public.maintenance_events(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'closed')),
  notified_channels jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES public.collaborators(id),
  closed_at timestamptz,
  closed_by uuid REFERENCES public.collaborators(id)
);

ALTER TABLE public.maintenance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS: Lecture par agence ou N3+, écriture N2+
CREATE POLICY "maintenance_alerts_select" ON public.maintenance_alerts
  FOR SELECT USING (
    has_min_global_role(auth.uid(), 3) 
    OR agency_id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "maintenance_alerts_insert" ON public.maintenance_alerts
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "maintenance_alerts_update" ON public.maintenance_alerts
  FOR UPDATE USING (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "maintenance_alerts_delete" ON public.maintenance_alerts
  FOR DELETE USING (
    agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 4)
  );

-- Indexes pour performance
CREATE INDEX idx_fleet_vehicles_agency ON public.fleet_vehicles(agency_id);
CREATE INDEX idx_fleet_vehicles_status ON public.fleet_vehicles(status);
CREATE INDEX idx_fleet_vehicles_ct_due ON public.fleet_vehicles(ct_due_at);

CREATE INDEX idx_tools_agency ON public.tools(agency_id);
CREATE INDEX idx_tools_category ON public.tools(category);
CREATE INDEX idx_tools_status ON public.tools(status);

CREATE INDEX idx_maintenance_events_agency ON public.maintenance_events(agency_id);
CREATE INDEX idx_maintenance_events_status ON public.maintenance_events(status);
CREATE INDEX idx_maintenance_events_scheduled ON public.maintenance_events(scheduled_at);
CREATE INDEX idx_maintenance_events_vehicle ON public.maintenance_events(vehicle_id);
CREATE INDEX idx_maintenance_events_tool ON public.maintenance_events(tool_id);

CREATE INDEX idx_maintenance_alerts_agency ON public.maintenance_alerts(agency_id);
CREATE INDEX idx_maintenance_alerts_status ON public.maintenance_alerts(status);
CREATE INDEX idx_maintenance_alerts_severity ON public.maintenance_alerts(severity);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_maintenance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_fleet_vehicles_updated_at
  BEFORE UPDATE ON public.fleet_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_maintenance_updated_at();

CREATE TRIGGER update_tools_updated_at
  BEFORE UPDATE ON public.tools
  FOR EACH ROW EXECUTE FUNCTION public.update_maintenance_updated_at();

CREATE TRIGGER update_maintenance_plan_templates_updated_at
  BEFORE UPDATE ON public.maintenance_plan_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_maintenance_updated_at();

CREATE TRIGGER update_maintenance_plan_items_updated_at
  BEFORE UPDATE ON public.maintenance_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.update_maintenance_updated_at();

CREATE TRIGGER update_maintenance_events_updated_at
  BEFORE UPDATE ON public.maintenance_events
  FOR EACH ROW EXECUTE FUNCTION public.update_maintenance_updated_at();
