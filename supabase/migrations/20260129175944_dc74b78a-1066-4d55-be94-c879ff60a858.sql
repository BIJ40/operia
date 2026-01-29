-- Nettoyage complet et recréation des feature_flags alignés avec la navigation UI
-- Ordre: Onglets principaux → Sous-onglets → Options

DELETE FROM public.feature_flags;

-- ============================================
-- 1. AGENCE (Tab: Mon agence)
-- ============================================
INSERT INTO public.feature_flags (module_key, module_label, module_group, display_order, is_enabled, dev_status, description)
VALUES 
  ('agence', 'Mon Agence', '01_agence', 0, true, 'done', 'Onglet principal Mon Agence'),
  ('agence.indicateurs', 'Indicateurs', '01_agence', 1, true, 'done', 'KPIs et indicateurs clés'),
  ('agence.actions_a_mener', 'Actions à mener', '01_agence', 2, true, 'done', 'Liste des actions'),
  ('agence.diffusion', 'Diffusion TV', '01_agence', 3, true, 'done', 'Écran de diffusion'),
  ('agence.veille_apporteurs', 'Veille Apporteurs', '01_agence', 4, false, 'in_progress', 'Radar des apporteurs dormants/en déclin');

-- ============================================
-- 2. STATS (Tab: Statistiques)
-- ============================================
INSERT INTO public.feature_flags (module_key, module_label, module_group, display_order, is_enabled, dev_status, description)
VALUES 
  ('stats', 'Statistiques', '02_stats', 0, true, 'done', 'Onglet Statistiques'),
  ('stats.stats_hub', 'STATiA Hub', '02_stats', 1, true, 'done', 'Tableaux et graphiques avancés'),
  ('stats.exports', 'Exports', '02_stats', 2, true, 'done', 'Export des données');

-- ============================================
-- 3. RH (Tab: Salariés)
-- ============================================
INSERT INTO public.feature_flags (module_key, module_label, module_group, display_order, is_enabled, dev_status, description)
VALUES 
  ('rh', 'Salariés', '03_rh', 0, true, 'done', 'Onglet Salariés (RH)'),
  ('rh.rh_viewer', 'Gestionnaire RH', '03_rh', 1, true, 'done', 'Vue équipe'),
  ('rh.rh_admin', 'Admin RH', '03_rh', 2, true, 'done', 'Gestion complète'),
  ('rh.docgen', 'DocGen', '03_rh', 3, false, 'disabled', 'Génération de documents');

-- ============================================
-- 4. PARC (Tab: Parc)
-- ============================================
INSERT INTO public.feature_flags (module_key, module_label, module_group, display_order, is_enabled, dev_status, description)
VALUES 
  ('parc', 'Parc', '04_parc', 0, false, 'todo', 'Onglet Parc & Équipements'),
  ('parc.vehicules', 'Véhicules', '04_parc', 1, false, 'todo', 'Flotte véhicules'),
  ('parc.epi', 'EPI', '04_parc', 2, false, 'todo', 'Équipements de protection'),
  ('parc.equipements', 'Équipements', '04_parc', 3, false, 'todo', 'Autres équipements');

-- ============================================
-- 5. DIVERS (Tab: Divers avec sous-onglets)
-- ============================================
INSERT INTO public.feature_flags (module_key, module_label, module_group, display_order, is_enabled, dev_status, description)
VALUES 
  ('divers_apporteurs', 'Apporteurs', '05_divers', 0, true, 'done', 'Sous-onglet Apporteurs'),
  ('divers_apporteurs.consulter', 'Consulter', '05_divers', 1, true, 'done', 'Voir les apporteurs'),
  ('divers_apporteurs.gerer', 'Gérer', '05_divers', 2, true, 'done', 'Créer/modifier apporteurs'),
  ('divers_plannings', 'Plannings', '05_divers', 3, true, 'in_progress', 'Sous-onglet Plannings'),
  ('divers_reunions', 'Réunions', '05_divers', 4, true, 'in_progress', 'Sous-onglet Réunions'),
  ('divers_documents', 'Documents', '05_divers', 5, true, 'in_progress', 'Sous-onglet Documents');

-- ============================================
-- 6. GUIDES (Tab: Guides)
-- ============================================
INSERT INTO public.feature_flags (module_key, module_label, module_group, display_order, is_enabled, dev_status, description)
VALUES 
  ('guides', 'Guides', '06_guides', 0, true, 'done', 'Onglet Guides'),
  ('guides.apogee', 'Guide Apogée', '06_guides', 1, true, 'done', 'Documentation Apogée'),
  ('guides.helpconfort', 'Guide HelpConfort', '06_guides', 2, true, 'done', 'Documentation réseau'),
  ('guides.apporteurs', 'Guide Apporteurs', '06_guides', 3, true, 'done', 'Documentation apporteurs'),
  ('guides.edition', 'Édition', '06_guides', 4, true, 'done', 'Mode édition des guides');

-- ============================================
-- 7. TICKETING (Tab: Ticketing)
-- ============================================
INSERT INTO public.feature_flags (module_key, module_label, module_group, display_order, is_enabled, dev_status, description)
VALUES 
  ('ticketing', 'Ticketing', '07_ticketing', 0, true, 'done', 'Onglet Ticketing'),
  ('ticketing.kanban', 'Kanban', '07_ticketing', 1, true, 'done', 'Vue tableau Kanban'),
  ('ticketing.create', 'Créer', '07_ticketing', 2, true, 'done', 'Créer des tickets'),
  ('ticketing.manage', 'Gérer', '07_ticketing', 3, true, 'done', 'Modifier/supprimer tickets'),
  ('ticketing.import', 'Import', '07_ticketing', 4, true, 'done', 'Import Excel');

-- ============================================
-- 8. AIDE (Tab: Aide)
-- ============================================
INSERT INTO public.feature_flags (module_key, module_label, module_group, display_order, is_enabled, dev_status, description)
VALUES 
  ('aide', 'Aide', '08_aide', 0, true, 'done', 'Onglet Aide'),
  ('aide.faq', 'FAQ', '08_aide', 1, true, 'done', 'Questions fréquentes'),
  ('aide.helpi', 'Helpi', '08_aide', 2, true, 'done', 'Assistant IA'),
  ('aide.tickets', 'Mes demandes', '08_aide', 3, true, 'done', 'Tickets support utilisateur');

-- ============================================
-- 9. RÉSEAU FRANCHISEUR (Tab: Réseau)
-- ============================================
INSERT INTO public.feature_flags (module_key, module_label, module_group, display_order, is_enabled, dev_status, description)
VALUES 
  ('reseau_franchiseur', 'Réseau Franchiseur', '09_reseau', 0, true, 'done', 'Onglet Réseau (Équipe Réseau)'),
  ('reseau_franchiseur.dashboard', 'Dashboard', '09_reseau', 1, true, 'done', 'Vue d''ensemble réseau'),
  ('reseau_franchiseur.stats', 'Stats réseau', '09_reseau', 2, true, 'done', 'KPIs multi-agences'),
  ('reseau_franchiseur.agences', 'Agences', '09_reseau', 3, true, 'done', 'Liste des agences'),
  ('reseau_franchiseur.comparatifs', 'Comparatifs', '09_reseau', 4, true, 'done', 'Comparaisons inter-agences'),
  ('reseau_franchiseur.redevances', 'Redevances', '09_reseau', 5, true, 'in_progress', 'Calcul des redevances');

-- ============================================
-- 10. ADMINISTRATION (Tab: Admin)
-- ============================================
INSERT INTO public.feature_flags (module_key, module_label, module_group, display_order, is_enabled, dev_status, description)
VALUES 
  ('admin_plateforme', 'Administration', '10_admin', 0, true, 'done', 'Onglet Administration'),
  ('admin_plateforme.users', 'Utilisateurs', '10_admin', 1, true, 'done', 'Gestion des comptes'),
  ('admin_plateforme.agencies', 'Agences', '10_admin', 2, true, 'done', 'Configuration agences'),
  ('admin_plateforme.permissions', 'Permissions', '10_admin', 3, true, 'done', 'Droits et accès'),
  ('admin_plateforme.plans', 'Plans', '10_admin', 4, true, 'done', 'Gestion des plans'),
  ('admin_plateforme.logs', 'Logs', '10_admin', 5, true, 'done', 'Journaux d''activité'),
  ('admin_plateforme.feature_flags', 'Feature Flags', '10_admin', 6, true, 'done', 'Activation des modules');

-- ============================================
-- 11. RECHERCHE (Transversal)
-- ============================================
INSERT INTO public.feature_flags (module_key, module_label, module_group, display_order, is_enabled, dev_status, description)
VALUES 
  ('unified_search', 'Recherche unifiée', '11_transversal', 0, true, 'done', 'Barre de recherche globale'),
  ('unified_search.stats', 'Recherche Stats', '11_transversal', 1, true, 'done', 'Recherche dans STATiA'),
  ('unified_search.docs', 'Recherche Docs', '11_transversal', 2, true, 'done', 'Recherche documentaire');