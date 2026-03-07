-- Ajout de reseau_franchiseur (sort_order 80)
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES
  ('reseau_franchiseur', 'Réseau Franchiseur', NULL, 'section', 80, true, 'PRO', 3);

-- Enfants reseau_franchiseur
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES
  ('reseau_franchiseur.dashboard',   'Dashboard',    'reseau_franchiseur', 'screen',  1, true,  'PRO', 3),
  ('reseau_franchiseur.stats',       'Stats',        'reseau_franchiseur', 'screen',  2, true,  'PRO', 3),
  ('reseau_franchiseur.agences',     'Agences',      'reseau_franchiseur', 'screen',  3, true,  'PRO', 3),
  ('reseau_franchiseur.redevances',  'Redevances',   'reseau_franchiseur', 'screen',  4, false, 'PRO', 4),
  ('reseau_franchiseur.comparatifs', 'Comparatifs',  'reseau_franchiseur', 'screen',  5, true,  'PRO', 3);

-- Ajout de admin_plateforme (sort_order 90)
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES
  ('admin_plateforme', 'Administration', NULL, 'section', 90, true, 'PRO', 5);