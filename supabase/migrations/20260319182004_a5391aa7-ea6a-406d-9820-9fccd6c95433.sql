
-- Ajout des modules manquants dans plan_tier_modules
-- Ticketing EXCLU (opt-in individuel), Admin EXCLU (bypass N5+), Réseau EXCLU (rôle N3+)
INSERT INTO plan_tier_modules (tier_key, module_key, enabled)
VALUES
  -- STARTER: parents navigation + fonctionnalités de base
  ('STARTER', 'accueil', true),
  ('STARTER', 'commercial', true),
  ('STARTER', 'organisation', true),
  ('STARTER', 'pilotage', true),
  ('STARTER', 'mediatheque', true),
  ('STARTER', 'support', true),
  ('STARTER', 'support.faq', true),
  ('STARTER', 'mediatheque.consulter', true),
  -- PRO: idem + exports stats
  ('PRO', 'accueil', true),
  ('PRO', 'commercial', true),
  ('PRO', 'organisation', true),
  ('PRO', 'pilotage', true),
  ('PRO', 'mediatheque', true),
  ('PRO', 'support', true),
  ('PRO', 'support.faq', true),
  ('PRO', 'mediatheque.consulter', true),
  ('PRO', 'pilotage.statistiques.exports', true)
ON CONFLICT (tier_key, module_key) DO NOTHING;
