
-- Fix search_path for the function
CREATE OR REPLACE FUNCTION generate_apporteur_request_reference()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_prefix TEXT;
  sequence_num INT;
  new_reference TEXT;
BEGIN
  -- Generate prefix AAMMJJ (year month day)
  today_prefix := to_char(NOW(), 'YYMMDD');
  
  -- Count existing requests for today to get sequence number
  SELECT COALESCE(MAX(
    CASE 
      WHEN reference LIKE today_prefix || '%' 
      THEN CAST(SUBSTRING(reference FROM 7 FOR 2) AS INT)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM apporteur_intervention_requests
  WHERE reference LIKE today_prefix || '%';
  
  -- Generate reference with 2-digit sequence (01-99)
  new_reference := today_prefix || LPAD(sequence_num::TEXT, 2, '0');
  
  NEW.reference := new_reference;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
