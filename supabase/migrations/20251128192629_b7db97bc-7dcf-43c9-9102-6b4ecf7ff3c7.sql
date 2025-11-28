-- Migration: Add global_role and enabled_modules columns to profiles
-- This is part of the V2.0 permissions system refactoring
-- These columns are nullable to allow progressive migration

-- Add global_role column (enum type for the hierarchical role)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'global_role') THEN
    CREATE TYPE public.global_role AS ENUM (
      'base_user',
      'franchisee_user', 
      'franchisee_admin',
      'franchisor_user',
      'franchisor_admin',
      'platform_admin',
      'superadmin'
    );
  END IF;
END $$;

-- Add columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS global_role public.global_role DEFAULT NULL;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS enabled_modules jsonb DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.global_role IS 'V2.0 - Rôle global unique de l''utilisateur (hiérarchie N0-N6)';
COMMENT ON COLUMN public.profiles.enabled_modules IS 'V2.0 - Modules activés pour l''utilisateur (JSONB avec options par module)';

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_global_role ON public.profiles(global_role) WHERE global_role IS NOT NULL;