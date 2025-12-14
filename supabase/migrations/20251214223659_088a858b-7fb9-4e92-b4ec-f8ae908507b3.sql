-- Enrichir planning_signatures pour le workflow bidirectionnel
ALTER TABLE planning_signatures 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sent_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS tech_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tech_signature_png TEXT;

-- Commentaires
COMMENT ON COLUMN planning_signatures.sent_at IS 'Date envoi par N2 au technicien';
COMMENT ON COLUMN planning_signatures.sent_by_user_id IS 'N2 qui a envoyé le planning';
COMMENT ON COLUMN planning_signatures.tech_signed_at IS 'Date signature par le technicien';
COMMENT ON COLUMN planning_signatures.tech_signature_png IS 'Signature PNG base64 du technicien';