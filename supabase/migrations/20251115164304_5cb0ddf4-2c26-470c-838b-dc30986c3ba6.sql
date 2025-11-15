-- Ajouter la colonne is_single_section manquante
ALTER TABLE apporteur_blocks 
ADD COLUMN IF NOT EXISTS is_single_section boolean DEFAULT false;