CREATE OR REPLACE FUNCTION public.get_fk_dependencies()
RETURNS TABLE(child_table text, parent_table text, fk_column text, ref_column text) AS $$
  SELECT
    tc.table_name::text AS child_table,
    ccu.table_name::text AS parent_table,
    kcu.column_name::text AS fk_column,
    ccu.column_name::text AS ref_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
$$ LANGUAGE sql SECURITY DEFINER;