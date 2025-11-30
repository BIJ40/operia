-- 1) Ajouter la colonne type avec contrainte CHECK
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('chat_ai', 'chat_human', 'ticket'))
DEFAULT 'ticket';

-- 2) Migration des données existantes
UPDATE support_tickets
SET type = CASE
  WHEN is_live_chat = true THEN 'chat_ai'
  ELSE 'ticket'
END
WHERE type IS NULL OR type = 'ticket';

-- 3) Supprimer les anciennes colonnes
ALTER TABLE support_tickets
DROP COLUMN IF EXISTS is_live_chat,
DROP COLUMN IF EXISTS escalated_from_chat;