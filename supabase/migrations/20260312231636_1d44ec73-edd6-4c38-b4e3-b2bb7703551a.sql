-- Ajouter les 4 clés pilotage manquantes dans plan_tier_modules
-- Performance: accessible STARTER + PRO
-- Actions, Devis acceptés, Incohérences: PRO uniquement

INSERT INTO plan_tier_modules (tier_key, module_key, enabled)
VALUES
  ('STARTER', 'pilotage.performance', true),
  ('STARTER', 'pilotage.actions_a_mener', false),
  ('STARTER', 'pilotage.devis_acceptes', false),
  ('STARTER', 'pilotage.incoherences', false),
  ('PRO', 'pilotage.performance', true),
  ('PRO', 'pilotage.actions_a_mener', true),
  ('PRO', 'pilotage.devis_acceptes', true),
  ('PRO', 'pilotage.incoherences', true)
ON CONFLICT (tier_key, module_key) DO UPDATE SET enabled = EXCLUDED.enabled;