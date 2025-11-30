-- P3#1: SLA Support - Ajout colonnes due_at et sla_status
-- Ajoute le calcul automatique des échéances SLA

-- Ajouter les colonnes SLA
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS due_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'ok' CHECK (sla_status IN ('ok', 'warning', 'late'));

-- Index pour les requêtes de monitoring SLA
CREATE INDEX IF NOT EXISTS idx_support_tickets_due_at ON public.support_tickets(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_sla_status ON public.support_tickets(sla_status) WHERE sla_status != 'ok';

-- Fonction pour calculer le due_at selon la catégorie et priorité
-- Règles SLA:
--   bug + bloquant: 4h
--   bug + urgent: 8h
--   bug + normal: 24h
--   blocage: 4h
--   question: 24h
--   amelioration: 72h
--   autre: 48h
CREATE OR REPLACE FUNCTION public.calculate_ticket_due_at(
  p_category TEXT,
  p_priority TEXT,
  p_created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_hours INT;
BEGIN
  -- Règles SLA basées sur catégorie + priorité
  CASE
    -- Blocages critiques
    WHEN p_category = 'blocage' OR p_priority = 'bloquant' THEN
      v_hours := 4;
    
    -- Bugs selon priorité
    WHEN p_category = 'bug' AND p_priority = 'urgent' THEN
      v_hours := 8;
    WHEN p_category = 'bug' AND p_priority IN ('important', 'normal') THEN
      v_hours := 24;
    WHEN p_category = 'bug' THEN
      v_hours := 48;
    
    -- Questions simples
    WHEN p_category = 'question' THEN
      v_hours := 24;
    
    -- Demandes d'évolution
    WHEN p_category = 'amelioration' THEN
      v_hours := 72;
    
    -- Autres cas selon priorité
    WHEN p_priority = 'urgent' THEN
      v_hours := 8;
    WHEN p_priority = 'important' THEN
      v_hours := 24;
    
    -- Par défaut
    ELSE
      v_hours := 48;
  END CASE;
  
  RETURN p_created_at + (v_hours || ' hours')::INTERVAL;
END;
$$;

-- Fonction pour calculer le statut SLA
CREATE OR REPLACE FUNCTION public.calculate_sla_status(
  p_due_at TIMESTAMP WITH TIME ZONE,
  p_status TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Si ticket déjà résolu/fermé, pas de statut SLA
  IF p_status IN ('resolved', 'closed') THEN
    RETURN 'ok';
  END IF;
  
  -- Si pas de due_at défini
  IF p_due_at IS NULL THEN
    RETURN 'ok';
  END IF;
  
  -- Calcul du statut
  IF now() > p_due_at THEN
    RETURN 'late';
  ELSIF now() > (p_due_at - INTERVAL '1 hour') THEN
    RETURN 'warning';
  ELSE
    RETURN 'ok';
  END IF;
END;
$$;

-- Trigger pour calculer automatiquement due_at à la création
CREATE OR REPLACE FUNCTION public.set_ticket_due_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculer due_at seulement si non défini
  IF NEW.due_at IS NULL THEN
    NEW.due_at := calculate_ticket_due_at(
      COALESCE(NEW.category, 'autre'),
      COALESCE(NEW.priority, 'normal'),
      COALESCE(NEW.created_at, now())
    );
  END IF;
  
  -- Mettre à jour sla_status
  NEW.sla_status := calculate_sla_status(NEW.due_at, NEW.status);
  
  RETURN NEW;
END;
$$;

-- Créer le trigger sur INSERT et UPDATE
DROP TRIGGER IF EXISTS trigger_set_ticket_due_at ON public.support_tickets;
CREATE TRIGGER trigger_set_ticket_due_at
  BEFORE INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ticket_due_at();

-- Mettre à jour les tickets existants avec due_at calculé
UPDATE public.support_tickets
SET due_at = calculate_ticket_due_at(
  COALESCE(category, 'autre'),
  COALESCE(priority, 'normal'),
  created_at
)
WHERE due_at IS NULL;