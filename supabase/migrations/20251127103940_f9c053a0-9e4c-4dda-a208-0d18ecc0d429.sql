-- Index sur support_tickets (colonnes fréquemment filtrées)
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets USING btree (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets USING btree (assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_service ON public.support_tickets USING btree (service);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets USING btree (created_at DESC);

-- Index sur support_messages (jointures fréquentes)
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages USING btree (ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id ON public.support_messages USING btree (sender_id);

-- Index sur profiles (filtrage agence et role)
CREATE INDEX IF NOT EXISTS idx_profiles_agence ON public.profiles USING btree (agence);
CREATE INDEX IF NOT EXISTS idx_profiles_role_agence ON public.profiles USING btree (role_agence);

-- Index sur user_roles (vérification fréquente des rôles)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles USING btree (role);

-- Index sur documents (filtrage par scope et block_id)
CREATE INDEX IF NOT EXISTS idx_documents_scope ON public.documents USING btree (scope);
CREATE INDEX IF NOT EXISTS idx_documents_block_id ON public.documents USING btree (block_id);

-- Index sur user_permissions et role_permissions
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_agence ON public.role_permissions USING btree (role_agence);