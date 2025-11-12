-- Supprimer l'ancienne policy qui nécessite l'authentification
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent ajouter des documents" ON public.knowledge_base;

-- Créer une policy temporaire permettant l'insertion sans authentification
CREATE POLICY "Import temporaire sans authentification"
ON public.knowledge_base
FOR INSERT
TO anon, authenticated
WITH CHECK (true);