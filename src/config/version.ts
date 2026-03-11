export const APP_VERSION = '0.9.6';
export const APP_CODENAME = 'Phase 4 — Audit & Plan de migration Permissions';

/**
 * Changelog v0.8.7 (2026-01-31)
 * ==============================
 * 
 * CONSOLIDATION MÉDIATHÈQUE
 * -------------------------
 * - MediaLibraryPortal : composant Finder intégrable
 * - useScopedMediaLibrary : hook vue restreinte
 * - Documents RH salariés → Médiathèque (/rh/salaries/{id})
 * 
 * NETTOYAGE LEGACY
 * ----------------
 * - Suppression tables: collaborator_documents, folders, access_logs
 * - Suppression 19 composants legacy documents RH
 * - Suppression 5 hooks legacy documents
 * - Refactoring RHDocumentManager → MediaLibraryPortal
 * 
 * PRÉCÉDENT (v0.8.6 - 2026-01-29)
 * --------------------------------
 * - Audit Sécurité RLS
 * - Versioning auto-refresh
 */
