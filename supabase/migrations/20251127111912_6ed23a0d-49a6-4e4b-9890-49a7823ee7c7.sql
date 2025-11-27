-- Remove animateur_id column from apogee_agencies
-- All animator assignments will now be managed via franchiseur_agency_assignments table
ALTER TABLE public.apogee_agencies DROP COLUMN IF EXISTS animateur_id;