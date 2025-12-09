-- Ajout des colonnes pour tracer qui a fermé la session et pourquoi
ALTER TABLE public.live_support_sessions 
ADD COLUMN IF NOT EXISTS closed_by TEXT CHECK (closed_by IN ('user', 'agent')),
ADD COLUMN IF NOT EXISTS closed_reason TEXT;