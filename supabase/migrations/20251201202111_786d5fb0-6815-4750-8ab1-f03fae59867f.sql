-- ============================================
-- AUDIT FONCTIONNEL - Point 3: Unification des statuts Apogée-Tickets
-- ============================================
-- Suppression des colonnes héritées (qualif_status, apogee_status_raw, hc_status_raw)
-- Le système unifié utilise uniquement kanban_status + is_qualified

ALTER TABLE public.apogee_tickets 
DROP COLUMN IF EXISTS qualif_status,
DROP COLUMN IF EXISTS apogee_status_raw,
DROP COLUMN IF EXISTS hc_status_raw;

COMMENT ON COLUMN public.apogee_tickets.kanban_status IS 'Statut unique du ticket: backlog, in_progress, testing, recetté, delivered';
COMMENT ON COLUMN public.apogee_tickets.is_qualified IS 'Indique si le ticket a été qualifié par l''IA (indépendant du statut kanban)';

-- ============================================
-- AUDIT FONCTIONNEL - Point 2: Unification priorités (Heat 0-12 partout)
-- ============================================
-- Ajout de heat_priority sur support_tickets

ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS heat_priority INTEGER DEFAULT 6 CHECK (heat_priority >= 0 AND heat_priority <= 12);

COMMENT ON COLUMN public.support_tickets.heat_priority IS 'Priorité heat unifiée (0-12): 0-3=faible, 4-7=moyen, 8-10=élevé, 11-12=critique';

-- Migration des anciennes valeurs de priority (text) vers heat_priority (integer)
UPDATE public.support_tickets 
SET heat_priority = CASE 
  WHEN priority = 'bloquant' THEN 12
  WHEN priority = 'urgent' THEN 9
  WHEN priority = 'important' THEN 6
  WHEN priority = 'normal' THEN 3
  ELSE 6
END
WHERE heat_priority IS NULL OR heat_priority = 6;

-- ============================================
-- Mise à jour des fonctions/triggers SLA pour utiliser heat_priority
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_ticket_due_at_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sla_hours INTEGER;
BEGIN
  -- Calcul SLA basé sur heat_priority
  IF NEW.heat_priority >= 11 THEN
    sla_hours := 4;  -- Critique: 4h
  ELSIF NEW.heat_priority >= 8 THEN
    sla_hours := 8;  -- Élevé: 8h
  ELSIF NEW.heat_priority >= 4 THEN
    sla_hours := 24; -- Moyen: 24h
  ELSE
    sla_hours := 72; -- Faible: 72h
  END IF;

  NEW.due_at := NEW.created_at + (sla_hours || ' hours')::INTERVAL;
  RETURN NEW;
END;
$$;

-- Recréer le trigger avec la nouvelle fonction
DROP TRIGGER IF EXISTS set_ticket_due_at ON public.support_tickets;

CREATE TRIGGER set_ticket_due_at
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.calculate_ticket_due_at_v2();