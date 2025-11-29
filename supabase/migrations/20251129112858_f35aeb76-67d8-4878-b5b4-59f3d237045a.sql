-- ============================================================================
-- MIGRATION V2: Remplacer has_role() par des fonctions basées sur global_role
-- ============================================================================

-- 1. Créer fonction helper pour l'accès support (V2)
CREATE OR REPLACE FUNCTION public.has_support_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
    AND (
      -- V2: Check enabled_modules.support
      (enabled_modules->'support'->>'enabled')::boolean = true
      OR
      -- platform_admin+ always has support access
      global_role IN ('platform_admin', 'superadmin')
    )
  )
$$;

-- 2. Créer fonction helper pour l'accès franchiseur (V2)
CREATE OR REPLACE FUNCTION public.has_franchiseur_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
    AND (
      -- V2: Check enabled_modules.reseau_franchiseur
      (enabled_modules->'reseau_franchiseur'->>'enabled')::boolean = true
      OR
      -- OR global_role is franchisor level+
      global_role IN ('franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin')
    )
  )
$$;

-- 3. Créer fonction helper pour l'accès admin (V2) - wrapper simple
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_min_global_role(_user_id, 5)
$$;

-- ============================================================================
-- STORAGE_QUOTA_ALERTS - Remplacer requête directe user_roles
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all storage quota alerts" ON public.storage_quota_alerts;
CREATE POLICY "Admins can view all storage quota alerts"
ON public.storage_quota_alerts
FOR SELECT
USING (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- SUPPORT_TICKETS - Remplacer requêtes directes user_roles
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Support staff can manage all tickets" ON public.support_tickets;

CREATE POLICY "Admins can manage all tickets"
ON public.support_tickets
FOR ALL
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Support staff can manage all tickets"
ON public.support_tickets
FOR ALL
USING (has_support_access(auth.uid()))
WITH CHECK (has_support_access(auth.uid()));

-- ============================================================================
-- APPORTEUR_BLOCKS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Only admins can delete apporteur blocks" ON public.apporteur_blocks;
DROP POLICY IF EXISTS "Only admins can insert apporteur blocks" ON public.apporteur_blocks;
DROP POLICY IF EXISTS "Only admins can update apporteur blocks" ON public.apporteur_blocks;

CREATE POLICY "Only admins can delete apporteur blocks"
ON public.apporteur_blocks FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can insert apporteur blocks"
ON public.apporteur_blocks FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can update apporteur blocks"
ON public.apporteur_blocks FOR UPDATE
USING (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- BLOCKS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Only admins can delete blocks" ON public.blocks;
DROP POLICY IF EXISTS "Only admins can insert blocks" ON public.blocks;
DROP POLICY IF EXISTS "Only admins can update blocks" ON public.blocks;

CREATE POLICY "Only admins can delete blocks"
ON public.blocks FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can insert blocks"
ON public.blocks FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can update blocks"
ON public.blocks FOR UPDATE
USING (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- CATEGORIES - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Seuls les admins peuvent insérer des catégories" ON public.categories;
DROP POLICY IF EXISTS "Seuls les admins peuvent modifier des catégories" ON public.categories;
DROP POLICY IF EXISTS "Seuls les admins peuvent supprimer des catégories" ON public.categories;

CREATE POLICY "Seuls les admins peuvent insérer des catégories"
ON public.categories FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Seuls les admins peuvent modifier des catégories"
ON public.categories FOR UPDATE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Seuls les admins peuvent supprimer des catégories"
ON public.categories FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- CHATBOT_QUERIES - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Admins can update all queries" ON public.chatbot_queries;
DROP POLICY IF EXISTS "Admins can view all queries" ON public.chatbot_queries;

CREATE POLICY "Admins can update all queries"
ON public.chatbot_queries FOR UPDATE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admins can view all queries"
ON public.chatbot_queries FOR SELECT
USING (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- DIFFUSION_SETTINGS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Only admins can insert diffusion settings" ON public.diffusion_settings;
DROP POLICY IF EXISTS "Only admins can update diffusion settings" ON public.diffusion_settings;

CREATE POLICY "Only admins can insert diffusion settings"
ON public.diffusion_settings FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can update diffusion settings"
ON public.diffusion_settings FOR UPDATE
USING (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- DOCUMENTS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Only admins can delete documents" ON public.documents;
DROP POLICY IF EXISTS "Only admins can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Only admins can update documents" ON public.documents;

CREATE POLICY "Only admins can delete documents"
ON public.documents FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can insert documents"
ON public.documents FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can update documents"
ON public.documents FOR UPDATE
USING (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- GUIDE_CHUNKS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Only admins can delete guide chunks" ON public.guide_chunks;
DROP POLICY IF EXISTS "Only admins can insert guide chunks" ON public.guide_chunks;
DROP POLICY IF EXISTS "Only admins can update guide chunks" ON public.guide_chunks;

CREATE POLICY "Only admins can delete guide chunks"
ON public.guide_chunks FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can insert guide chunks"
ON public.guide_chunks FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can update guide chunks"
ON public.guide_chunks FOR UPDATE
USING (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- HOME_CARDS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Seuls les admins peuvent insérer des cartes d'accueil" ON public.home_cards;
DROP POLICY IF EXISTS "Seuls les admins peuvent modifier des cartes d'accueil" ON public.home_cards;
DROP POLICY IF EXISTS "Seuls les admins peuvent supprimer des cartes d'accueil" ON public.home_cards;

CREATE POLICY "Seuls les admins peuvent insérer des cartes d'accueil"
ON public.home_cards FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Seuls les admins peuvent modifier des cartes d'accueil"
ON public.home_cards FOR UPDATE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Seuls les admins peuvent supprimer des cartes d'accueil"
ON public.home_cards FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- KNOWLEDGE_BASE - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Only admins can delete documents" ON public.knowledge_base;
DROP POLICY IF EXISTS "Only admins can insert documents" ON public.knowledge_base;
DROP POLICY IF EXISTS "Only admins can update documents" ON public.knowledge_base;

CREATE POLICY "Only admins can delete knowledge base"
ON public.knowledge_base FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can insert knowledge base"
ON public.knowledge_base FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can update knowledge base"
ON public.knowledge_base FOR UPDATE
USING (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- PLANNING_SIGNATURES - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Users can update their own signatures" ON public.planning_signatures;
DROP POLICY IF EXISTS "Users can view their own signatures" ON public.planning_signatures;

CREATE POLICY "Users can update their own signatures"
ON public.planning_signatures FOR UPDATE
USING ((auth.uid() = signed_by_user_id) OR has_min_global_role(auth.uid(), 5));

CREATE POLICY "Users can view their own signatures"
ON public.planning_signatures FOR SELECT
USING ((auth.uid() = signed_by_user_id) OR has_min_global_role(auth.uid(), 5) OR has_support_access(auth.uid()));

-- ============================================================================
-- PROFILES - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- ROLE_PERMISSIONS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Only admins can delete role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Only admins can insert role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Only admins can update role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Users can view their role permissions" ON public.role_permissions;

CREATE POLICY "Only admins can delete role permissions"
ON public.role_permissions FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can insert role permissions"
ON public.role_permissions FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can update role permissions"
ON public.role_permissions FOR UPDATE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Users can view their role permissions"
ON public.role_permissions FOR SELECT
USING (has_min_global_role(auth.uid(), 5) OR (role_agence = (SELECT role_agence FROM profiles WHERE profiles.id = auth.uid())));

-- ============================================================================
-- ROLES - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;

CREATE POLICY "Admins can manage roles"
ON public.roles FOR ALL
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- SCOPES - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage scopes" ON public.scopes;

CREATE POLICY "Admins can manage scopes"
ON public.scopes FOR ALL
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- SECTIONS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Seuls les admins peuvent insérer des sections" ON public.sections;
DROP POLICY IF EXISTS "Seuls les admins peuvent modifier des sections" ON public.sections;
DROP POLICY IF EXISTS "Seuls les admins peuvent supprimer des sections" ON public.sections;

CREATE POLICY "Seuls les admins peuvent insérer des sections"
ON public.sections FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Seuls les admins peuvent modifier des sections"
ON public.sections FOR UPDATE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Seuls les admins peuvent supprimer des sections"
ON public.sections FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- SUPPORT_ATTACHMENTS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Support staff can view all attachments" ON public.support_attachments;

CREATE POLICY "Support staff can view all attachments"
ON public.support_attachments FOR SELECT
USING (has_min_global_role(auth.uid(), 5) OR has_support_access(auth.uid()) OR has_franchiseur_access(auth.uid()));

-- ============================================================================
-- SUPPORT_MESSAGES - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Support can send messages" ON public.support_messages;
DROP POLICY IF EXISTS "Support can update message read status" ON public.support_messages;
DROP POLICY IF EXISTS "Support can view all messages" ON public.support_messages;

CREATE POLICY "Support can send messages"
ON public.support_messages FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 5) OR has_support_access(auth.uid()));

CREATE POLICY "Support can update message read status"
ON public.support_messages FOR UPDATE
USING (has_min_global_role(auth.uid(), 5) OR has_support_access(auth.uid()));

CREATE POLICY "Support can view all messages"
ON public.support_messages FOR SELECT
USING (has_min_global_role(auth.uid(), 5) OR has_support_access(auth.uid()));

-- ============================================================================
-- APOGEE_AGENCIES - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Only admins can delete agencies" ON public.apogee_agencies;
DROP POLICY IF EXISTS "Only admins can insert agencies" ON public.apogee_agencies;
DROP POLICY IF EXISTS "Only admins can update agencies" ON public.apogee_agencies;
DROP POLICY IF EXISTS "Role-based agency access" ON public.apogee_agencies;

CREATE POLICY "Only admins can delete agencies"
ON public.apogee_agencies FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can insert agencies"
ON public.apogee_agencies FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can update agencies"
ON public.apogee_agencies FOR UPDATE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Role-based agency access"
ON public.apogee_agencies FOR SELECT
USING (
  has_min_global_role(auth.uid(), 5) 
  OR has_support_access(auth.uid()) 
  OR has_franchiseur_access(auth.uid())
  OR (slug = get_user_agency(auth.uid()))
);

-- ============================================================================
-- GROUP_PERMISSIONS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Only admins can manage group_permissions" ON public.group_permissions;

CREATE POLICY "Only admins can manage group_permissions"
ON public.group_permissions FOR ALL
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- GROUPS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Only admins can manage groups" ON public.groups;

CREATE POLICY "Only admins can manage groups"
ON public.groups FOR ALL
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- FRANCHISEUR_ROLES - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage franchiseur roles" ON public.franchiseur_roles;
DROP POLICY IF EXISTS "Admins can view all franchiseur roles" ON public.franchiseur_roles;

CREATE POLICY "Admins can manage franchiseur roles"
ON public.franchiseur_roles FOR ALL
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admins can view all franchiseur roles"
ON public.franchiseur_roles FOR SELECT
USING (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- USER_ACTIONS_CONFIG - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all actions configs" ON public.user_actions_config;

CREATE POLICY "Admins can view all actions configs"
ON public.user_actions_config FOR SELECT
USING (has_min_global_role(auth.uid(), 5));