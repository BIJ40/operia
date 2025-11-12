-- Ajouter une policy pour permettre l'insertion de documents dans la knowledge base
-- Seuls les utilisateurs authentifiés peuvent ajouter des documents
CREATE POLICY "Les utilisateurs authentifiés peuvent ajouter des documents"
ON public.knowledge_base
FOR INSERT
TO authenticated
WITH CHECK (true);