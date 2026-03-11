-- Allow intervention requests from OTP managers (no apporteur_users record)
-- Make apporteur_user_id nullable and add apporteur_manager_id

ALTER TABLE public.apporteur_intervention_requests
  ALTER COLUMN apporteur_user_id DROP NOT NULL;

ALTER TABLE public.apporteur_intervention_requests
  ADD COLUMN apporteur_manager_id uuid REFERENCES public.apporteur_managers(id);

COMMENT ON COLUMN public.apporteur_intervention_requests.apporteur_manager_id IS 'Manager who created request via OTP portal';