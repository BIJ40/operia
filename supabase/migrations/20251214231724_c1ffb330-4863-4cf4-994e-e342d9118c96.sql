-- =============================================
-- FLOW BUILDER TABLES
-- =============================================

-- Table: flow_blocks (bibliothèque de blocs réutilisables)
CREATE TABLE public.flow_blocks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  icon TEXT,
  schema JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: flow_schemas (workflows/formulaires)
CREATE TABLE public.flow_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL, -- 'rt', 'bon_intervention', 'pv', 'checklist'
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: flow_schema_versions (versioning des schémas)
CREATE TABLE public.flow_schema_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id UUID NOT NULL REFERENCES public.flow_schemas(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  json JSONB NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schema_id, version)
);

-- Enable RLS
ALTER TABLE public.flow_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_schema_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: N4+ (franchisor_admin) can manage flow data
CREATE POLICY "N4+ can view flow_blocks"
  ON public.flow_blocks FOR SELECT
  USING (has_min_global_role(auth.uid(), 4));

CREATE POLICY "N4+ can insert flow_blocks"
  ON public.flow_blocks FOR INSERT
  WITH CHECK (has_min_global_role(auth.uid(), 4));

CREATE POLICY "N4+ can update flow_blocks"
  ON public.flow_blocks FOR UPDATE
  USING (has_min_global_role(auth.uid(), 4));

CREATE POLICY "N4+ can delete flow_blocks"
  ON public.flow_blocks FOR DELETE
  USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "N4+ can view flow_schemas"
  ON public.flow_schemas FOR SELECT
  USING (has_min_global_role(auth.uid(), 4));

CREATE POLICY "N4+ can insert flow_schemas"
  ON public.flow_schemas FOR INSERT
  WITH CHECK (has_min_global_role(auth.uid(), 4));

CREATE POLICY "N4+ can update flow_schemas"
  ON public.flow_schemas FOR UPDATE
  USING (has_min_global_role(auth.uid(), 4));

CREATE POLICY "N4+ can delete flow_schemas"
  ON public.flow_schemas FOR DELETE
  USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "N4+ can view flow_schema_versions"
  ON public.flow_schema_versions FOR SELECT
  USING (has_min_global_role(auth.uid(), 4));

CREATE POLICY "N4+ can insert flow_schema_versions"
  ON public.flow_schema_versions FOR INSERT
  WITH CHECK (has_min_global_role(auth.uid(), 4));

CREATE POLICY "N4+ can update flow_schema_versions"
  ON public.flow_schema_versions FOR UPDATE
  USING (has_min_global_role(auth.uid(), 4));

-- Triggers for updated_at
CREATE TRIGGER update_flow_blocks_updated_at
  BEFORE UPDATE ON public.flow_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flow_schemas_updated_at
  BEFORE UPDATE ON public.flow_schemas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: bloc dimensions_hxl
INSERT INTO public.flow_blocks (id, name, category, icon, schema) VALUES (
  'dimensions_hxl',
  'Dimensions H×L',
  'mesures',
  'Ruler',
  '{
    "fields": [
      {
        "key": "hauteur",
        "label": "Hauteur",
        "type": "number",
        "unit": "cm",
        "required": true,
        "min": 0,
        "max": 10000
      },
      {
        "key": "largeur",
        "label": "Largeur",
        "type": "number",
        "unit": "cm",
        "required": true,
        "min": 0,
        "max": 10000
      }
    ],
    "computed": [
      {
        "key": "surface",
        "label": "Surface",
        "formula": "hauteur * largeur / 10000",
        "unit": "m²"
      }
    ],
    "outputs": ["hauteur", "largeur", "surface"]
  }'::jsonb
);

-- Additional seed blocks
INSERT INTO public.flow_blocks (id, name, category, icon, schema) VALUES 
(
  'text_input',
  'Champ texte',
  'saisie',
  'Type',
  '{
    "fields": [
      {
        "key": "value",
        "label": "Texte",
        "type": "text",
        "required": false,
        "maxLength": 500
      }
    ],
    "outputs": ["value"]
  }'::jsonb
),
(
  'yes_no_question',
  'Question Oui/Non',
  'choix',
  'HelpCircle',
  '{
    "fields": [
      {
        "key": "answer",
        "label": "Réponse",
        "type": "boolean",
        "required": true
      }
    ],
    "branches": ["oui", "non"],
    "outputs": ["answer"]
  }'::jsonb
),
(
  'photo_capture',
  'Prise de photo',
  'media',
  'Camera',
  '{
    "fields": [
      {
        "key": "photo",
        "label": "Photo",
        "type": "image",
        "required": false,
        "maxSize": 5242880
      },
      {
        "key": "comment",
        "label": "Commentaire",
        "type": "text",
        "required": false
      }
    ],
    "outputs": ["photo", "comment"]
  }'::jsonb
),
(
  'signature_block',
  'Signature',
  'validation',
  'PenTool',
  '{
    "fields": [
      {
        "key": "signature",
        "label": "Signature",
        "type": "signature",
        "required": true
      },
      {
        "key": "signer_name",
        "label": "Nom du signataire",
        "type": "text",
        "required": true
      }
    ],
    "outputs": ["signature", "signer_name"]
  }'::jsonb
);