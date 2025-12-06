-- Table de configuration commerciale par agence
CREATE TABLE IF NOT EXISTS agency_commercial_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,

  -- Identité / en-têtes
  agence_nom_long text,
  baseline text,
  date_creation text,
  rang_agence text,

  -- Equipe
  nb_techniciens integer,
  nb_assistantes integer,
  description_equipe text,

  -- Zones d'intervention
  zones_intervention text,

  -- Contacts
  email_contact text,
  phone_contact text,

  -- Textes de sections
  texte_qui_sommes_nous text,
  texte_nos_valeurs text,
  texte_nos_engagements text,
  texte_nos_competences text,
  texte_comment_ca_se_passe text,

  -- URLs vers les logos & photos (stockage Supabase)
  logo_agence_url text,
  photo_equipe_url text,
  photo_lien_suivi_url text,
  photo_realisation1_avant_url text,
  photo_realisation1_apres_url text,
  photo_realisation2_avant_url text,
  photo_realisation2_apres_url text,
  photo_realisation3_avant_url text,
  photo_realisation3_apres_url text,
  photo_temoignage1_url text,
  photo_temoignage2_url text,

  -- Meta
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agency_commercial_profile_agency_id_idx
ON agency_commercial_profile (agency_id);

-- Enable RLS
ALTER TABLE agency_commercial_profile ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "N5+ can manage all profiles"
ON agency_commercial_profile FOR ALL
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Agency admin can manage own profile"
ON agency_commercial_profile FOR ALL
USING (
  agency_id = get_user_agency_id(auth.uid()) 
  AND has_min_global_role(auth.uid(), 2)
)
WITH CHECK (
  agency_id = get_user_agency_id(auth.uid()) 
  AND has_min_global_role(auth.uid(), 2)
);

CREATE POLICY "Franchiseur can view all profiles"
ON agency_commercial_profile FOR SELECT
USING (has_franchiseur_access(auth.uid()));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('pptx-templates', 'pptx-templates', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('pptx-assets', 'pptx-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for pptx-templates
CREATE POLICY "N5+ can manage pptx templates"
ON storage.objects FOR ALL
USING (bucket_id = 'pptx-templates' AND has_min_global_role(auth.uid(), 5))
WITH CHECK (bucket_id = 'pptx-templates' AND has_min_global_role(auth.uid(), 5));

CREATE POLICY "Authenticated can read pptx templates"
ON storage.objects FOR SELECT
USING (bucket_id = 'pptx-templates' AND auth.uid() IS NOT NULL);

-- Storage policies for pptx-assets
CREATE POLICY "N2+ can manage pptx assets"
ON storage.objects FOR ALL
USING (bucket_id = 'pptx-assets' AND has_min_global_role(auth.uid(), 2))
WITH CHECK (bucket_id = 'pptx-assets' AND has_min_global_role(auth.uid(), 2));

CREATE POLICY "Public can read pptx assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'pptx-assets');

-- Trigger for updated_at
CREATE TRIGGER update_agency_commercial_profile_updated_at
BEFORE UPDATE ON agency_commercial_profile
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();