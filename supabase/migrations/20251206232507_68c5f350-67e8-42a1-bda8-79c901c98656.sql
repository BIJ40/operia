-- Ajouter une colonne title pour stocker le titre du document original
ALTER TABLE public.rag_index_documents ADD COLUMN IF NOT EXISTS title TEXT;