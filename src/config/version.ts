export const APP_VERSION = '0.7.7';
export const APP_CODENAME = 'Audit complet Support Live';

/**
 * Changelog v0.7.7 (2025-12-07)
 * =============================
 * 
 * AUDIT COMPLET SUPPORT LIVE CHAT
 * --------------------------------
 * 
 * 1. Correction conversion chat → ticket
 *    - Type ticket correctement défini à 'ticket' (non 'chat_human')
 *    - Liaison converted_ticket_id dans live_support_sessions
 *    - Statut session mis à 'converted' après conversion
 * 
 * 2. Abonnement Realtime côté client
 *    - useLiveSupportSession écoute status='converted'
 *    - Fermeture automatique du chat côté client après conversion
 *    - Reset de l'état local (sessionId, messages)
 * 
 * 3. Bouton Fermer fonctionnel
 *    - onClose prop propagé depuis GlobalLiveSupportManager
 *    - onClose prop propagé depuis AiInlineResult
 *    - Reset état local avant appel onClose
 * 
 * 4. UI Console Support icônes seules
 *    - Onglets Live/Actifs/Archives → icônes uniquement
 *    - Onglets En cours/Archives sessions → icônes uniquement
 *    - Tooltips via attribut title
 * 
 * 5. Workflow unifié SU ↔ Client
 *    - Agent ferme avec "Convertir en ticket" → ticket créé
 *    - Client voit notification "Session convertie en ticket"
 *    - Chat se ferme automatiquement côté client
 *    - Ticket visible dans "Actifs" console support
 * 
 * CORRECTIONS PRÉCÉDENTES (v0.7.x)
 * ---------------------------------
 * - Correction RLS live_support_sessions
 * - Création automatique session côté client
 * - Badge "nouveau message" temps réel
 * - Validation Zod conversations chatbot
 */
