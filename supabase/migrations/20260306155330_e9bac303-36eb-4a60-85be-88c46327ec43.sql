
-- Table semaine type par technicien (1 ligne par jour de semaine)
CREATE TABLE public.technician_weekly_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  is_working BOOLEAN NOT NULL DEFAULT true,
  work_start TEXT DEFAULT '08:00',
  work_end TEXT DEFAULT '17:00',
  lunch_start TEXT DEFAULT '12:00',
  lunch_end TEXT DEFAULT '13:00',
  UNIQUE(collaborator_id, day_of_week)
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_day_of_week()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.day_of_week < 0 OR NEW.day_of_week > 6 THEN
    RAISE EXCEPTION 'day_of_week must be between 0 and 6';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_day_of_week
  BEFORE INSERT OR UPDATE ON public.technician_weekly_schedule
  FOR EACH ROW EXECUTE FUNCTION public.validate_day_of_week();

-- RLS
ALTER TABLE public.technician_weekly_schedule ENABLE ROW LEVEL SECURITY;

-- Read: authenticated users can read schedules
CREATE POLICY "Authenticated users can read schedules"
  ON public.technician_weekly_schedule
  FOR SELECT TO authenticated
  USING (true);

-- Write: users with agency access (N2+ or RH role)
CREATE POLICY "Agency managers can manage schedules"
  ON public.technician_weekly_schedule
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators c
      WHERE c.id = collaborator_id
      AND (
        public.has_min_global_role(auth.uid(), 2)
        OR public.has_agency_rh_role(auth.uid(), c.agency_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collaborators c
      WHERE c.id = collaborator_id
      AND (
        public.has_min_global_role(auth.uid(), 2)
        OR public.has_agency_rh_role(auth.uid(), c.agency_id)
      )
    )
  );
