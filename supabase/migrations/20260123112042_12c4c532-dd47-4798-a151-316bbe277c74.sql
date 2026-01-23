-- Ajouter les colonnes roadmap aux tickets Apogée
ALTER TABLE public.apogee_tickets
ADD COLUMN IF NOT EXISTS roadmap_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS roadmap_month integer CHECK (roadmap_month IS NULL OR (roadmap_month >= 1 AND roadmap_month <= 12)),
ADD COLUMN IF NOT EXISTS roadmap_year integer CHECK (roadmap_year IS NULL OR roadmap_year >= 2020);

-- Index pour filtrer efficacement les tickets roadmap
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_roadmap ON public.apogee_tickets (roadmap_enabled, roadmap_year, roadmap_month) WHERE roadmap_enabled = true;

-- Commentaires
COMMENT ON COLUMN public.apogee_tickets.roadmap_enabled IS 'Indique si le ticket est planifié dans la roadmap';
COMMENT ON COLUMN public.apogee_tickets.roadmap_month IS 'Mois prévu pour la roadmap (1-12)';
COMMENT ON COLUMN public.apogee_tickets.roadmap_year IS 'Année prévue pour la roadmap';