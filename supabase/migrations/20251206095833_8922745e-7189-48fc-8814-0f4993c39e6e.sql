-- Ajouter la colonne pour override des techniciens SAV
ALTER TABLE public.sav_dossier_overrides 
ADD COLUMN IF NOT EXISTS techniciens_override integer[] DEFAULT NULL;

COMMENT ON COLUMN public.sav_dossier_overrides.techniciens_override IS 'Liste des IDs techniciens Apogée attribués manuellement au SAV (priorité sur calcul auto)';