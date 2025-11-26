-- Add service competencies to profiles
-- This allows a support user to have different levels/roles for different services

-- For now, support_level remains for Apogee (N1/N2/N3)
-- We add a JSONB field to store competencies for other services

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS service_competencies JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.service_competencies IS 
'Stores service-specific competencies. Example: {"apogee": true, "helpconfort": "animateur_reseau", "apporteurs": true}';

-- The support_level field is kept for backward compatibility and represents Apogee level
COMMENT ON COLUMN public.profiles.support_level IS 
'Support level for Apogee service only (1=N1 basic, 2=N2 technical, 3=N3 developer). For other services, see service_competencies.';