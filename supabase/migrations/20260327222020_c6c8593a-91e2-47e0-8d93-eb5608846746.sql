
-- Table agency_features : couche commerciale indépendante des modules
CREATE TABLE public.agency_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  status text NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('active', 'inactive', 'trial', 'suspended')),
  billing_mode text NOT NULL DEFAULT 'manual'
    CHECK (billing_mode IN ('manual', 'included', 'trial', 'complimentary')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  activated_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, feature_key)
);

-- Index pour les lookups fréquents
CREATE INDEX idx_agency_features_agency_id ON public.agency_features(agency_id);
CREATE INDEX idx_agency_features_feature_key ON public.agency_features(feature_key);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.handle_agency_features_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_agency_features_updated_at
  BEFORE UPDATE ON public.agency_features
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_agency_features_updated_at();

-- RLS
ALTER TABLE public.agency_features ENABLE ROW LEVEL SECURITY;

-- SELECT : utilisateur de la même agence OU N4+
CREATE POLICY "agency_features_select"
  ON public.agency_features
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT p.agency_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- INSERT/UPDATE/DELETE : N4+ uniquement
CREATE POLICY "agency_features_admin_write"
  ON public.agency_features
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Commentaire sur la table
COMMENT ON TABLE public.agency_features IS 'Couche commerciale SaaS — features additionnelles par agence, indépendante du système de modules';
COMMENT ON COLUMN public.agency_features.metadata IS 'Schema attendu: { "included_spaces": number, "extra_spaces": number, "max_spaces": number, "quota": number, "usage": number, "contact_sales_required": boolean }';
