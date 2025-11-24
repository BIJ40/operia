-- Mettre à jour les RLS policies pour exiger l'authentification

-- Blocks (Guide Apogée)
DROP POLICY IF EXISTS "Anyone can view blocks" ON public.blocks;
CREATE POLICY "Authenticated users can view blocks" 
ON public.blocks 
FOR SELECT 
TO authenticated
USING (true);

-- Apporteur blocks (Guide Apporteurs)
DROP POLICY IF EXISTS "Anyone can view apporteur blocks" ON public.apporteur_blocks;
CREATE POLICY "Authenticated users can view apporteur blocks" 
ON public.apporteur_blocks 
FOR SELECT 
TO authenticated
USING (true);

-- Home cards (pages d'accueil) - garder accessible à tous
-- Pas de changement pour home_cards