-- P3.3: Replace has_franchiseur_role() policies with has_min_global_role()
-- First, drop the policies that depend on has_franchiseur_role()
DROP POLICY IF EXISTS "Directeur and DG can view all assignments" ON public.franchiseur_agency_assignments;
DROP POLICY IF EXISTS "Directeur and DG can manage assignments" ON public.franchiseur_agency_assignments;

-- Recreate policies using has_min_global_role() instead
CREATE POLICY "N4+ can view all assignments"
  ON public.franchiseur_agency_assignments
  FOR SELECT
  USING (has_min_global_role(auth.uid(), 4));

CREATE POLICY "N4+ can manage assignments"
  ON public.franchiseur_agency_assignments
  FOR ALL
  USING (has_min_global_role(auth.uid(), 4));

-- Now drop the function
DROP FUNCTION IF EXISTS public.has_franchiseur_role(_user_id uuid, _role franchiseur_role);

-- P3.4: Convert context_type to strict enum for RAG
CREATE TYPE public.rag_context_type AS ENUM (
  'apogee',
  'apporteurs', 
  'helpconfort',
  'metier',
  'franchise',
  'documents',
  'auto'
);

-- Migrate guide_chunks
ALTER TABLE public.guide_chunks 
  ADD COLUMN context_type_enum rag_context_type;

UPDATE public.guide_chunks
SET context_type_enum = CASE
  WHEN (metadata->>'context_type')::text = 'apogee' THEN 'apogee'::rag_context_type
  WHEN (metadata->>'context_type')::text = 'apporteurs' THEN 'apporteurs'::rag_context_type
  WHEN (metadata->>'context_type')::text = 'helpconfort' THEN 'helpconfort'::rag_context_type
  WHEN (metadata->>'context_type')::text = 'metier' THEN 'metier'::rag_context_type
  WHEN (metadata->>'context_type')::text = 'franchise' THEN 'franchise'::rag_context_type
  WHEN (metadata->>'context_type')::text = 'documents' THEN 'documents'::rag_context_type
  WHEN (metadata->>'context_type')::text = 'auto' THEN 'auto'::rag_context_type
  ELSE 'documents'::rag_context_type
END;

ALTER TABLE public.guide_chunks DROP COLUMN IF EXISTS context_type;
ALTER TABLE public.guide_chunks RENAME COLUMN context_type_enum TO context_type;
ALTER TABLE public.guide_chunks ALTER COLUMN context_type SET NOT NULL;

-- Migrate rag_index_documents
ALTER TABLE public.rag_index_documents ADD COLUMN context_type_enum rag_context_type;

UPDATE public.rag_index_documents
SET context_type_enum = CASE
  WHEN context_type = 'apogee' THEN 'apogee'::rag_context_type
  WHEN context_type = 'apporteurs' THEN 'apporteurs'::rag_context_type
  WHEN context_type = 'helpconfort' THEN 'helpconfort'::rag_context_type
  WHEN context_type = 'metier' THEN 'metier'::rag_context_type
  WHEN context_type = 'franchise' THEN 'franchise'::rag_context_type
  WHEN context_type = 'documents' THEN 'documents'::rag_context_type
  WHEN context_type = 'auto' THEN 'auto'::rag_context_type
  ELSE 'documents'::rag_context_type
END;

ALTER TABLE public.rag_index_documents DROP COLUMN context_type;
ALTER TABLE public.rag_index_documents RENAME COLUMN context_type_enum TO context_type;

-- Migrate faq_items
ALTER TABLE public.faq_items ADD COLUMN context_type_enum rag_context_type;

UPDATE public.faq_items
SET context_type_enum = CASE
  WHEN context_type = 'apogee' THEN 'apogee'::rag_context_type
  WHEN context_type = 'apporteurs' THEN 'apporteurs'::rag_context_type
  WHEN context_type = 'helpconfort' THEN 'helpconfort'::rag_context_type
  WHEN context_type = 'metier' THEN 'metier'::rag_context_type
  WHEN context_type = 'franchise' THEN 'franchise'::rag_context_type
  WHEN context_type = 'documents' THEN 'documents'::rag_context_type
  WHEN context_type = 'auto' THEN 'auto'::rag_context_type
  ELSE 'documents'::rag_context_type
END;

ALTER TABLE public.faq_items DROP COLUMN context_type;
ALTER TABLE public.faq_items RENAME COLUMN context_type_enum TO context_type;
ALTER TABLE public.faq_items 
  ALTER COLUMN context_type SET NOT NULL,
  ALTER COLUMN context_type SET DEFAULT 'documents'::rag_context_type;

-- Migrate chatbot_queries
ALTER TABLE public.chatbot_queries ADD COLUMN context_type_enum rag_context_type;

UPDATE public.chatbot_queries
SET context_type_enum = CASE
  WHEN context_type_used = 'apogee' THEN 'apogee'::rag_context_type
  WHEN context_type_used = 'apporteurs' THEN 'apporteurs'::rag_context_type
  WHEN context_type_used = 'helpconfort' THEN 'helpconfort'::rag_context_type
  WHEN context_type_used = 'metier' THEN 'metier'::rag_context_type
  WHEN context_type_used = 'franchise' THEN 'franchise'::rag_context_type
  WHEN context_type_used = 'documents' THEN 'documents'::rag_context_type
  WHEN context_type_used = 'auto' THEN 'auto'::rag_context_type
  ELSE NULL
END;

ALTER TABLE public.chatbot_queries DROP COLUMN context_type_used;
ALTER TABLE public.chatbot_queries RENAME COLUMN context_type_enum TO context_type_used;

-- P3.5: Migrate priority text to heat_priority
UPDATE public.apogee_tickets
SET heat_priority = CASE
  WHEN priority = 'bloquant' THEN 12
  WHEN priority = 'critique' THEN 11
  WHEN priority = 'urgent' THEN 9
  WHEN priority = 'élevé' THEN 8
  WHEN priority = 'important' THEN 7
  WHEN priority = 'moyen' THEN 6
  WHEN priority = 'normal' THEN 5
  WHEN priority = 'faible' THEN 3
  WHEN priority = 'très faible' THEN 1
  ELSE 6
END
WHERE heat_priority IS NULL AND priority IS NOT NULL;

UPDATE public.apogee_tickets SET heat_priority = 6 WHERE heat_priority IS NULL;

ALTER TABLE public.apogee_tickets
  ALTER COLUMN heat_priority SET NOT NULL,
  ALTER COLUMN heat_priority SET DEFAULT 6;

ALTER TABLE public.apogee_tickets DROP COLUMN IF EXISTS priority;