-- Ajouter un champ pour distinguer EPI stockables vs personnels
ALTER TABLE public.epi_catalog_items 
ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT false;

-- Les EPI personnels sont attribués directement sans passer par le stock
COMMENT ON COLUMN public.epi_catalog_items.is_personal IS 
'true = EPI personnel (chaussures, lunettes correctives) attribué directement. false = EPI stockable (casque, harnais, gants) passe par le stock.';