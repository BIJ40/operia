-- Table des abonnements Stripe par agence
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  plan_key text NOT NULL CHECK (plan_key IN ('pilotage', 'suivi')),
  stripe_subscription_id text,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'past_due', 'canceled')),
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agency_id, plan_key)
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Lecture : membres de l'agence (via profiles.agency_id)
CREATE POLICY "Users can view their agency subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT p.agency_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Écriture réservée au service_role (webhooks Stripe)
-- Pas de policy INSERT/UPDATE/DELETE pour authenticated = seul service_role peut écrire

-- Trigger updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();