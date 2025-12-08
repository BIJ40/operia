-- Add shortcut widgets for quick access based on user permissions
INSERT INTO widget_templates (name, description, type, module_source, icon, min_width, min_height, default_width, default_height, min_global_role, required_modules, default_params, is_system)
VALUES 
  -- Raccourcis Help Academy (N0+)
  ('Guide Apogée', 'Accès rapide au guide Apogée', 'custom', 'Shortcut.guide_apogee', 'BookOpen', 1, 1, 1, 1, 0, '["help_academy"]'::jsonb, '{"route": "/help-academy/apogee"}', true),
  ('Guide HelpConfort', 'Accès rapide au guide HelpConfort', 'custom', 'Shortcut.guide_helpconfort', 'BookMarked', 1, 1, 1, 1, 0, '["help_academy"]'::jsonb, '{"route": "/help-academy/helpconfort"}', true),
  
  -- Raccourcis Support (N0+)
  ('Mes demandes', 'Accès rapide à mes demandes support', 'custom', 'Shortcut.mes_demandes', 'MessageSquare', 1, 1, 1, 1, 0, '["support"]'::jsonb, '{"route": "/support/mes-demandes"}', true),
  ('Centre d''aide', 'Accès rapide au centre d''aide', 'custom', 'Shortcut.helpcenter', 'HelpCircle', 1, 1, 1, 1, 0, '["support"]'::jsonb, '{"route": "/support/helpcenter"}', true),
  
  -- Raccourcis RH (N2+)
  ('Mon équipe', 'Accès rapide à la gestion d''équipe', 'custom', 'Shortcut.mon_equipe', 'Users', 1, 1, 1, 1, 2, '["rh"]'::jsonb, '{"route": "/hc-agency/equipe"}', true),
  ('Demandes RH', 'Accès rapide aux demandes RH', 'custom', 'Shortcut.demandes_rh', 'FileText', 1, 1, 1, 1, 2, '["rh"]'::jsonb, '{"route": "/hc-agency/demandes-rh"}', true),
  ('Mon Coffre RH', 'Accès rapide à mon coffre RH personnel', 'custom', 'Shortcut.coffre_rh', 'Lock', 1, 1, 1, 1, 0, '["rh"]'::jsonb, '{"route": "/mon-coffre-rh"}', true),
  
  -- Raccourcis Pilotage Agence (N2+)
  ('Pilotage Agence', 'Accès rapide au pilotage agence', 'custom', 'Shortcut.pilotage', 'BarChart3', 1, 1, 1, 1, 2, '["pilotage_agence"]'::jsonb, '{"route": "/hc-agency"}', true),
  ('Diffusion', 'Accès rapide à l''écran de diffusion', 'custom', 'Shortcut.diffusion', 'Monitor', 1, 1, 1, 1, 2, '["pilotage_agence"]'::jsonb, '{"route": "/diffusion"}', true),
  
  -- Raccourcis Gestion de Projet (N0+ avec module)
  ('Gestion de Projet', 'Accès rapide au kanban Apogée', 'custom', 'Shortcut.gestion_projet', 'Kanban', 1, 1, 1, 1, 0, '["apogee_tickets"]'::jsonb, '{"route": "/apogee-tickets"}', true),
  
  -- Raccourcis Franchiseur (N3+)
  ('Espace Franchiseur', 'Accès rapide à l''espace réseau', 'custom', 'Shortcut.reseau', 'Building2', 1, 1, 1, 1, 3, '["reseau_franchiseur"]'::jsonb, '{"route": "/hc-reseau"}', true),
  ('Gestion Agences', 'Accès rapide à la gestion des agences', 'custom', 'Shortcut.agences', 'MapPin', 1, 1, 1, 1, 3, '["reseau_franchiseur"]'::jsonb, '{"route": "/hc-reseau/agences"}', true),
  
  -- Raccourcis Admin (N5+)
  ('Administration', 'Accès rapide à l''administration', 'custom', 'Shortcut.admin', 'Settings', 1, 1, 1, 1, 5, '["admin_plateforme"]'::jsonb, '{"route": "/admin"}', true),
  ('Gestion Utilisateurs', 'Accès rapide à la gestion des utilisateurs', 'custom', 'Shortcut.utilisateurs', 'UserCog', 1, 1, 1, 1, 5, '["admin_plateforme"]'::jsonb, '{"route": "/admin/utilisateurs"}', true);