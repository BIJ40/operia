INSERT INTO module_distribution_rules (module_key, via_plan, via_agency_option, via_user_assignment, assignable_by_scope)
VALUES
  ('support.guides.apogee', false, false, true, 'both'),
  ('support.guides.apporteurs', false, false, true, 'both'),
  ('support.guides.helpconfort', false, false, true, 'both')
ON CONFLICT (module_key) DO UPDATE SET
  via_plan = EXCLUDED.via_plan,
  via_agency_option = EXCLUDED.via_agency_option,
  via_user_assignment = EXCLUDED.via_user_assignment,
  assignable_by_scope = EXCLUDED.assignable_by_scope;