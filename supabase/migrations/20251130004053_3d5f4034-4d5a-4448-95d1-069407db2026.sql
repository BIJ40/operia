
-- Enum for ticketing roles
CREATE TYPE public.apogee_ticket_role AS ENUM ('developer', 'tester', 'franchiseur');

-- User roles for ticketing (who has which role)
CREATE TABLE public.apogee_ticket_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_role apogee_ticket_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id)
);

-- Allowed transitions per role (from_status -> to_status)
CREATE TABLE public.apogee_ticket_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_status text NOT NULL REFERENCES apogee_ticket_statuses(id),
  to_status text NOT NULL REFERENCES apogee_ticket_statuses(id),
  allowed_role apogee_ticket_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_status, to_status, allowed_role)
);

-- Action history for audit trail
CREATE TABLE public.apogee_ticket_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES apogee_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action_type text NOT NULL, -- 'status_change', 'comment_added', 'created'
  old_value text,
  new_value text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.apogee_ticket_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apogee_ticket_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apogee_ticket_history ENABLE ROW LEVEL SECURITY;

-- Function to get user's ticket role
CREATE OR REPLACE FUNCTION public.get_user_ticket_role(_user_id uuid)
RETURNS apogee_ticket_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ticket_role FROM apogee_ticket_user_roles WHERE user_id = _user_id
$$;

-- Function to check if user can transition
CREATE OR REPLACE FUNCTION public.can_transition_ticket(_user_id uuid, _from_status text, _to_status text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admins can do everything
    has_min_global_role(_user_id, 5)
    OR
    -- Check if user's ticket role allows this transition
    EXISTS (
      SELECT 1 FROM apogee_ticket_transitions t
      JOIN apogee_ticket_user_roles r ON r.ticket_role = t.allowed_role
      WHERE r.user_id = _user_id
        AND t.from_status = _from_status
        AND t.to_status = _to_status
    )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage ticket user roles"
ON public.apogee_ticket_user_roles FOR ALL
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Users can view their own ticket role"
ON public.apogee_ticket_user_roles FOR SELECT
USING (user_id = auth.uid());

-- RLS Policies for transitions
CREATE POLICY "Admins can manage transitions"
ON public.apogee_ticket_transitions FOR ALL
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Authenticated can view transitions"
ON public.apogee_ticket_transitions FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies for history
CREATE POLICY "Admins can view all history"
ON public.apogee_ticket_history FOR SELECT
USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Users with apogee_tickets module can view history"
ON public.apogee_ticket_history FOR SELECT
USING ((SELECT ((profiles.enabled_modules->'apogee_tickets'->>'enabled')::boolean) FROM profiles WHERE id = auth.uid()) = true);

CREATE POLICY "Users with apogee_tickets module can insert history"
ON public.apogee_ticket_history FOR INSERT
WITH CHECK ((SELECT ((profiles.enabled_modules->'apogee_tickets'->>'enabled')::boolean) FROM profiles WHERE id = auth.uid()) = true);

-- Remove DELETE policy on apogee_tickets (only admin can delete)
DROP POLICY IF EXISTS "Users with apogee_tickets module can delete tickets" ON public.apogee_tickets;

-- Create index for history queries
CREATE INDEX idx_apogee_ticket_history_ticket_id ON apogee_ticket_history(ticket_id);
CREATE INDEX idx_apogee_ticket_history_user_id ON apogee_ticket_history(user_id);
CREATE INDEX idx_apogee_ticket_history_created_at ON apogee_ticket_history(created_at DESC);
