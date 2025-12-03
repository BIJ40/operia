-- Ajouter le champ subfolder aux documents collaborateur
ALTER TABLE public.collaborator_documents 
ADD COLUMN IF NOT EXISTS subfolder text NULL;

-- Index pour améliorer les performances de filtrage
CREATE INDEX IF NOT EXISTS idx_collaborator_documents_subfolder 
ON public.collaborator_documents(collaborator_id, doc_type, subfolder);