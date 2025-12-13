-- Ajouter la colonne dev_status à feature_flags
ALTER TABLE feature_flags 
ADD COLUMN dev_status TEXT NOT NULL DEFAULT 'todo' 
CHECK (dev_status IN ('done', 'in_progress', 'todo', 'disabled'));

-- Initialiser les modules actuellement activés comme "done" (opérationnels)
UPDATE feature_flags SET dev_status = 'done' WHERE is_enabled = true;