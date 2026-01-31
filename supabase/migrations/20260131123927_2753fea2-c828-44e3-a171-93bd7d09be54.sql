-- CLEANUP LEGACY DOCUMENT TABLES (with CASCADE)

-- Drop functions with CASCADE to remove dependent triggers
DROP FUNCTION IF EXISTS sync_collaborator_doc_to_media() CASCADE;
DROP FUNCTION IF EXISTS sync_admin_doc_to_media() CASCADE;
DROP FUNCTION IF EXISTS search_collaborator_documents(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS update_document_search_vector() CASCADE;

-- Drop tables
DROP TABLE IF EXISTS document_access_logs CASCADE;
DROP TABLE IF EXISTS collaborator_document_folders CASCADE;
DROP TABLE IF EXISTS collaborator_documents CASCADE;