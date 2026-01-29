-- Supprimer les doublons apogee_tickets (garder ticketing.* uniquement)
DELETE FROM public.feature_flags 
WHERE module_key IN (
  'apogee_tickets',
  'apogee_tickets.kanban',
  'apogee_tickets.manage',
  'apogee_tickets.import'
);

-- Mettre à jour le label de ticketing pour cohérence
UPDATE public.feature_flags 
SET module_label = 'Gestion de Projet'
WHERE module_key = 'ticketing';