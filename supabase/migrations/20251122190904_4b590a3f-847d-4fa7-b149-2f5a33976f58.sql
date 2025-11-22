-- Fix search_path for the function to address security warning
CREATE OR REPLACE FUNCTION update_guide_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;