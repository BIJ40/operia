-- Persist acknowledgement of deadline alerts per user/agency/day
CREATE TABLE IF NOT EXISTS public.deadline_alert_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agency_id text NOT NULL,
  acknowledged_on date NOT NULL DEFAULT current_date,
  alert_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure one acknowledgement per user/agency/day
CREATE UNIQUE INDEX IF NOT EXISTS deadline_alert_ack_user_agency_day_uidx
ON public.deadline_alert_acknowledgements (user_id, agency_id, acknowledged_on);

-- Enable Row Level Security
ALTER TABLE public.deadline_alert_acknowledgements ENABLE ROW LEVEL SECURITY;

-- Policies: users manage only their own acknowledgements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deadline_alert_acknowledgements'
      AND policyname = 'Users can view their own deadline alert acknowledgements'
  ) THEN
    CREATE POLICY "Users can view their own deadline alert acknowledgements"
    ON public.deadline_alert_acknowledgements
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deadline_alert_acknowledgements'
      AND policyname = 'Users can insert their own deadline alert acknowledgements'
  ) THEN
    CREATE POLICY "Users can insert their own deadline alert acknowledgements"
    ON public.deadline_alert_acknowledgements
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deadline_alert_acknowledgements'
      AND policyname = 'Users can update their own deadline alert acknowledgements'
  ) THEN
    CREATE POLICY "Users can update their own deadline alert acknowledgements"
    ON public.deadline_alert_acknowledgements
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;