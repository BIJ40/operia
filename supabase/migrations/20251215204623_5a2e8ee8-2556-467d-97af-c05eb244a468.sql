-- =============================================
-- DocGen Module - Migration SQL
-- =============================================

-- Table des templates de documents
CREATE TABLE IF NOT EXISTS public.doc_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'autre',
  docx_storage_path TEXT NOT NULL,
  tokens JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  scope TEXT NOT NULL DEFAULT 'agency' CHECK (scope IN ('global', 'agency')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des instances de documents générés
CREATE TABLE IF NOT EXISTS public.doc_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.doc_templates(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  token_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_path TEXT,
  final_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'preview', 'finalized')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_doc_templates_agency ON public.doc_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_doc_templates_scope ON public.doc_templates(scope);
CREATE INDEX IF NOT EXISTS idx_doc_instances_template ON public.doc_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_doc_instances_agency ON public.doc_instances(agency_id);
CREATE INDEX IF NOT EXISTS idx_doc_instances_collaborator ON public.doc_instances(collaborator_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_doc_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_doc_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_doc_templates_updated_at ON public.doc_templates;
CREATE TRIGGER trg_doc_templates_updated_at
  BEFORE UPDATE ON public.doc_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_doc_templates_updated_at();

DROP TRIGGER IF EXISTS trg_doc_instances_updated_at ON public.doc_instances;
CREATE TRIGGER trg_doc_instances_updated_at
  BEFORE UPDATE ON public.doc_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_doc_instances_updated_at();

-- RLS Policies
ALTER TABLE public.doc_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_instances ENABLE ROW LEVEL SECURITY;

-- doc_templates policies
CREATE POLICY "doc_templates_select" ON public.doc_templates
  FOR SELECT USING (
    scope = 'global' 
    OR agency_id = get_user_agency_id(auth.uid())
    OR has_min_global_role(auth.uid(), 4)
  );

CREATE POLICY "doc_templates_insert" ON public.doc_templates
  FOR INSERT WITH CHECK (
    has_min_global_role(auth.uid(), 4)
    OR (
      has_min_global_role(auth.uid(), 2)
      AND agency_id = get_user_agency_id(auth.uid())
      AND scope = 'agency'
    )
  );

CREATE POLICY "doc_templates_update" ON public.doc_templates
  FOR UPDATE USING (
    has_min_global_role(auth.uid(), 4)
    OR (
      has_min_global_role(auth.uid(), 2)
      AND agency_id = get_user_agency_id(auth.uid())
    )
  ) WITH CHECK (
    has_min_global_role(auth.uid(), 4)
    OR (
      has_min_global_role(auth.uid(), 2)
      AND agency_id = get_user_agency_id(auth.uid())
      AND scope = 'agency'
    )
  );

CREATE POLICY "doc_templates_delete" ON public.doc_templates
  FOR DELETE USING (
    has_min_global_role(auth.uid(), 4)
    OR (
      has_min_global_role(auth.uid(), 2)
      AND agency_id = get_user_agency_id(auth.uid())
      AND created_by = auth.uid()
    )
  );

-- doc_instances policies
CREATE POLICY "doc_instances_select" ON public.doc_instances
  FOR SELECT USING (
    agency_id = get_user_agency_id(auth.uid())
    OR has_min_global_role(auth.uid(), 4)
  );

CREATE POLICY "doc_instances_insert" ON public.doc_instances
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    OR has_min_global_role(auth.uid(), 4)
  );

CREATE POLICY "doc_instances_update" ON public.doc_instances
  FOR UPDATE USING (
    agency_id = get_user_agency_id(auth.uid())
    OR has_min_global_role(auth.uid(), 4)
  ) WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    AND template_id = (SELECT template_id FROM public.doc_instances WHERE id = doc_instances.id)
    AND created_by = (SELECT created_by FROM public.doc_instances WHERE id = doc_instances.id)
  );

CREATE POLICY "doc_instances_delete" ON public.doc_instances
  FOR DELETE USING (
    (agency_id = get_user_agency_id(auth.uid()) AND created_by = auth.uid())
    OR has_min_global_role(auth.uid(), 4)
  );