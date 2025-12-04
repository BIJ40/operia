-- Fix search_path for trigger functions
CREATE OR REPLACE FUNCTION log_support_ticket_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.support_ticket_actions (ticket_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'status_change', OLD.status, NEW.status, auth.uid());
  END IF;

  IF OLD.heat_priority IS DISTINCT FROM NEW.heat_priority THEN
    INSERT INTO public.support_ticket_actions (ticket_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'priority_change', OLD.heat_priority::text, NEW.heat_priority::text, auth.uid());
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.support_ticket_actions (ticket_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'assignment', OLD.assigned_to::text, NEW.assigned_to::text, auth.uid());
  END IF;

  IF OLD.support_level IS DISTINCT FROM NEW.support_level AND NEW.support_level > COALESCE(OLD.support_level, 1) THEN
    INSERT INTO public.support_ticket_actions (ticket_id, action_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'escalation', 'N' || COALESCE(OLD.support_level, 1), 'N' || NEW.support_level, auth.uid());
  END IF;

  IF OLD.resolved_at IS NULL AND NEW.resolved_at IS NOT NULL THEN
    INSERT INTO public.support_ticket_actions (ticket_id, action_type, new_value, performed_by)
    VALUES (NEW.id, 'resolved', NEW.status, auth.uid());
  END IF;

  IF OLD.resolved_at IS NOT NULL AND NEW.resolved_at IS NULL THEN
    INSERT INTO public.support_ticket_actions (ticket_id, action_type, new_value, performed_by)
    VALUES (NEW.id, 'reopened', NEW.status, auth.uid());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION log_support_ticket_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.support_ticket_actions (ticket_id, action_type, new_value, performed_by)
  VALUES (NEW.id, 'created', NEW.status, NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;