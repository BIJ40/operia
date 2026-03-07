
-- Restaurer l'override aide.agent pour Valentin Mairesse (supprimé par erreur)
INSERT INTO user_modules (user_id, module_key, options, enabled_at)
VALUES ('3ef9eaf2-eb26-4c41-8556-04b0e6d155fd', 'aide', '{"agent": true, "user": true}'::jsonb, now());
