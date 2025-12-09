-- Ajouter les templates de widgets pour Techniciens et Assistantes
INSERT INTO widget_templates (id, name, description, type, module_source, icon, min_width, min_height, default_width, default_height, min_global_role, required_modules, default_params, is_system)
VALUES 
  (
    gen_random_uuid(),
    'Mes KPIs Technicien',
    'Vos statistiques personnelles: CA du mois, dossiers traités, interventions, heures travaillées',
    'kpi',
    'Personal.technicien_kpis',
    'Wrench',
    2,
    2,
    3,
    2,
    1,
    '["pilotage_agence"]',
    '{}',
    true
  ),
  (
    gen_random_uuid(),
    'Mes KPIs Assistante',
    'Vos statistiques personnelles: devis créés, factures créées, dossiers créés, RDV planifiés',
    'kpi',
    'Personal.assistante_kpis',
    'FileText',
    2,
    2,
    3,
    2,
    1,
    '["pilotage_agence"]',
    '{}',
    true
  );