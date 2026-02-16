
-- Enable pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Table pool de prospects importés (données brutes Excel)
CREATE TABLE public.prospect_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id),
  import_batch_id UUID NOT NULL,
  siren TEXT,
  siret TEXT,
  denomination TEXT,
  enseigne TEXT,
  date_creation_etablissement TEXT,
  tranche_effectif TEXT,
  categorie_juridique TEXT,
  adresse TEXT,
  code_postal TEXT,
  code_ape TEXT,
  activite_principale TEXT,
  denomination_unite_legale TEXT,
  nb_etablissements INTEGER,
  chiffre_affaire TEXT,
  date_cloture_exercice TEXT,
  telephone TEXT,
  site_web TEXT,
  representant TEXT,
  coordonnees TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_prospect_pool_agency ON public.prospect_pool(agency_id);
CREATE INDEX idx_prospect_pool_batch ON public.prospect_pool(import_batch_id);
CREATE INDEX idx_prospect_pool_code_postal ON public.prospect_pool(code_postal);
CREATE INDEX idx_prospect_pool_denomination ON public.prospect_pool USING gin(denomination gin_trgm_ops);

-- Fiches prospect sélectionnées (CRM)
CREATE TABLE public.prospect_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id),
  pool_prospect_id UUID REFERENCES public.prospect_pool(id),
  siren TEXT,
  siret TEXT,
  denomination TEXT NOT NULL,
  enseigne TEXT,
  adresse TEXT,
  code_postal TEXT,
  telephone TEXT,
  site_web TEXT,
  representant TEXT,
  chiffre_affaire TEXT,
  tranche_effectif TEXT,
  status TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'contacte', 'rdv_planifie', 'en_negociation', 'gagne', 'perdu', 'abandonne')),
  owner_user_id UUID REFERENCES auth.users(id),
  next_rdv_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  notes TEXT,
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 5),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_cards_agency ON public.prospect_cards(agency_id);
CREATE INDEX idx_prospect_cards_status ON public.prospect_cards(status);
CREATE INDEX idx_prospect_cards_owner ON public.prospect_cards(owner_user_id);

-- Historique interactions prospect
CREATE TABLE public.prospect_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.prospect_cards(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id),
  user_id UUID REFERENCES auth.users(id),
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('appel', 'email', 'rdv', 'visite', 'note', 'relance')),
  summary TEXT,
  interaction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_action TEXT,
  next_action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_interactions_card ON public.prospect_interactions(card_id);

CREATE TRIGGER update_prospect_cards_updated_at
  BEFORE UPDATE ON public.prospect_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.prospect_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency prospects" ON public.prospect_pool FOR SELECT USING (agency_id = get_user_agency_id(auth.uid()));
CREATE POLICY "Users can insert prospects for their agency" ON public.prospect_pool FOR INSERT WITH CHECK (agency_id = get_user_agency_id(auth.uid()));
CREATE POLICY "Users can delete prospects from their agency" ON public.prospect_pool FOR DELETE USING (agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "Users can view their agency prospect cards" ON public.prospect_cards FOR SELECT USING (agency_id = get_user_agency_id(auth.uid()));
CREATE POLICY "Users can insert prospect cards for their agency" ON public.prospect_cards FOR INSERT WITH CHECK (agency_id = get_user_agency_id(auth.uid()));
CREATE POLICY "Users can update their agency prospect cards" ON public.prospect_cards FOR UPDATE USING (agency_id = get_user_agency_id(auth.uid()));
CREATE POLICY "Users can delete their agency prospect cards" ON public.prospect_cards FOR DELETE USING (agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "Users can view their agency interactions" ON public.prospect_interactions FOR SELECT USING (agency_id = get_user_agency_id(auth.uid()));
CREATE POLICY "Users can insert interactions for their agency" ON public.prospect_interactions FOR INSERT WITH CHECK (agency_id = get_user_agency_id(auth.uid()));
CREATE POLICY "Users can update their agency interactions" ON public.prospect_interactions FOR UPDATE USING (agency_id = get_user_agency_id(auth.uid()));
