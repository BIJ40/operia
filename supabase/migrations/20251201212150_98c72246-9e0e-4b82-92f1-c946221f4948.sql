-- ============================================
-- P3.5 COMPLETION - Suppression support_tickets.priority (texte)
-- ============================================

-- Vérifier si la colonne priority existe encore
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'support_tickets' 
    AND column_name = 'priority'
  ) THEN
    -- Supprimer la colonne priority (remplacée par heat_priority)
    ALTER TABLE public.support_tickets DROP COLUMN IF EXISTS priority;
    
    RAISE NOTICE 'Colonne support_tickets.priority supprimée - heat_priority est désormais l''unique source';
  ELSE
    RAISE NOTICE 'Colonne support_tickets.priority déjà supprimée';
  END IF;
END $$;