-- Create enum for franchiseur roles
CREATE TYPE public.franchiseur_role AS ENUM ('animateur', 'directeur', 'dg');

-- Create franchiseur_roles table
CREATE TABLE public.franchiseur_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  franchiseur_role franchiseur_role NOT NULL,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create franchiseur_agency_assignments table
CREATE TABLE public.franchiseur_agency_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, agency_id)
);

-- Create agency_royalty_config table
CREATE TABLE public.agency_royalty_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL DEFAULT 'Standard',
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agency_royalty_tiers table
CREATE TABLE public.agency_royalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.agency_royalty_config(id) ON DELETE CASCADE,
  tier_order INTEGER NOT NULL,
  from_amount NUMERIC(12,2) NOT NULL,
  to_amount NUMERIC(12,2),
  percentage NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(config_id, tier_order)
);

-- Create agency_royalty_calculations table
CREATE TABLE public.agency_royalty_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.agency_royalty_config(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  ca_cumul_annuel NUMERIC(12,2) NOT NULL,
  redevance_calculee NUMERIC(12,2) NOT NULL,
  detail_tranches JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  calculated_by UUID REFERENCES auth.users(id),
  UNIQUE(agency_id, year, month)
);

-- Enable RLS on all tables
ALTER TABLE public.franchiseur_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchiseur_agency_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_royalty_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_royalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_royalty_calculations ENABLE ROW LEVEL SECURITY;

-- Create helper function to check franchiseur role
CREATE OR REPLACE FUNCTION public.has_franchiseur_role(_user_id UUID, _role franchiseur_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.franchiseur_roles
    WHERE user_id = _user_id
      AND franchiseur_role = _role
  )
$$;

-- RLS Policies for franchiseur_roles
CREATE POLICY "Users can view their own franchiseur role"
  ON public.franchiseur_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all franchiseur roles"
  ON public.franchiseur_roles
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage franchiseur roles"
  ON public.franchiseur_roles
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for franchiseur_agency_assignments
CREATE POLICY "Users can view their own agency assignments"
  ON public.franchiseur_agency_assignments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Directeur and DG can view all assignments"
  ON public.franchiseur_agency_assignments
  FOR SELECT
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Directeur and DG can manage assignments"
  ON public.franchiseur_agency_assignments
  FOR ALL
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policies for agency_royalty_config
CREATE POLICY "Directeur and DG can view royalty configs"
  ON public.agency_royalty_config
  FOR SELECT
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Directeur and DG can manage royalty configs"
  ON public.agency_royalty_config
  FOR ALL
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policies for agency_royalty_tiers
CREATE POLICY "Directeur and DG can view royalty tiers"
  ON public.agency_royalty_tiers
  FOR SELECT
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Directeur and DG can manage royalty tiers"
  ON public.agency_royalty_tiers
  FOR ALL
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policies for agency_royalty_calculations
CREATE POLICY "Directeur and DG can view royalty calculations"
  ON public.agency_royalty_calculations
  FOR SELECT
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Directeur and DG can manage royalty calculations"
  ON public.agency_royalty_calculations
  FOR ALL
  USING (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_franchiseur_role(auth.uid(), 'directeur'::franchiseur_role) OR
    has_franchiseur_role(auth.uid(), 'dg'::franchiseur_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Create triggers for updated_at
CREATE TRIGGER update_franchiseur_roles_updated_at
  BEFORE UPDATE ON public.franchiseur_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_royalty_config_updated_at
  BEFORE UPDATE ON public.agency_royalty_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();