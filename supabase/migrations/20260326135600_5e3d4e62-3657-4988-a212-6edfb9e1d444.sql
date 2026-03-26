ALTER TABLE public.dossier_exchanges
  DROP CONSTRAINT IF EXISTS dossier_exchanges_action_type_check;

ALTER TABLE public.dossier_exchanges
  ADD CONSTRAINT dossier_exchanges_action_type_check
  CHECK (action_type IN ('annuler', 'relancer', 'info', 'reponse', 'message', 'valider_devis', 'refuser_devis', 'systeme'));