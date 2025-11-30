-- Table for animator agency visits
CREATE TABLE public.animator_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  visit_type TEXT NOT NULL DEFAULT 'visite_terrain', -- visite_terrain, audit, accompagnement, formation
  status TEXT NOT NULL DEFAULT 'planifie', -- planifie, effectue, annule
  notes TEXT,
  report_content TEXT,
  report_file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.animator_visits ENABLE ROW LEVEL SECURITY;

-- Animators can view/manage their own visits
CREATE POLICY "Animators can view their own visits"
ON public.animator_visits FOR SELECT
USING (
  animator_id = auth.uid() 
  OR has_franchiseur_role(auth.uid(), 'directeur')
  OR has_franchiseur_role(auth.uid(), 'dg')
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "Animators can insert their own visits"
ON public.animator_visits FOR INSERT
WITH CHECK (
  animator_id = auth.uid()
  OR has_franchiseur_role(auth.uid(), 'directeur')
  OR has_franchiseur_role(auth.uid(), 'dg')
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "Animators can update their own visits"
ON public.animator_visits FOR UPDATE
USING (
  animator_id = auth.uid()
  OR has_franchiseur_role(auth.uid(), 'directeur')
  OR has_franchiseur_role(auth.uid(), 'dg')
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "Animators can delete their own visits"
ON public.animator_visits FOR DELETE
USING (
  animator_id = auth.uid()
  OR has_franchiseur_role(auth.uid(), 'directeur')
  OR has_franchiseur_role(auth.uid(), 'dg')
  OR has_min_global_role(auth.uid(), 5)
);

-- Table for expense requests (notes de frais)
CREATE TABLE public.expense_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  visit_id UUID REFERENCES animator_visits(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT 'deplacement', -- deplacement, repas, hebergement, autre
  status TEXT NOT NULL DEFAULT 'soumis', -- soumis, approuve, refuse, rembourse
  receipt_file_path TEXT,
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests or requests they need to approve
CREATE POLICY "Users can view expense requests"
ON public.expense_requests FOR SELECT
USING (
  requester_id = auth.uid()
  OR approver_id = auth.uid()
  OR has_franchiseur_role(auth.uid(), 'directeur')
  OR has_franchiseur_role(auth.uid(), 'dg')
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "Users can insert expense requests"
ON public.expense_requests FOR INSERT
WITH CHECK (
  requester_id = auth.uid()
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "Users can update expense requests"
ON public.expense_requests FOR UPDATE
USING (
  requester_id = auth.uid()
  OR approver_id = auth.uid()
  OR has_franchiseur_role(auth.uid(), 'directeur')
  OR has_franchiseur_role(auth.uid(), 'dg')
  OR has_min_global_role(auth.uid(), 5)
);

-- Triggers for updated_at
CREATE TRIGGER update_animator_visits_updated_at
  BEFORE UPDATE ON public.animator_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_requests_updated_at
  BEFORE UPDATE ON public.expense_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();