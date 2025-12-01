-- =====================================================
-- AUDIT FIX: Corrections RLS critiques et avertissements
-- =====================================================

-- 1. PROFILES: Ajouter policy DELETE restrictive (superadmin only)
CREATE POLICY "Only superadmin can delete profiles"
ON public.profiles
FOR DELETE
USING (has_min_global_role(auth.uid(), 6));

-- 2. AGENCY_COLLABORATORS: Ajouter foreign key constraints manquants
-- (Les FK existent déjà selon le schema, mais vérifions les policies)
-- Ajouter index pour performance
CREATE INDEX IF NOT EXISTS idx_agency_collaborators_agency_id ON public.agency_collaborators(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_collaborators_user_id ON public.agency_collaborators(user_id);

-- 3. EXPENSE_REQUESTS: Ajouter policy DELETE
CREATE POLICY "Users can delete their own pending expense requests"
ON public.expense_requests
FOR DELETE
USING (
  requester_id = auth.uid() 
  AND status = 'soumis'
  OR has_min_global_role(auth.uid(), 5)
);

-- 4. KNOWLEDGE_BASE: Ajouter policies manquantes
CREATE POLICY "Authenticated users can read knowledge_base"
ON public.knowledge_base
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert knowledge_base"
ON public.knowledge_base
FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can update knowledge_base"
ON public.knowledge_base
FOR UPDATE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can delete knowledge_base"
ON public.knowledge_base
FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

-- 5. SUPPORT_TICKETS: Ajouter policy DELETE manquante
CREATE POLICY "Users can delete their own unresolved tickets"
ON public.support_tickets
FOR DELETE
USING (
  user_id = auth.uid() 
  AND status NOT IN ('resolved', 'closed')
  OR has_min_global_role(auth.uid(), 5)
);

-- 6. APOGEE_TICKETS: Vérifier que toutes les policies sont en place (déjà OK)

-- 7. CHATBOT_QUERIES: Ajouter policy DELETE pour admins
CREATE POLICY "Admins can delete chatbot queries"
ON public.chatbot_queries
FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

-- 8. USER_CONNECTION_LOGS: Créer table si elle n'existe pas avec RLS
-- (Cette table semble manquer - créons-la proprement)
CREATE TABLE IF NOT EXISTS public.user_connection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connected_at timestamp with time zone DEFAULT now(),
  ip_address text,
  user_agent text
);

ALTER TABLE public.user_connection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connection logs"
ON public.user_connection_logs
FOR SELECT
USING (user_id = auth.uid() OR has_min_global_role(auth.uid(), 5));

CREATE POLICY "System can insert connection logs"
ON public.user_connection_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 9. ANIMATOR_VISITS: Policies existent déjà, ajoutons juste des index
CREATE INDEX IF NOT EXISTS idx_animator_visits_animator_id ON public.animator_visits(animator_id);
CREATE INDEX IF NOT EXISTS idx_animator_visits_agency_id ON public.animator_visits(agency_id);

-- 10. AGENCY_ROYALTY_CALCULATIONS: Policies existent déjà, OK

-- 11. Ajouter index de performance globaux manquants
CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON public.profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_profiles_agence ON public.profiles(agence);
CREATE INDEX IF NOT EXISTS idx_profiles_global_role ON public.profiles(global_role);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);