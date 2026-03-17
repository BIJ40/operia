
-- ============================================================
-- Module Rentabilité Dossier — Phase 1 : Schema
-- ============================================================

-- Enums
CREATE TYPE public.cost_source_type AS ENUM ('manual', 'bulletin', 'computed');
CREATE TYPE public.extraction_status_type AS ENUM ('pending', 'parsed', 'error');
CREATE TYPE public.validation_status_type AS ENUM ('pending', 'validated', 'rejected');
CREATE TYPE public.cost_validation_type AS ENUM ('draft', 'validated');
CREATE TYPE public.project_cost_type AS ENUM ('purchase', 'subcontract', 'travel', 'rental', 'misc');
CREATE TYPE public.cost_input_source AS ENUM ('manual', 'invoice_upload');
CREATE TYPE public.overhead_cost_type AS ENUM ('rent', 'vehicle', 'fuel', 'admin', 'software', 'insurance', 'other');
CREATE TYPE public.overhead_allocation_mode AS ENUM ('per_project', 'percentage_ca', 'per_hour', 'fixed');
CREATE TYPE public.reliability_level_type AS ENUM ('insufficient', 'low', 'medium', 'good', 'excellent');

-- ============================================================
-- 1. employee_cost_profiles
-- ============================================================
CREATE TABLE public.employee_cost_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,

  salary_gross_monthly numeric,
  employer_charges_rate numeric,
  employer_monthly_cost numeric,

  monthly_paid_hours numeric DEFAULT 151.67,
  monthly_productive_hours numeric DEFAULT 130,

  vehicle_monthly_cost numeric DEFAULT 0,
  fuel_monthly_cost numeric DEFAULT 0,
  equipment_monthly_cost numeric DEFAULT 0,
  other_monthly_costs numeric DEFAULT 0,

  loaded_hourly_cost numeric,

  cost_source cost_source_type NOT NULL DEFAULT 'manual',
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ecp_agency ON public.employee_cost_profiles(agency_id);
CREATE INDEX idx_ecp_collaborator ON public.employee_cost_profiles(collaborator_id);

ALTER TABLE public.employee_cost_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecp_select" ON public.employee_cost_profiles
  FOR SELECT TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "ecp_insert" ON public.employee_cost_profiles
  FOR INSERT TO authenticated
  WITH CHECK (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "ecp_update" ON public.employee_cost_profiles
  FOR UPDATE TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "ecp_delete" ON public.employee_cost_profiles
  FOR DELETE TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- 2. employee_salary_documents
-- ============================================================
CREATE TABLE public.employee_salary_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,

  file_path text NOT NULL,
  period_month date,

  extracted_gross_salary numeric,
  extracted_net_salary numeric,
  extracted_employer_cost numeric,
  extracted_hours numeric,
  extracted_data_json jsonb,

  extraction_status extraction_status_type NOT NULL DEFAULT 'pending',
  validation_status validation_status_type NOT NULL DEFAULT 'pending',

  validated_by uuid REFERENCES auth.users(id),
  validated_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_esd_agency ON public.employee_salary_documents(agency_id);
CREATE INDEX idx_esd_collaborator ON public.employee_salary_documents(collaborator_id);

ALTER TABLE public.employee_salary_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esd_select" ON public.employee_salary_documents
  FOR SELECT TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "esd_insert" ON public.employee_salary_documents
  FOR INSERT TO authenticated
  WITH CHECK (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "esd_update" ON public.employee_salary_documents
  FOR UPDATE TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "esd_delete" ON public.employee_salary_documents
  FOR DELETE TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- 3. project_costs
-- ============================================================
CREATE TABLE public.project_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  project_id text NOT NULL,

  cost_type project_cost_type NOT NULL,
  description text,
  cost_date date,

  amount_ht numeric NOT NULL DEFAULT 0,
  vat_rate numeric DEFAULT 20,
  amount_ttc numeric NOT NULL DEFAULT 0,

  source cost_input_source NOT NULL DEFAULT 'manual',
  document_path text,
  extracted_data_json jsonb,

  validation_status cost_validation_type NOT NULL DEFAULT 'draft',

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pc_agency ON public.project_costs(agency_id);
CREATE INDEX idx_pc_project ON public.project_costs(project_id);
CREATE INDEX idx_pc_type ON public.project_costs(cost_type);

ALTER TABLE public.project_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pc_select" ON public.project_costs
  FOR SELECT TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "pc_insert" ON public.project_costs
  FOR INSERT TO authenticated
  WITH CHECK (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "pc_update" ON public.project_costs
  FOR UPDATE TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "pc_delete" ON public.project_costs
  FOR DELETE TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- 4. project_cost_documents
-- ============================================================
CREATE TABLE public.project_cost_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  project_id text NOT NULL,

  file_path text NOT NULL,

  extracted_ht numeric,
  extracted_vat numeric,
  extracted_ttc numeric,
  extracted_date date,
  extracted_supplier text,
  extracted_data_json jsonb,

  extraction_status extraction_status_type NOT NULL DEFAULT 'pending',
  validation_status validation_status_type NOT NULL DEFAULT 'pending',

  linked_cost_id uuid REFERENCES public.project_costs(id) ON DELETE SET NULL,

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pcd_agency ON public.project_cost_documents(agency_id);
CREATE INDEX idx_pcd_project ON public.project_cost_documents(project_id);

ALTER TABLE public.project_cost_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pcd_select" ON public.project_cost_documents
  FOR SELECT TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "pcd_insert" ON public.project_cost_documents
  FOR INSERT TO authenticated
  WITH CHECK (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "pcd_update" ON public.project_cost_documents
  FOR UPDATE TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "pcd_delete" ON public.project_cost_documents
  FOR DELETE TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- 5. agency_overhead_rules
-- ============================================================
CREATE TABLE public.agency_overhead_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,

  cost_type overhead_cost_type NOT NULL,
  period_month date,
  amount_ht numeric NOT NULL DEFAULT 0,

  allocation_mode overhead_allocation_mode NOT NULL DEFAULT 'per_project',
  allocation_value numeric NOT NULL DEFAULT 0,

  validation_status cost_validation_type NOT NULL DEFAULT 'draft',

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aor_agency ON public.agency_overhead_rules(agency_id);

ALTER TABLE public.agency_overhead_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aor_select" ON public.agency_overhead_rules
  FOR SELECT TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "aor_insert" ON public.agency_overhead_rules
  FOR INSERT TO authenticated
  WITH CHECK (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "aor_update" ON public.agency_overhead_rules
  FOR UPDATE TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "aor_delete" ON public.agency_overhead_rules
  FOR DELETE TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- 6. project_profitability_snapshots
-- ============================================================
CREATE TABLE public.project_profitability_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  project_id text NOT NULL,

  computed_at timestamptz NOT NULL DEFAULT now(),

  ca_invoiced_ht numeric NOT NULL DEFAULT 0,
  ca_collected_ttc numeric NOT NULL DEFAULT 0,

  cost_labor numeric NOT NULL DEFAULT 0,
  cost_purchases numeric NOT NULL DEFAULT 0,
  cost_subcontracting numeric NOT NULL DEFAULT 0,
  cost_other numeric NOT NULL DEFAULT 0,
  cost_overhead numeric NOT NULL DEFAULT 0,
  cost_total numeric NOT NULL DEFAULT 0,

  gross_margin numeric NOT NULL DEFAULT 0,
  net_margin numeric NOT NULL DEFAULT 0,
  margin_pct numeric,

  hours_total numeric NOT NULL DEFAULT 0,

  completeness_score integer NOT NULL DEFAULT 0,
  reliability_level reliability_level_type NOT NULL DEFAULT 'insufficient',

  flags_json jsonb DEFAULT '[]'::jsonb,

  validation_status cost_validation_type NOT NULL DEFAULT 'draft',

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pps_agency ON public.project_profitability_snapshots(agency_id);
CREATE INDEX idx_pps_project ON public.project_profitability_snapshots(project_id);
CREATE UNIQUE INDEX idx_pps_agency_project ON public.project_profitability_snapshots(agency_id, project_id);

ALTER TABLE public.project_profitability_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pps_select" ON public.project_profitability_snapshots
  FOR SELECT TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "pps_insert" ON public.project_profitability_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "pps_update" ON public.project_profitability_snapshots
  FOR UPDATE TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "pps_delete" ON public.project_profitability_snapshots
  FOR DELETE TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- Storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('project-documents', 'project-documents', false, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "pd_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'project-documents');

CREATE POLICY "pd_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-documents');

CREATE POLICY "pd_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-documents');
