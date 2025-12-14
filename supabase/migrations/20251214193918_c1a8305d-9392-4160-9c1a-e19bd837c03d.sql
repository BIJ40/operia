-- Ajouter les nouvelles colonnes pour les cartes dans rh_assets
ALTER TABLE public.rh_assets 
ADD COLUMN IF NOT EXISTS fournisseur_carte_carburant TEXT,
ADD COLUMN IF NOT EXISTS carte_bancaire BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS numero_carte_bancaire TEXT,
ADD COLUMN IF NOT EXISTS fournisseur_carte_bancaire TEXT,
ADD COLUMN IF NOT EXISTS carte_autre_nom TEXT,
ADD COLUMN IF NOT EXISTS carte_autre_numero TEXT,
ADD COLUMN IF NOT EXISTS carte_autre_fournisseur TEXT;

-- Migrer carte_societe vers carte_bancaire si la colonne existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_assets' AND column_name = 'carte_societe') THEN
    UPDATE public.rh_assets SET carte_bancaire = carte_societe WHERE carte_societe IS NOT NULL;
    ALTER TABLE public.rh_assets DROP COLUMN IF EXISTS carte_societe;
  END IF;
END $$;