-- Add new context types to the enum
ALTER TYPE rag_context_type ADD VALUE IF NOT EXISTS 'marche_batiment';
ALTER TYPE rag_context_type ADD VALUE IF NOT EXISTS 'groupe_laposte_axeo';