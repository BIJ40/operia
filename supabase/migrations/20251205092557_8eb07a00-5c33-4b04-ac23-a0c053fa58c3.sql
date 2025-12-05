-- Fix search_path security warning
CREATE OR REPLACE FUNCTION update_ticket_last_message()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Ne pas tracker les notes internes ni les messages système
  IF NEW.is_internal_note = true OR NEW.is_system_message = true THEN
    RETURN NEW;
  END IF;
  
  UPDATE support_tickets 
  SET 
    last_message_at = NEW.created_at,
    last_message_by = NEW.sender_id,
    updated_at = now()
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;