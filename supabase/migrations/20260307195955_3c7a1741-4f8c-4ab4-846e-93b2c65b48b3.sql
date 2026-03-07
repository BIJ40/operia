INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES
  ('aide.agent',                  'Agent',        'aide',              'feature', 2, true, 'STARTER', 0),
  ('admin_plateforme.users',      'Utilisateurs', 'admin_plateforme',  'feature', 1, true, 'PRO', 5),
  ('admin_plateforme.agencies',   'Agences',      'admin_plateforme',  'feature', 2, true, 'PRO', 5),
  ('admin_plateforme.permissions','Permissions',  'admin_plateforme',  'feature', 3, true, 'PRO', 5),
  ('guides.edition',              'Édition',      'guides',            'feature', 5, true, 'PRO', 5)
ON CONFLICT (key) DO NOTHING;