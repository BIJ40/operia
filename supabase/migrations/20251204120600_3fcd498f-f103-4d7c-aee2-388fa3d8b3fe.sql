-- Fix: Set search_path for trigger function
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := to_tsvector('french', 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.file_name, '') || ' ' ||
    COALESCE(NEW.subfolder, '')
  );
  RETURN NEW;
END;
$$;