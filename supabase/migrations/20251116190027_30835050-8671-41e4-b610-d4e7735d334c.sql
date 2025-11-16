-- Ajouter les colonnes content_type et tips_type aux tables blocks et apporteur_blocks

-- Pour la table blocks
ALTER TABLE public.blocks 
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'section',
ADD COLUMN IF NOT EXISTS tips_type TEXT;

-- Pour la table apporteur_blocks
ALTER TABLE public.apporteur_blocks 
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'section',
ADD COLUMN IF NOT EXISTS tips_type TEXT;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN public.blocks.content_type IS 'Type de contenu: section (normale) ou tips (encart informatif)';
COMMENT ON COLUMN public.blocks.tips_type IS 'Pour les tips uniquement: danger, warning, success, info';
COMMENT ON COLUMN public.apporteur_blocks.content_type IS 'Type de contenu: section (normale) ou tips (encart informatif)';
COMMENT ON COLUMN public.apporteur_blocks.tips_type IS 'Pour les tips uniquement: danger, warning, success, info';