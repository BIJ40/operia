-- Add columns to control title visibility on card and menu
ALTER TABLE apporteur_blocks 
ADD COLUMN show_title_on_card boolean DEFAULT true,
ADD COLUMN show_title_in_menu boolean DEFAULT true;