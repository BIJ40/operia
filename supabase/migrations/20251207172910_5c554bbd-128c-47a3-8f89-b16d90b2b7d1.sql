-- Widget Templates: définitions des widgets disponibles
CREATE TABLE public.widget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('kpi', 'chart', 'list', 'table', 'custom', 'alerts')),
  module_source TEXT NOT NULL,
  icon TEXT DEFAULT 'LayoutGrid',
  min_width INTEGER DEFAULT 2,
  min_height INTEGER DEFAULT 2,
  default_width INTEGER DEFAULT 4,
  default_height INTEGER DEFAULT 4,
  min_global_role INTEGER DEFAULT 0,
  required_modules JSONB DEFAULT '[]'::jsonb,
  default_params JSONB DEFAULT '{}'::jsonb,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Widgets: instances de widgets par utilisateur
CREATE TABLE public.user_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.widget_templates(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 4,
  height INTEGER NOT NULL DEFAULT 4,
  state TEXT NOT NULL DEFAULT 'normal' CHECK (state IN ('normal', 'minimized', 'maximized')),
  user_params JSONB DEFAULT '{}'::jsonb,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, user_id)
);

-- User Dashboard Settings
CREATE TABLE public.user_dashboard_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  grid_cols INTEGER DEFAULT 24,
  grid_rows INTEGER DEFAULT 16,
  auto_arrange BOOLEAN DEFAULT true,
  theme_variant TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.widget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dashboard_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for widget_templates (read by all authenticated, write by admins)
CREATE POLICY "Authenticated users can view widget templates"
ON public.widget_templates FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage widget templates"
ON public.widget_templates FOR ALL
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

-- RLS Policies for user_widgets (users manage their own)
CREATE POLICY "Users can view their own widgets"
ON public.user_widgets FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own widgets"
ON public.user_widgets FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own widgets"
ON public.user_widgets FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own widgets"
ON public.user_widgets FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for user_dashboard_settings
CREATE POLICY "Users can view their own dashboard settings"
ON public.user_dashboard_settings FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own dashboard settings"
ON public.user_dashboard_settings FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_widget_templates_updated_at
BEFORE UPDATE ON public.widget_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_widgets_updated_at
BEFORE UPDATE ON public.user_widgets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_dashboard_settings_updated_at
BEFORE UPDATE ON public.user_dashboard_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system widget templates
INSERT INTO public.widget_templates (name, description, type, module_source, icon, min_width, min_height, default_width, default_height, min_global_role, required_modules, is_system) VALUES
-- KPIs
('CA du mois', 'Chiffre d''affaires du mois en cours', 'kpi', 'StatIA.ca_global_ht', 'TrendingUp', 2, 2, 3, 2, 0, '["pilotage_agence"]', true),
('Taux SAV', 'Taux de service après-vente global', 'kpi', 'StatIA.taux_sav_global', 'Wrench', 2, 2, 3, 2, 0, '["pilotage_agence"]', true),
('Dossiers reçus', 'Nombre de dossiers reçus ce mois', 'kpi', 'StatIA.nb_dossiers_crees', 'FolderOpen', 2, 2, 3, 2, 0, '["pilotage_agence"]', true),
-- Charts
('CA par technicien', 'Répartition du CA par technicien', 'chart', 'StatIA.ca_par_technicien', 'BarChart3', 4, 3, 6, 4, 0, '["pilotage_agence"]', true),
('CA par univers', 'Répartition du CA par univers métier', 'chart', 'StatIA.ca_par_univers', 'PieChart', 4, 3, 6, 4, 0, '["pilotage_agence"]', true),
-- Lists
('Derniers tickets', 'Les 10 derniers tickets support', 'list', 'Support.recent_tickets', 'Ticket', 4, 3, 6, 5, 0, '["support"]', true),
('Mes demandes RH', 'Mes demandes de documents RH en cours', 'list', 'RH.mes_demandes', 'FileText', 4, 2, 5, 4, 0, '["rh"]', true),
-- Alerts
('Alertes maintenance', 'Échéances de maintenance à venir', 'alerts', 'Maintenance.echeances', 'AlertTriangle', 4, 2, 6, 3, 0, '[]', true),
('Tickets en attente', 'Tickets nécessitant une action', 'alerts', 'Tickets.pending', 'Clock', 4, 2, 6, 3, 0, '["apogee_tickets"]', true);