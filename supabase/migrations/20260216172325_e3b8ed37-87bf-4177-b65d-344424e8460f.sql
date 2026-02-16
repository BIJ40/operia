-- Ajouter colonne ville aux deux tables
ALTER TABLE public.prospect_pool ADD COLUMN IF NOT EXISTS ville TEXT;
ALTER TABLE public.prospect_cards ADD COLUMN IF NOT EXISTS ville TEXT;

-- Extraire la ville depuis l'adresse existante (format: "159 AV ...,40370 RION-DES-LANDES")
-- La ville est la partie après le code postal dans le dernier segment après la virgule
UPDATE public.prospect_pool
SET ville = TRIM(REGEXP_REPLACE(
  SPLIT_PART(adresse, ',', -1),
  '^\s*\d{5}\s+', ''
))
WHERE adresse IS NOT NULL AND adresse LIKE '%,%' AND ville IS NULL;

-- Créer index sur ville pour filtrage rapide
CREATE INDEX IF NOT EXISTS idx_prospect_pool_ville ON public.prospect_pool(ville);
CREATE INDEX IF NOT EXISTS idx_prospect_cards_ville ON public.prospect_cards(ville);