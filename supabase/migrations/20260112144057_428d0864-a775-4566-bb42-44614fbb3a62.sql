-- Supprimer les tables de messagerie interne
DROP TABLE IF EXISTS typing_status CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_members CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;