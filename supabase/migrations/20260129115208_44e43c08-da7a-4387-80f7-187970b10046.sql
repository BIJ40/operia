-- Reset plan_tier_modules with new module structure
-- All modules enabled for both STARTER and PRO by default (user will adjust via UI)

DELETE FROM plan_tier_modules;

-- STARTER (Basique) - tous les modules activés par défaut
INSERT INTO plan_tier_modules (tier_key, module_key, enabled, options_override) VALUES
('STARTER', 'agence', true, '{"indicateurs": true, "actions_a_mener": true, "diffusion": true}'),
('STARTER', 'stats', true, '{"stats_hub": true, "exports": true}'),
('STARTER', 'rh', true, '{"rh_viewer": true, "rh_admin": false}'),
('STARTER', 'parc', true, '{"vehicules": true, "epi": true, "equipements": true}'),
('STARTER', 'divers_apporteurs', true, '{"consulter": true, "gerer": true}'),
('STARTER', 'divers_plannings', true, '{}'),
('STARTER', 'divers_reunions', true, '{}'),
('STARTER', 'divers_documents', true, '{}'),
('STARTER', 'guides', true, '{"apogee": true, "apporteurs": true, "helpconfort": true, "faq": true}'),
('STARTER', 'ticketing', true, '{"kanban": true, "create": true, "manage": true, "import": false}'),
('STARTER', 'aide', true, '{"user": true, "agent": false}');

-- PRO - tous les modules activés par défaut (copie de STARTER)
INSERT INTO plan_tier_modules (tier_key, module_key, enabled, options_override) VALUES
('PRO', 'agence', true, '{"indicateurs": true, "actions_a_mener": true, "diffusion": true}'),
('PRO', 'stats', true, '{"stats_hub": true, "exports": true}'),
('PRO', 'rh', true, '{"rh_viewer": true, "rh_admin": true}'),
('PRO', 'parc', true, '{"vehicules": true, "epi": true, "equipements": true}'),
('PRO', 'divers_apporteurs', true, '{"consulter": true, "gerer": true}'),
('PRO', 'divers_plannings', true, '{}'),
('PRO', 'divers_reunions', true, '{}'),
('PRO', 'divers_documents', true, '{}'),
('PRO', 'guides', true, '{"apogee": true, "apporteurs": true, "helpconfort": true, "faq": true}'),
('PRO', 'ticketing', true, '{"kanban": true, "create": true, "manage": true, "import": true}'),
('PRO', 'aide', true, '{"user": true, "agent": true}');