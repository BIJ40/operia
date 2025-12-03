-- Ajouter les colonnes d'adresse séparées
ALTER TABLE public.collaborators 
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS city text;

-- Migrer les données existantes (si l'adresse contient des lignes, essayer de parser)
-- On garde l'ancienne colonne address pour compatibilité