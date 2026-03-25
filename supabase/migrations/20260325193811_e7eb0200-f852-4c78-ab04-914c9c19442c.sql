
INSERT INTO plan_tier_modules (tier_key, module_key, enabled)
VALUES
  ('STARTER', 'organisation.plannings', true),
  ('PRO',     'organisation.plannings', true),
  ('STARTER', 'organisation.zones', true),
  ('PRO',     'organisation.zones', true),
  ('STARTER', 'pilotage.performance', true),
  ('PRO',     'pilotage.performance', true),
  ('PRO',     'pilotage.rentabilite', true),
  ('STARTER', 'ticketing.liste', true),
  ('PRO',     'ticketing.liste', true)
ON CONFLICT (tier_key, module_key) DO UPDATE SET enabled = true;
