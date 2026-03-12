-- 1. Supprimer le doublon support.ticketing
DELETE FROM module_registry WHERE key = 'support.ticketing';

-- 2. Reparenter ticketing sous support, type module (bleu)
UPDATE module_registry SET parent_key = 'support', node_type = 'module' WHERE key = 'ticketing';

-- 3. Ajouter ticketing.liste (page Liste existante dans le code)
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES ('ticketing.liste', 'Liste', 'ticketing', 'screen', 5, true, 'STARTER', 0);

-- 4. Supprimer pilotage.agence (ne correspond à aucune page réelle)
DELETE FROM module_registry WHERE key = 'pilotage.agence';

-- 5. Restaurer les 3 modules dev (is_deployed = false)
UPDATE module_registry SET is_deployed = false WHERE key IN ('ticketing.import', 'organisation.reunions', 'pilotage.performance');

-- 6. Insérer les 2 modules manquants
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES 
  ('planning_augmente', 'Planification Augmentée', NULL, 'module', 70, false, 'PRO', 2),
  ('organisation.docgen', 'DocGen', 'organisation', 'section', 60, false, 'PRO', 2);