-- Supprimer l'ancienne contrainte CHECK sur priority si elle existe
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_priority_check;

-- Créer la nouvelle contrainte CHECK avec les valeurs correctes
ALTER TABLE public.support_tickets 
ADD CONSTRAINT support_tickets_priority_check 
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));