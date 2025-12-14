-- P2: Templates de lettres RH + enrichissement rh_requests

-- 1) Table templates de lettres
CREATE TABLE IF NOT EXISTS public.rh_letter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body_markdown text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index partiel pour unicité template actif par agence
CREATE UNIQUE INDEX IF NOT EXISTS idx_rh_letter_templates_active_unique 
ON public.rh_letter_templates (agency_id, template_key) 
WHERE is_active = true;

-- Trigger updated_at
CREATE TRIGGER update_rh_letter_templates_updated_at
  BEFORE UPDATE ON public.rh_letter_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.rh_letter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "N2+ can view templates for their agency or global"
  ON public.rh_letter_templates FOR SELECT
  USING (
    has_min_global_role(auth.uid(), 2) 
    AND (agency_id = get_user_agency_id(auth.uid()) OR agency_id IS NULL)
  );

CREATE POLICY "N2+ can manage templates for their agency"
  ON public.rh_letter_templates FOR ALL
  USING (
    has_min_global_role(auth.uid(), 2) 
    AND agency_id = get_user_agency_id(auth.uid())
  )
  WITH CHECK (
    has_min_global_role(auth.uid(), 2) 
    AND agency_id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "N5+ can manage all templates"
  ON public.rh_letter_templates FOR ALL
  USING (has_min_global_role(auth.uid(), 5))
  WITH CHECK (has_min_global_role(auth.uid(), 5));

-- Seed template global EPI_RENEWAL
INSERT INTO public.rh_letter_templates (agency_id, template_key, name, subject, body_markdown)
VALUES (
  NULL,
  'EPI_RENEWAL',
  'Demande de renouvellement EPI',
  'Demande de renouvellement d''équipements de protection individuelle',
  E'# Demande de Renouvellement EPI\n\n**Date :** {{date}}\n\n**Collaborateur :** {{employee_full_name}}\n\n**Agence :** {{agency_name}}\n\n---\n\n## Équipements demandés\n\n{{items}}\n\n## Motif de la demande\n\n{{description}}\n\n---\n\n**Signature du collaborateur :**\n\n{{signature}}\n\n---\n\n*Document généré automatiquement par HelpConfort Services*'
) ON CONFLICT DO NOTHING;

-- 2) Enrichir rh_requests (colonnes P2)
ALTER TABLE public.rh_requests 
  ADD COLUMN IF NOT EXISTS generated_letter_path text,
  ADD COLUMN IF NOT EXISTS generated_letter_file_name text,
  ADD COLUMN IF NOT EXISTS employee_can_download boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_comment text;

-- 3) Ajouter colonne signature PNG dans user_signatures (Option 1)
ALTER TABLE public.user_signatures 
  ADD COLUMN IF NOT EXISTS signature_png_base64 text;