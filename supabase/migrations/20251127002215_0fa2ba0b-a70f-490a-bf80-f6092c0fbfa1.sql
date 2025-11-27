-- Remove obsolete columns from user_actions_config table
ALTER TABLE user_actions_config 
DROP COLUMN IF EXISTS delai_devis_envoye,
DROP COLUMN IF EXISTS delai_a_commander,
DROP COLUMN IF EXISTS delai_facture_non_reglee;