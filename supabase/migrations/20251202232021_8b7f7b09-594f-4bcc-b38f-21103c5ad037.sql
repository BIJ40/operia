-- Trigger pour retirer le tag NEW lors de modifications
CREATE OR REPLACE FUNCTION public.remove_new_tag_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ne retirer NEW que si le ticket a été modifié (pas juste la date)
  IF OLD.element_concerne IS DISTINCT FROM NEW.element_concerne
     OR OLD.description IS DISTINCT FROM NEW.description
     OR OLD.module IS DISTINCT FROM NEW.module
     OR OLD.owner_side IS DISTINCT FROM NEW.owner_side
     OR OLD.kanban_status IS DISTINCT FROM NEW.kanban_status
     OR OLD.heat_priority IS DISTINCT FROM NEW.heat_priority
     OR OLD.is_qualified IS DISTINCT FROM NEW.is_qualified
  THEN
    NEW.impact_tags = array_remove(NEW.impact_tags, 'NEW');
  END IF;
  RETURN NEW;
END;
$function$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_remove_new_tag ON apogee_tickets;
CREATE TRIGGER trigger_remove_new_tag
  BEFORE UPDATE ON apogee_tickets
  FOR EACH ROW
  EXECUTE FUNCTION remove_new_tag_on_update();