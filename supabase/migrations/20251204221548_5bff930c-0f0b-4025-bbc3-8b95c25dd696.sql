-- Fix search_path on functions
CREATE OR REPLACE FUNCTION update_leave_requests_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_leave_days(
    p_start_date date,
    p_end_date date,
    p_type text
) RETURNS numeric 
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_days numeric := 0;
    v_current date := p_start_date;
    v_prev_was_friday boolean := false;
BEGIN
    IF p_end_date IS NULL OR p_start_date > p_end_date THEN
        RETURN 0;
    END IF;
    
    WHILE v_current <= p_end_date LOOP
        -- Vérifier si c'est un jour férié
        IF NOT EXISTS (SELECT 1 FROM public.french_holidays WHERE date = v_current) THEN
            -- Pour CP: lun-ven + samedi si vendredi posé
            IF p_type = 'CP' THEN
                IF EXTRACT(DOW FROM v_current) BETWEEN 1 AND 5 THEN
                    -- Lundi à Vendredi
                    v_days := v_days + 1;
                    v_prev_was_friday := (EXTRACT(DOW FROM v_current) = 5);
                ELSIF EXTRACT(DOW FROM v_current) = 6 AND v_prev_was_friday THEN
                    -- Samedi après un vendredi posé
                    v_days := v_days + 1;
                    v_prev_was_friday := false;
                ELSE
                    v_prev_was_friday := false;
                END IF;
            ELSE
                -- Pour autres types: jours calendaires (lun-sam)
                IF EXTRACT(DOW FROM v_current) BETWEEN 1 AND 6 THEN
                    v_days := v_days + 1;
                END IF;
            END IF;
        END IF;
        
        v_current := v_current + 1;
    END LOOP;
    
    RETURN v_days;
END;
$$;