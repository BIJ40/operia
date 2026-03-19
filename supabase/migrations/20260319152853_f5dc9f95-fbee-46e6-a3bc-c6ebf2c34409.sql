-- Server-side guard: prevent scheduling non-approved suggestions
CREATE OR REPLACE FUNCTION public.check_suggestion_approved_before_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
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

CREATE TRIGGER trg_check_suggestion_approved
  BEFORE INSERT ON public.social_calendar_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.check_suggestion_approved_before_schedule();

-- Revert variant to approved when calendar entry is cancelled
CREATE OR REPLACE FUNCTION public.revert_variant_on_calendar_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('scheduled') AND NEW.status = 'cancelled' AND NEW.variant_id IS NOT NULL THEN
    UPDATE public.social_post_variants
    SET status = 'approved'
    WHERE id = NEW.variant_id
      AND status = 'scheduled';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_revert_variant_on_cancel
  BEFORE UPDATE ON public.social_calendar_entries
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.revert_variant_on_calendar_cancel();