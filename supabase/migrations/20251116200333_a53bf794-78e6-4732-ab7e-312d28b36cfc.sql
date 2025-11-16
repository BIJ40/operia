-- Ajouter les colonnes pour le résumé dans blocks
ALTER TABLE blocks 
ADD COLUMN summary TEXT DEFAULT '',
ADD COLUMN show_summary BOOLEAN DEFAULT true;

-- Ajouter les colonnes pour le résumé dans apporteur_blocks
ALTER TABLE apporteur_blocks 
ADD COLUMN summary TEXT DEFAULT '',
ADD COLUMN show_summary BOOLEAN DEFAULT true;