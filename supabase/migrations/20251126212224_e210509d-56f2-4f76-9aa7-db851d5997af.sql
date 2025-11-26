-- Extend apogee_agencies table with additional agency information
ALTER TABLE public.apogee_agencies
ADD COLUMN IF NOT EXISTS date_ouverture date,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS animateur_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS adresse text,
ADD COLUMN IF NOT EXISTS ville text,
ADD COLUMN IF NOT EXISTS code_postal text;

-- Create index on animateur_id for faster queries
CREATE INDEX IF NOT EXISTS idx_apogee_agencies_animateur ON public.apogee_agencies(animateur_id);

-- Comment on new columns
COMMENT ON COLUMN public.apogee_agencies.date_ouverture IS 'Date d''ouverture de l''agence';
COMMENT ON COLUMN public.apogee_agencies.contact_email IS 'Email de contact de l''agence';
COMMENT ON COLUMN public.apogee_agencies.contact_phone IS 'Téléphone de contact de l''agence';
COMMENT ON COLUMN public.apogee_agencies.animateur_id IS 'Animateur réseau rattaché à cette agence';
COMMENT ON COLUMN public.apogee_agencies.adresse IS 'Adresse complète de l''agence';
COMMENT ON COLUMN public.apogee_agencies.ville IS 'Ville de l''agence';
COMMENT ON COLUMN public.apogee_agencies.code_postal IS 'Code postal de l''agence';