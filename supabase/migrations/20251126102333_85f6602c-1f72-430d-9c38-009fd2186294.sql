-- Ajouter le champ de préférence de notifications email dans la table profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN profiles.email_notifications_enabled IS 'Permet aux utilisateurs support de désactiver les notifications email des tickets';