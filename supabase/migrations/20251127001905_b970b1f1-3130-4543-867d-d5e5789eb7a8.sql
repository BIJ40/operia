-- Add delai_relance_technicien column to user_actions_config table
ALTER TABLE user_actions_config 
ADD COLUMN IF NOT EXISTS delai_relance_technicien integer NOT NULL DEFAULT 3;