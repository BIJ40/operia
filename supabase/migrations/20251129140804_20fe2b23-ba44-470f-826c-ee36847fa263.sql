-- Drop the legacy function with CASCADE to remove dependent trigger
DROP FUNCTION IF EXISTS public.assign_admin_to_first_user() CASCADE;