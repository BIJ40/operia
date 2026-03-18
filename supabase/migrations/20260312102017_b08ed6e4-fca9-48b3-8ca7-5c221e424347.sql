-- Ajouter pilotage.statistiques dans plan_tier_modules pour STARTER et PRO
-- (manquant après suppression de l'ancienne clé 'stats')
INSERT INTO plan_tier_modules (module_key, tier_key, enabled, options_override)
VALUES 
  ('pilotage.statistiques', 'STARTER', true, '{}'),
  ('pilotage.statistiques', 'PRO', true, '{}')
ON CONFLICT (module_key, tier_key) DO NOTHING;

-- Ajouter aussi commercial.realisations (manquant historiquement)
INSERT INTO plan_tier_modules (module_key, tier_key, enabled, options_override)
VALUES 
  ('commercial.realisations', 'STARTER', true, '{}'),
  ('commercial.realisations', 'PRO', true, '{}')
ON CONFLICT (module_key, tier_key) DO NOTHING;