-- 1. Nettoyer les policies INSERT sur conversations
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- 2. Créer une policy INSERT propre
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- 3. Mettre à jour la policy SELECT pour inclure les créateurs
DROP POLICY IF EXISTS "Users can view conversations they are members of" ON public.conversations;

CREATE POLICY "Users can view conversations they are members of"
ON public.conversations FOR SELECT
USING (
  created_by = auth.uid()
  OR public.is_conversation_member(id, auth.uid())
);