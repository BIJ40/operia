-- ============================================================================
-- FIX 1: knowledge_base - Remove anon read (USING true for public role)
-- ============================================================================
DROP POLICY IF EXISTS "Tout le monde peut lire la knowledge base" ON knowledge_base;

-- Also remove legacy duplicate policies
DROP POLICY IF EXISTS "Only admins can delete documents" ON knowledge_base;
DROP POLICY IF EXISTS "Only admins can insert documents" ON knowledge_base;
DROP POLICY IF EXISTS "Only admins can update documents" ON knowledge_base;

-- ============================================================================
-- FIX 2: blocks - Remove anon read policy
-- ============================================================================
DROP POLICY IF EXISTS "Public can read blocks" ON blocks;

-- Remove duplicate authenticated read (keep blocks_authenticated_read)
DROP POLICY IF EXISTS "Authenticated users can view blocks" ON blocks;

-- Remove old has_role-based policies (superseded by blocks_write_n3plus)
DROP POLICY IF EXISTS "Only admins can delete blocks" ON blocks;
DROP POLICY IF EXISTS "Only admins can insert blocks" ON blocks;
DROP POLICY IF EXISTS "Only admins can update blocks" ON blocks;

-- ============================================================================
-- FIX 3: ai_search_cache - Remove permissive ALL for authenticated
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can manage cache" ON ai_search_cache;

-- ============================================================================
-- FIX 4: technician_weekly_schedule - Restrict SELECT to same agency
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can read schedules" ON technician_weekly_schedule;

CREATE POLICY "Same agency users can read schedules"
ON technician_weekly_schedule
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM collaborators c
    JOIN profiles p ON p.agency_id = c.agency_id
    WHERE c.id = technician_weekly_schedule.collaborator_id
      AND p.id = auth.uid()
  )
  OR has_min_global_role(auth.uid(), 3)
);

-- ============================================================================
-- FIX 5: doc_instances - Fix broken self-referencing UPDATE WITH CHECK
-- ============================================================================
DROP POLICY IF EXISTS "doc_instances_update" ON doc_instances;

CREATE POLICY "doc_instances_update"
ON doc_instances
FOR UPDATE
TO public
USING (
  (agency_id = get_user_agency_id(auth.uid()))
  OR has_min_global_role(auth.uid(), 4)
)
WITH CHECK (
  (agency_id = get_user_agency_id(auth.uid()))
  AND (template_id = (
    SELECT di.template_id FROM doc_instances di WHERE di.id = doc_instances.id
  ))
  AND (created_by = (
    SELECT di.created_by FROM doc_instances di WHERE di.id = doc_instances.id
  ))
);