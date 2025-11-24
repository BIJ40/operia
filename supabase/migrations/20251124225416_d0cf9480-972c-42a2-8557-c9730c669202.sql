-- Ajouter une colonne rating pour l'évaluation des tickets
ALTER TABLE support_tickets ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Ajouter une colonne pour le commentaire d'évaluation (optionnel)
ALTER TABLE support_tickets ADD COLUMN rating_comment TEXT;