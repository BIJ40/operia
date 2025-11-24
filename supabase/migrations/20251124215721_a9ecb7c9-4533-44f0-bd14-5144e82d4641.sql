-- Corriger le search_path de la fonction avec CASCADE
DROP FUNCTION IF EXISTS update_chatbot_query_reviewed_at() CASCADE;

CREATE OR REPLACE FUNCTION update_chatbot_query_reviewed_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'reviewed' OR NEW.status = 'resolved' THEN
    NEW.reviewed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER trigger_update_reviewed_at
BEFORE UPDATE ON public.chatbot_queries
FOR EACH ROW
EXECUTE FUNCTION update_chatbot_query_reviewed_at();