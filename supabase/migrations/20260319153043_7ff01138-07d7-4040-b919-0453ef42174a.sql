-- A. Also check on UPDATE when status becomes 'scheduled'
CREATE OR REPLACE FUNCTION public.check_suggestion_approved_before_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  -- On INSERT: always check. On UPDATE: only when status becomes 'scheduled'
  IF TG_OP = 'UPDATE' AND NEW.status <> 'scheduled' THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_status
  FROM public.social_content_suggestions
  WHERE id = NEW.suggestion_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Suggestion introuvable: %', NEW.suggestion_id;
  END IF;

  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'Impossible de planifier une suggestion non approuvée (statut actuel: %)', v_status;
  END IF;

  RETURN NEW;
END;
$$;

-- Add the UPDATE trigger
CREATE TRIGGER trg_check_suggestion_approved_on_update
  BEFORE UPDATE ON public.social_calendar_entries
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'scheduled')
  EXECUTE FUNCTION public.check_suggestion_approved_before_schedule();

-- B. Fix revert: only revert variant if no other active calendar entry exists
CREATE OR REPLACE FUNCTION public.revert_variant_on_calendar_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_other_active_count integer;
BEGIN
  IF OLD.status = 'scheduled' AND NEW.status = 'cancelled' AND NEW.variant_id IS NOT NULL THEN
    -- Check no other active calendar entry uses this variant
    SELECT count(*) INTO v_other_active_count
    FROM public.social_calendar_entries
    WHERE variant_id = NEW.variant_id
      AND id <> NEW.id
      AND status IN ('scheduled', 'published');

    IF v_other_active_count = 0 THEN
      UPDATE public.social_post_variants
      SET status = 'approved'
      WHERE id = NEW.variant_id
        AND status = 'scheduled';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;