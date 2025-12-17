-- ==========================================
-- PARTIE B: MODÈLE DE DONNÉES TECHNICIEN
-- ==========================================

-- 1. Profil de travail salarié
CREATE TABLE public.collaborator_work_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  weekly_contract_minutes INTEGER NOT NULL DEFAULT 2100, -- 35h par défaut
  break_minutes_default INTEGER NOT NULL DEFAULT 60,
  work_week_starts_on INTEGER NOT NULL DEFAULT 1, -- 1 = lundi
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(collaborator_id)
);

-- 2. Événements de pointage
CREATE TABLE public.time_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL CHECK (event_type IN ('start_day', 'start_break', 'end_break', 'end_day')),
  source TEXT NOT NULL DEFAULT 'mobile' CHECK (source IN ('mobile', 'manual', 'system')),
  notes TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Feuilles de temps hebdomadaires
CREATE TABLE public.timesheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  contract_minutes INTEGER NOT NULL DEFAULT 2100,
  overtime_minutes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  computed JSONB NOT NULL DEFAULT '{}', -- Détail par jour
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(collaborator_id, week_start)
);

-- 4. Packages de planning (amélioration de planning_signatures existant)
CREATE TABLE public.planning_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  title TEXT,
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Techniciens assignés à un package
CREATE TABLE public.planning_package_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.planning_packages(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(package_id, collaborator_id)
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX idx_time_events_collaborator ON public.time_events(collaborator_id);
CREATE INDEX idx_time_events_occurred_at ON public.time_events(occurred_at);
CREATE INDEX idx_timesheets_collaborator ON public.timesheets(collaborator_id);
CREATE INDEX idx_timesheets_week_start ON public.timesheets(week_start);
CREATE INDEX idx_timesheets_status ON public.timesheets(status);
CREATE INDEX idx_planning_packages_agency ON public.planning_packages(agency_id);
CREATE INDEX idx_planning_packages_week ON public.planning_packages(week_start);
CREATE INDEX idx_planning_package_recipients_package ON public.planning_package_recipients(package_id);

-- ==========================================
-- TRIGGERS
-- ==========================================
CREATE TRIGGER update_collaborator_work_profiles_updated_at
  BEFORE UPDATE ON public.collaborator_work_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_timesheets_updated_at
  BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- collaborator_work_profiles
ALTER TABLE public.collaborator_work_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_profiles_select_own"
  ON public.collaborator_work_profiles FOR SELECT
  USING (
    collaborator_id IN (
      SELECT id FROM public.collaborators 
      WHERE user_id = auth.uid()
    )
    OR has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "work_profiles_insert_n2"
  ON public.collaborator_work_profiles FOR INSERT
  WITH CHECK (has_min_global_role(auth.uid(), 2));

CREATE POLICY "work_profiles_update_n2"
  ON public.collaborator_work_profiles FOR UPDATE
  USING (has_min_global_role(auth.uid(), 2));

CREATE POLICY "work_profiles_delete_n2"
  ON public.collaborator_work_profiles FOR DELETE
  USING (has_min_global_role(auth.uid(), 2));

-- time_events
ALTER TABLE public.time_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_events_select_own"
  ON public.time_events FOR SELECT
  USING (
    collaborator_id IN (
      SELECT id FROM public.collaborators 
      WHERE user_id = auth.uid()
    )
    OR has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "time_events_insert_own"
  ON public.time_events FOR INSERT
  WITH CHECK (
    collaborator_id IN (
      SELECT id FROM public.collaborators 
      WHERE user_id = auth.uid()
    )
    OR has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "time_events_update_n2"
  ON public.time_events FOR UPDATE
  USING (has_min_global_role(auth.uid(), 2));

CREATE POLICY "time_events_delete_n2"
  ON public.time_events FOR DELETE
  USING (has_min_global_role(auth.uid(), 2));

-- timesheets
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timesheets_select_own"
  ON public.timesheets FOR SELECT
  USING (
    collaborator_id IN (
      SELECT id FROM public.collaborators 
      WHERE user_id = auth.uid()
    )
    OR has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "timesheets_insert_own"
  ON public.timesheets FOR INSERT
  WITH CHECK (
    collaborator_id IN (
      SELECT id FROM public.collaborators 
      WHERE user_id = auth.uid()
    )
    OR has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "timesheets_update_own_draft"
  ON public.timesheets FOR UPDATE
  USING (
    (collaborator_id IN (
      SELECT id FROM public.collaborators 
      WHERE user_id = auth.uid()
    ) AND status IN ('draft', 'rejected'))
    OR has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "timesheets_delete_n2"
  ON public.timesheets FOR DELETE
  USING (has_min_global_role(auth.uid(), 2));

-- planning_packages
ALTER TABLE public.planning_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planning_packages_select"
  ON public.planning_packages FOR SELECT
  USING (
    agency_id = get_user_agency_id(auth.uid())
    OR has_min_global_role(auth.uid(), 3)
  );

CREATE POLICY "planning_packages_insert_n2"
  ON public.planning_packages FOR INSERT
  WITH CHECK (
    agency_id = get_user_agency_id(auth.uid()) 
    AND has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "planning_packages_update_n2"
  ON public.planning_packages FOR UPDATE
  USING (
    agency_id = get_user_agency_id(auth.uid()) 
    AND has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "planning_packages_delete_n2"
  ON public.planning_packages FOR DELETE
  USING (
    agency_id = get_user_agency_id(auth.uid()) 
    AND has_min_global_role(auth.uid(), 2)
  );

-- planning_package_recipients
ALTER TABLE public.planning_package_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "package_recipients_select"
  ON public.planning_package_recipients FOR SELECT
  USING (
    collaborator_id IN (
      SELECT id FROM public.collaborators 
      WHERE user_id = auth.uid()
    )
    OR has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "package_recipients_insert_n2"
  ON public.planning_package_recipients FOR INSERT
  WITH CHECK (has_min_global_role(auth.uid(), 2));

CREATE POLICY "package_recipients_update_own"
  ON public.planning_package_recipients FOR UPDATE
  USING (
    collaborator_id IN (
      SELECT id FROM public.collaborators 
      WHERE user_id = auth.uid()
    )
    OR has_min_global_role(auth.uid(), 2)
  );

CREATE POLICY "package_recipients_delete_n2"
  ON public.planning_package_recipients FOR DELETE
  USING (has_min_global_role(auth.uid(), 2));