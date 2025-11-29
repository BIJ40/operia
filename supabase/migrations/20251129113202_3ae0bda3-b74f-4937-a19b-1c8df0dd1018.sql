-- ============================================================================
-- MIGRATION V2 COMPLÈTE : Policies restantes utilisant has_role()
-- ============================================================================

-- ============================================================================
-- STORAGE.OBJECTS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Les admins peuvent uploader des icônes" ON storage.objects;
DROP POLICY IF EXISTS "Les admins peuvent supprimer des icônes" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can download their ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Support staff can view all attachments" ON storage.objects;

CREATE POLICY "Les admins peuvent uploader des icônes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'category-icons' AND has_min_global_role(auth.uid(), 5));

CREATE POLICY "Les admins peuvent supprimer des icônes"
ON storage.objects FOR DELETE
USING (bucket_id = 'category-icons' AND has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admins can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admins can update documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documents' AND has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents' AND has_min_global_role(auth.uid(), 5));

CREATE POLICY "Users can download their ticket attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'support-attachments' 
  AND (
    has_min_global_role(auth.uid(), 5) 
    OR has_support_access(auth.uid())
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Support staff can view all attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'support-attachments' 
  AND (has_min_global_role(auth.uid(), 5) OR has_support_access(auth.uid()) OR has_franchiseur_access(auth.uid()))
);

-- ============================================================================
-- USER_PERMISSIONS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Only admins can insert user permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Only admins can update user permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Only admins can delete user permissions" ON public.user_permissions;

CREATE POLICY "Users can view their own permissions"
ON public.user_permissions FOR SELECT
USING (auth.uid() = user_id OR has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can insert user permissions"
ON public.user_permissions FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can update user permissions"
ON public.user_permissions FOR UPDATE
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can delete user permissions"
ON public.user_permissions FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- USER_ROLES - Remplacer has_role par V2 (avant suppression table)
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

CREATE POLICY "Admins can manage user roles"
ON public.user_roles FOR ALL
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

-- ============================================================================
-- SUPPORT_TICKETS - Remplacer policy franchiseur restante
-- ============================================================================
DROP POLICY IF EXISTS "Franchiseur can manage all tickets" ON public.support_tickets;

CREATE POLICY "Franchiseur can manage all tickets"
ON public.support_tickets FOR ALL
USING (has_franchiseur_access(auth.uid()))
WITH CHECK (has_franchiseur_access(auth.uid()));

-- ============================================================================
-- FRANCHISEUR_AGENCY_ASSIGNMENTS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Directeur and DG can view all assignments" ON public.franchiseur_agency_assignments;
DROP POLICY IF EXISTS "Directeur and DG can manage assignments" ON public.franchiseur_agency_assignments;

CREATE POLICY "Directeur and DG can view all assignments"
ON public.franchiseur_agency_assignments FOR SELECT
USING (
  has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) 
  OR has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) 
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "Directeur and DG can manage assignments"
ON public.franchiseur_agency_assignments FOR ALL
USING (
  has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) 
  OR has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) 
  OR has_min_global_role(auth.uid(), 5)
)
WITH CHECK (
  has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) 
  OR has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) 
  OR has_min_global_role(auth.uid(), 5)
);

-- ============================================================================
-- AGENCY_ROYALTY_CONFIG - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Directeur and DG can view royalty configs" ON public.agency_royalty_config;
DROP POLICY IF EXISTS "Directeur and DG can manage royalty configs" ON public.agency_royalty_config;

CREATE POLICY "Directeur and DG can view royalty configs"
ON public.agency_royalty_config FOR SELECT
USING (
  has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) 
  OR has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) 
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "Directeur and DG can manage royalty configs"
ON public.agency_royalty_config FOR ALL
USING (
  has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) 
  OR has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) 
  OR has_min_global_role(auth.uid(), 5)
)
WITH CHECK (
  has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) 
  OR has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) 
  OR has_min_global_role(auth.uid(), 5)
);

-- ============================================================================
-- AGENCY_ROYALTY_TIERS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Directeur and DG can view royalty tiers" ON public.agency_royalty_tiers;
DROP POLICY IF EXISTS "Directeur and DG can manage royalty tiers" ON public.agency_royalty_tiers;

CREATE POLICY "Directeur and DG can view royalty tiers"
ON public.agency_royalty_tiers FOR SELECT
USING (
  has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) 
  OR has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) 
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "Directeur and DG can manage royalty tiers"
ON public.agency_royalty_tiers FOR ALL
USING (
  has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) 
  OR has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) 
  OR has_min_global_role(auth.uid(), 5)
)
WITH CHECK (
  has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) 
  OR has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) 
  OR has_min_global_role(auth.uid(), 5)
);

-- ============================================================================
-- AGENCY_ROYALTY_CALCULATIONS - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Directeur and DG can view royalty calculations" ON public.agency_royalty_calculations;
DROP POLICY IF EXISTS "Directeur and DG can manage royalty calculations" ON public.agency_royalty_calculations;

CREATE POLICY "Directeur and DG can view royalty calculations"
ON public.agency_royalty_calculations FOR SELECT
USING (
  has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) 
  OR has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) 
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "Directeur and DG can manage royalty calculations"
ON public.agency_royalty_calculations FOR ALL
USING (
  has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) 
  OR has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) 
  OR has_min_global_role(auth.uid(), 5)
)
WITH CHECK (
  has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) 
  OR has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) 
  OR has_min_global_role(auth.uid(), 5)
);

-- ============================================================================
-- USER_CAPABILITIES - Remplacer has_role par V2
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage all capabilities" ON public.user_capabilities;

CREATE POLICY "Admins can manage all capabilities"
ON public.user_capabilities FOR ALL
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));