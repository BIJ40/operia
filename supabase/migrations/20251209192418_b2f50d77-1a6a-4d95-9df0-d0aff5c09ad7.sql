-- Ajouter le widget "Top 3 Techniciens" pour les N2+
INSERT INTO widget_templates (
  id,
  name,
  description,
  type,
  module_source,
  icon,
  min_width,
  min_height,
  default_width,
  default_height,
  min_global_role,
  required_modules,
  default_params,
  is_system
) VALUES (
  gen_random_uuid(),
  'Top 3 Techniciens',
  'Classement des 3 meilleurs techniciens par CA du mois en cours',
  'chart',
  'StatIA.top3_techniciens',
  'Trophy',
  3,
  4,
  4,
  5,
  2,
  '["pilotage_agence"]'::jsonb,
  '{}'::jsonb,
  true
);