-- Ajouter le widget Favoris accessible à tous
INSERT INTO public.widget_templates (
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
  'Mes Favoris',
  'Accès rapide à vos pages favorites',
  'list',
  'Core.favoris',
  'Star',
  2,
  2,
  4,
  3,
  0,
  '{}',
  '{}',
  true
);