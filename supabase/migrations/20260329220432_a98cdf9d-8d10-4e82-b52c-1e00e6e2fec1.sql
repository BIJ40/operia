UPDATE module_distribution_rules
SET via_agency_option = true
WHERE module_key IN (
  SELECT key FROM module_catalog
  WHERE is_deployed = true
    AND is_core = false
    AND node_type IN ('screen', 'feature')
);