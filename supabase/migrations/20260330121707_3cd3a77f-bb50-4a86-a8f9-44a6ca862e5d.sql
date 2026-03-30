DELETE FROM plan_module_grants
WHERE module_key IN ('commercial', 'mediatheque', 'organisation', 'pilotage', 'relations', 'support')
AND module_key NOT IN (
  SELECT key FROM module_catalog WHERE node_type IN ('screen', 'feature')
);