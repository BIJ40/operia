-- P2: Table historique des actions sur les tickets support
CREATE TABLE IF NOT EXISTS public.support_ticket_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  performed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes par ticket
CREATE INDEX IF NOT EXISTS idx_support_ticket_actions_ticket_id ON public.support_ticket_actions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_actions_created_at ON public.support_ticket_actions(created_at DESC);

-- RLS
ALTER TABLE public.support_ticket_actions ENABLE ROW LEVEL SECURITY;

-- Agents support peuvent voir l'historique
CREATE POLICY "Support agents can view action history" ON public.support_ticket_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.global_role IN ('franchisor_admin', 'platform_admin', 'superadmin')
        OR (
          p.enabled_modules->'support'->'options'->>'agent' = 'true'
        )
      )
    )
  );

-- Agents support peuvent créer des entrées
CREATE POLICY "Support agents can create action history" ON public.support_ticket_actions
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Trigger pour logger automatiquement les changements de statut/priorité
CREATE OR REPLACE FUNCTION log_support_ticket_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.support_ticket_actions (ticket_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'status_change', OLD.status, NEW.status, auth.uid());
  END IF;

  -- Log priority change
  IF OLD.heat_priority IS DISTINCT FROM NEW.heat_priority THEN
    INSERT INTO public.support_ticket_actions (ticket_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'priority_change', OLD.heat_priority::text, NEW.heat_priority::text, auth.uid());
  END IF;

  -- Log assignment change
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.support_ticket_actions (ticket_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'assignment', OLD.assigned_to::text, NEW.assigned_to::text, auth.uid());
  END IF;

  -- Log escalation
  IF OLD.support_level IS DISTINCT FROM NEW.support_level AND NEW.support_level > COALESCE(OLD.support_level, 1) THEN
    INSERT INTO public.support_ticket_actions (ticket_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'escalation', 'N' || COALESCE(OLD.support_level, 1), 'N' || NEW.support_level, auth.uid());
  END IF;

  -- Log resolution
  IF OLD.resolved_at IS NULL AND NEW.resolved_at IS NOT NULL THEN
    INSERT INTO public.support_ticket_actions (ticket_id, action_type, new_value, performed_by)
    VALUES (NEW.id, 'resolved', NEW.status, auth.uid());
  END IF;

  -- Log reopen
  IF OLD.resolved_at IS NOT NULL AND NEW.resolved_at IS NULL THEN
    INSERT INTO public.support_ticket_actions (ticket_id, action_type, new_value, performed_by)
    VALUES (NEW.id, 'reopened', NEW.status, auth.uid());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
DROP TRIGGER IF EXISTS trigger_log_support_ticket_changes ON public.support_tickets;
CREATE TRIGGER trigger_log_support_ticket_changes
  AFTER UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_support_ticket_changes();

-- Trigger pour logger la création de ticket
CREATE OR REPLACE FUNCTION log_support_ticket_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.support_ticket_actions (ticket_id, action_type, new_value, performed_by)
  VALUES (NEW.id, 'created', NEW.status, NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_support_ticket_creation ON public.support_tickets;
CREATE TRIGGER trigger_log_support_ticket_creation
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_support_ticket_creation();