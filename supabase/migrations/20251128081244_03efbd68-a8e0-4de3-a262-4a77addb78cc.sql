-- Étape 2: Relâcher block_id NOT NULL (transition vers scope_id)
ALTER TABLE user_permissions 
ALTER COLUMN block_id DROP NOT NULL;