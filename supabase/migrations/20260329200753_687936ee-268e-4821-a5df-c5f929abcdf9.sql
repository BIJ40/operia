-- Migration 1: Drop legacy enabled_modules column from profiles
-- Verified: 0 rows have non-empty enabled_modules data
-- No RLS policies or SQL functions reference this column

ALTER TABLE public.profiles DROP COLUMN IF EXISTS enabled_modules;