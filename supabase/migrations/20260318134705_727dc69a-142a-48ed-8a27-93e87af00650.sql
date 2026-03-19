-- Add granular sub-modules under commercial.realisations
INSERT INTO module_registry (key, parent_key, label, node_type, is_deployed, required_plan, min_role, sort_order)
VALUES
  ('commercial.realisations.photos', 'commercial.realisations', 'Ajouter photos', 'feature', true, 'NONE', 1, 10),
  ('commercial.realisations.generer_avap', 'commercial.realisations', 'Générer visuel AV/AP', 'feature', true, 'NONE', 1, 20),
  ('commercial.realisations.onglet_avap', 'commercial.realisations', 'Onglet Avant/Après', 'feature', true, 'NONE', 1, 30),
  ('commercial.realisations.valider_envoyer', 'commercial.realisations', 'Valider & Envoyer', 'feature', true, 'NONE', 1, 40)
ON CONFLICT (key) DO NOTHING;

-- Enable all 4 for PRO plan
INSERT INTO plan_tier_modules (tier_key, module_key, enabled)
VALUES
  ('PRO', 'commercial.realisations.photos', true),
  ('PRO', 'commercial.realisations.generer_avap', true),
  ('PRO', 'commercial.realisations.onglet_avap', true),
  ('PRO', 'commercial.realisations.valider_envoyer', true)
ON CONFLICT (tier_key, module_key) DO NOTHING;