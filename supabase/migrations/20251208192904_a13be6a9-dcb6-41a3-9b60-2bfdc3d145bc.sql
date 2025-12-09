-- Create feature_flags table
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text UNIQUE NOT NULL,
  module_label text NOT NULL,
  module_group text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read flags
CREATE POLICY "Authenticated users can read feature flags"
ON public.feature_flags
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only N5+ can manage flags
CREATE POLICY "N5+ can manage feature flags"
ON public.feature_flags
FOR ALL
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

-- Trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial modules
INSERT INTO public.feature_flags (module_key, module_label, module_group, is_enabled, description, display_order) VALUES
-- RH Modules
('rh.mon-coffre-rh', 'Mon Coffre RH', 'rh', true, 'Coffre-fort digital personnel du salarié', 1),
('rh.faire-demande', 'Faire une demande', 'rh', false, 'Formulaire de demande de document RH', 2),
('rh.mon-equipe', 'Mon équipe', 'rh', true, 'Gestion des collaborateurs de l''agence', 3),
('rh.demandes-rh', 'Demandes RH', 'rh', false, 'Traitement des demandes de documents', 4),
('rh.dashboard-rh', 'Dashboard RH', 'rh', true, 'Tableau de bord RH dirigeant', 5),
('rh.validation-plannings', 'Validation plannings', 'rh', true, 'Validation des plannings signés', 6),
-- Pilotage Modules
('pilotage.vue-ensemble', 'Vue d''ensemble', 'pilotage', true, 'Dashboard principal de l''agence', 1),
('pilotage.mon-ca', 'Mon CA', 'pilotage', true, 'Suivi du chiffre d''affaires', 2),
('pilotage.mes-univers', 'Mes Univers', 'pilotage', true, 'Statistiques par univers métier', 3),
('pilotage.mes-apporteurs', 'Mes Apporteurs', 'pilotage', true, 'Statistiques par apporteur', 4),
('pilotage.mes-sav', 'Mes SAV', 'pilotage', true, 'Suivi des SAV', 5),
('pilotage.diffusion', 'Diffusion', 'pilotage', true, 'Écran de diffusion agence', 6),
('pilotage.actions-mener', 'Actions à mener', 'pilotage', true, 'Liste des actions opérationnelles', 7),
-- Support Modules
('support.mes-demandes', 'Mes demandes', 'support', true, 'Historique des tickets utilisateur', 1),
('support.helpcenter', 'Centre d''aide', 'support', true, 'Base de connaissances et FAQ', 2),
-- Academy Modules
('academy.apogee', 'Apogée', 'academy', true, 'Documentation Apogée', 1),
('academy.helpconfort', 'HelpConfort', 'academy', true, 'Documentation HelpConfort', 2),
('academy.apporteurs', 'Apporteurs', 'academy', true, 'Documentation Apporteurs', 3),
-- Réseau Modules
('reseau.agences', 'Agences', 'reseau', true, 'Liste des agences du réseau', 1),
('reseau.utilisateurs', 'Utilisateurs', 'reseau', true, 'Gestion des utilisateurs réseau', 2),
('reseau.tableaux', 'Tableaux', 'reseau', true, 'Statistiques réseau', 3),
('reseau.comparatif', 'Comparatif', 'reseau', true, 'Comparatif inter-agences', 4),
-- Commercial Modules
('commercial.pptx', 'Générateur PPTX', 'commercial', true, 'Génération de présentations commerciales', 1);