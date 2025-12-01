-- F-TABLE-3: Ajouter les index manquants pour améliorer les performances

-- Index sur chatbot_queries pour filtrage fréquent par utilisateur et statut
CREATE INDEX IF NOT EXISTS idx_chatbot_queries_user_status 
ON public.chatbot_queries(user_id, status);

-- Index sur chatbot_queries pour tri par date
CREATE INDEX IF NOT EXISTS idx_chatbot_queries_created_at 
ON public.chatbot_queries(created_at DESC);

-- Index sur support_tickets pour filtrage par utilisateur et statut
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status 
ON public.support_tickets(user_id, status);

-- Index sur support_tickets pour tri par date de création
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at 
ON public.support_tickets(created_at DESC);

-- Index sur apogee_tickets pour filtrage par kanban_status
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_kanban_status 
ON public.apogee_tickets(kanban_status);

-- Index sur apogee_tickets pour tri par numéro de ticket
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_ticket_number 
ON public.apogee_tickets(ticket_number DESC);

-- Index sur profiles pour filtrage par agence
CREATE INDEX IF NOT EXISTS idx_profiles_agence 
ON public.profiles(agence) WHERE agence IS NOT NULL;

-- Index sur profiles pour filtrage par agency_id
CREATE INDEX IF NOT EXISTS idx_profiles_agency_id 
ON public.profiles(agency_id) WHERE agency_id IS NOT NULL;

-- Index sur profiles pour filtrage par global_role
CREATE INDEX IF NOT EXISTS idx_profiles_global_role 
ON public.profiles(global_role) WHERE global_role IS NOT NULL;

-- Index sur franchiseur_agency_assignments pour jointures fréquentes
CREATE INDEX IF NOT EXISTS idx_franchiseur_assignments_user 
ON public.franchiseur_agency_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_franchiseur_assignments_agency 
ON public.franchiseur_agency_assignments(agency_id);

-- Index sur apogee_ticket_views pour jointures fréquentes
CREATE INDEX IF NOT EXISTS idx_apogee_ticket_views_ticket 
ON public.apogee_ticket_views(ticket_id, user_id);

-- Index composite sur support_messages pour filtrage par ticket et tri
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_created 
ON public.support_messages(ticket_id, created_at DESC);