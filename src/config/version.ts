export const APP_VERSION = '0.7.8';
export const APP_CODENAME = 'Live Support & FAQ Integration';

/**
 * Changelog v0.7.8 (2025-12-08)
 * =============================
 * 
 * LIVE SUPPORT AMÉLIORATIONS
 * ---------------------------
 * 
 * 1. Context partagé LiveSupportContext
 *    - État centralisé pour session/dialog/messages
 *    - Synchronisation Indicator ↔ ChatDialog
 *    - Bouton "En attente..." fonctionnel
 * 
 * 2. Notifications temps réel corrigées
 *    - Écoute DELETE en plus de INSERT/UPDATE
 *    - Badge "Live" = sessions en attente uniquement
 *    - Mise à jour instantanée du compteur
 * 
 * TICKETS → FAQ
 * --------------
 * 
 * 3. Reformulation IA des tickets résolus
 *    - Edge function reformulate-ticket-faq
 *    - Gemini 2.5 Flash via Lovable AI Gateway
 *    - Extraction question/réponse structurée
 * 
 * 4. Ajout direct à la FAQ
 *    - Dialog TicketToFaqDialog
 *    - Sélection catégorie et contexte
 *    - Publication immédiate ou brouillon
 * 
 * CORRECTIONS PRÉCÉDENTES (v0.7.7)
 * ---------------------------------
 * - Conversion chat → ticket type correct
 * - Abonnement Realtime status='converted'
 * - Bouton Fermer fonctionnel
 * - UI Console Support icônes seules
 */
