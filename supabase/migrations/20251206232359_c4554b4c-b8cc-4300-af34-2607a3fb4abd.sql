-- Ajouter 'faq' à l'enum rag_context_type pour l'indexation des FAQ
ALTER TYPE public.rag_context_type ADD VALUE IF NOT EXISTS 'faq';