-- Correction des warnings: ajout search_path aux fonctions immutables

-- Recréer calculate_ticket_due_at avec search_path
CREATE OR REPLACE FUNCTION public.calculate_ticket_due_at(
  p_category TEXT,
  p_priority TEXT,
  p_created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_hours INT;
BEGIN
  CASE
    WHEN p_category = 'blocage' OR p_priority = 'bloquant' THEN v_hours := 4;
    WHEN p_category = 'bug' AND p_priority = 'urgent' THEN v_hours := 8;
    WHEN p_category = 'bug' AND p_priority IN ('important', 'normal') THEN v_hours := 24;
    WHEN p_category = 'bug' THEN v_hours := 48;
    WHEN p_category = 'question' THEN v_hours := 24;
    WHEN p_category = 'amelioration' THEN v_hours := 72;
    WHEN p_priority = 'urgent' THEN v_hours := 8;
    WHEN p_priority = 'important' THEN v_hours := 24;
    ELSE v_hours := 48;
  END CASE;
  RETURN p_created_at + (v_hours || ' hours')::INTERVAL;
END;
$$;

-- Recréer calculate_sla_status avec search_path
CREATE OR REPLACE FUNCTION public.calculate_sla_status(
  p_due_at TIMESTAMP WITH TIME ZONE,
  p_status TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_status IN ('resolved', 'closed') THEN RETURN 'ok'; END IF;
  IF p_due_at IS NULL THEN RETURN 'ok'; END IF;
  IF now() > p_due_at THEN RETURN 'late';
  ELSIF now() > (p_due_at - INTERVAL '1 hour') THEN RETURN 'warning';
  ELSE RETURN 'ok';
  END IF;
END;
$$;