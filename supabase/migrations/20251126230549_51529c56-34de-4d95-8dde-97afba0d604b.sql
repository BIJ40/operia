-- Ajouter les champs pour gérer différents types de widgets sur la landing page
ALTER TABLE home_cards
ADD COLUMN IF NOT EXISTS is_logo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS size text DEFAULT 'normal' CHECK (size IN ('normal', 'large'));

-- Créer les entrées pour Support, Actions à mener, et Logo si elles n'existent pas déjà
INSERT INTO home_cards (title, description, link, icon, color_preset, display_order, size, is_logo)
SELECT 'Support / Tickets', 'Créer un ticket ou consulter vos demandes', '/support-tickets', 'Headphones', 'blue', 1000, 'normal', false
WHERE NOT EXISTS (
  SELECT 1 FROM home_cards WHERE link = '/support-tickets'
);

INSERT INTO home_cards (title, description, link, icon, color_preset, display_order, size, is_logo)
SELECT 'Actions à mener', 'Suivez vos actions en cours et à venir', '#', 'CheckSquare', 'blue', 1001, 'large', false
WHERE NOT EXISTS (
  SELECT 1 FROM home_cards WHERE title = 'Actions à mener'
);

INSERT INTO home_cards (title, description, link, icon, color_preset, display_order, size, is_logo)
SELECT 'Logo Help Confort Services', '', '', 'help-confort-services.png', 'blue', 1002, 'normal', true
WHERE NOT EXISTS (
  SELECT 1 FROM home_cards WHERE is_logo = true
);

-- Mettre à jour la carte Mes indicateurs pour qu'elle ait la bonne taille
UPDATE home_cards 
SET size = 'large'
WHERE link LIKE '%/mes-indicateurs%' AND size = 'normal';