CREATE OR REPLACE FUNCTION public.list_public_tables()
RETURNS TABLE(tablename text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tablename::text FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
$$;