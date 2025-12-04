/**
 * Configuration centralisée de l'historique des versions
 */

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'feature' | 'fix' | 'improvement' | 'security';
    description: string;
  }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'V0.6.4',
    date: '2025-12-04',
    title: 'Audits Pré-production Complets',
    changes: [
      { type: 'security', description: '✅ Audit Sécurité - RLS policies, JWT, rate limiting, CORS validés' },
      { type: 'security', description: '✅ Audit RAG/IA - prompts sécurisés, embeddings vérifiés, chunks nettoyés' },
      { type: 'improvement', description: '✅ Audit UX/Navigation - bg-white→bg-background (15+ fichiers), aria-label (20+ icônes)' },
      { type: 'improvement', description: '✅ Audit Qualité - terminologie "Gestion de Projet" unifiée' },
      { type: 'improvement', description: '✅ Audit Pré-prod - Error401/403/404, GlobalErrorBoundary, session handling validés' },
      { type: 'improvement', description: 'Suppression hooks legacy (useNetworkStats.ts, usePeriodComparison.ts)' },
    ]
  },
  {
    version: 'V0.6.3',
    date: '2025-12-04',
    title: 'Messagerie interne intra-agence',
    changes: [
      { type: 'feature', description: 'Système de messagerie instantanée interne entre collaborateurs d\'une même agence' },
      { type: 'feature', description: 'Widget messagerie intégré au header avec badge notifications non-lues' },
      { type: 'feature', description: 'Conversations privées (1:1) et groupes de discussion' },
      { type: 'feature', description: 'Widget chatbot "Aide en direct" intégré au header avec sélection de thèmes' },
      { type: 'improvement', description: 'Interface unifiée header : AIDE EN DIRECT (gauche) et MESSAGERIE INTERNE (droite)' },
      { type: 'improvement', description: 'Suppression de la bulle flottante chatbot au profit du widget header' },
      { type: 'improvement', description: 'Indicateurs temps réel de présence et messages non-lus' },
    ]
  },
  {
    version: 'V0.6.2',
    date: '2025-12-03',
    title: 'Audit Sécurité API Apogée & Conformité RGPD',
    changes: [
      { type: 'security', description: '🔍 AUDIT : Scan complet du code - clés API, appels directs, RLS, CORS, rate-limiting' },
      { type: 'security', description: '📋 PRÉCONISATIONS : Migration obligatoire vers proxy sécurisé, isolation agences, JWT systématique' },
      { type: 'security', description: '✅ ACTIONS : Création proxy-apogee Edge Function avec whitelist endpoints, rate-limit 30 req/min/user' },
      { type: 'security', description: '✅ ACTIONS : Suppression clé API hardcodée (SlideCATechniciens.tsx), migration vers apogeeProxy' },
      { type: 'security', description: '✅ ACTIONS : Migration complète networkDataService, useAgencyMonthlyCA, computeEngine vers proxy' },
      { type: 'security', description: '📊 RÉSULTAT : Score sécurité 60/100 → 95/100, 0 clé exposée côté client, 0 appel API direct' },
      { type: 'security', description: '📁 ÉTAT ACTUEL : Documentation SECURITY.md + SECURITY-AUDIT-REPORT.md générée (voir /docs)' },
      { type: 'improvement', description: 'Client TypeScript apogeeProxy.ts avec méthodes typées (getFactures, getProjects, getAllData...)' },
      { type: 'improvement', description: 'Logs structurés sans données sensibles, CORS hardened, validation Zod des inputs' },
    ]
  },
  {
    version: 'V0.6.1',
    date: '2025-12-03',
    title: 'Création du Module RH complet',
    changes: [
      { type: 'feature', description: 'Module RH (Ressources Humaines) - gestion complète des collaborateurs agence' },
      { type: 'feature', description: 'Fiches collaborateurs avec informations personnelles, contrats et historique salarial' },
      { type: 'feature', description: 'GED RH - Gestion Électronique des Documents par collaborateur' },
      { type: 'feature', description: 'Coffre-fort RH salarié (/mon-coffre-rh) - espace personnel de documents' },
      { type: 'feature', description: 'Workflow de demandes de documents RH avec suivi lu/non-lu et pièces jointes' },
      { type: 'feature', description: 'Synchronisation automatique Profil ↔ Collaborateur via triggers DB' },
      { type: 'improvement', description: 'Permissions RH 3 niveaux : coffre (salarié), rh_viewer (équipe), rh_admin (paie)' },
      { type: 'improvement', description: 'Tuile GED avec dropdown collaborateurs - accès direct aux documents' },
      { type: 'security', description: 'RLS strictes - isolation des données RH par agence et niveau d\'accès' },
    ]
  },
  {
    version: 'V0.6.0',
    date: '2025-12-02',
    title: 'STATiA By BiJ - Moteur de règles métier',
    changes: [
      { type: 'feature', description: 'Création du module STATiA By BiJ - moteur de règles centralisé pour calculs métier HelpConfort' },
      { type: 'feature', description: 'Règles CA : source apiGetFactures.data.totalHT, états inclus (sent/paid/partial), avoirs soustraits automatiquement' },
      { type: 'feature', description: 'Règles Techniciens : types productifs (dépannage/travaux), non-productifs (RT/SAV/diagnostic), allocation proportionnelle au temps' },
      { type: 'feature', description: 'Règles Devis : taux transformation en nombre ET montant HT, résolution diagnostique type2="A DEFINIR"' },
      { type: 'feature', description: 'Règles Interventions : états valides (validated/done/finished), résolution automatique RT/TH/SAV' },
      { type: 'feature', description: 'Règles Univers/Apporteurs : allocation multi-univers uniforme ou pondérée, exclusion SAV des stats apporteurs' },
      { type: 'feature', description: 'Parser NLP avec synonymes métier (commanditaire→apporteur, tvx→travaux, garantie→sav)' },
      { type: 'feature', description: 'GroupBy dynamique : technicien, apporteur, univers, type_intervention, mois, semaine, année, ville, client, dossier' },
      { type: 'improvement', description: 'Intégration règles dans useMetricEngine et compute-metric edge function' },
      { type: 'improvement', description: 'Export JSON rules.json pour backend et interprétation IA' },
      { type: 'improvement', description: 'Helpers métier : resolveInterventionType, isProductiveIntervention, calculateNetAmount, normalizeSynonym' },
      { type: 'feature', description: 'Menu IA unifié dans toolbar Kanban : K-LifIA (qualification), IA-IA (doublons), Auto-Classeur (modules)' },
      { type: 'feature', description: 'Auto-Classeur IA : classification automatique des tickets sans module (seuil confiance 85%)' },
      { type: 'feature', description: 'Batch review pour Auto-Classeur avec sélection multiple et application groupée' },
    ]
  },
  {
    version: 'V0.5.2',
    date: '2025-12-02',
    title: 'Détection doublons IA, Import TRAITÉ, Support SA levels',
    changes: [
      { type: 'feature', description: 'Détection doublons IA pour tickets Apogée avec fusion manuelle et scan global Kanban' },
      { type: 'feature', description: 'Bouton "Tout fusionner" pour fusion batch des doublons détectés' },
      { type: 'feature', description: 'Import TRAITÉ pour importer des tickets directement en statut EN_PROD (DONE)' },
      { type: 'feature', description: 'Système de tags tickets (BUG, EVO, NTH) avec filtre multi-sélection' },
      { type: 'feature', description: 'Niveaux Support Agent (SA1/SA2/SA3) avec interface admin dédiée' },
      { type: 'feature', description: 'Tile infos agence avec date ouverture et date clôture bilan' },
      { type: 'feature', description: 'KPI Recouvrement avec taux et montants (facturé, encaissé, reste)' },
      { type: 'improvement', description: 'Lien retour parent dans header pour navigation hiérarchique' },
      { type: 'improvement', description: 'Sélecteur de période unifié (J/J-1/S/S-1/M/M-1/A/custom)' },
      { type: 'improvement', description: 'Formulaires création utilisateur unifiés admin/franchiseur/équipe' },
      { type: 'improvement', description: 'Règle automatique Dirigeant → N2 (franchisee_admin)' },
      { type: 'improvement', description: 'Fusion franchiseur_roles → global_role (N3=animateur, N4=directeur, N5+=dg)' },
      { type: 'improvement', description: 'Filtrage techniciens inactifs dans plannings et stats' },
      { type: 'fix', description: 'Correction embedding hashing pour détection doublons' },
      { type: 'fix', description: 'Correction qualification IA edge function errors' },
      { type: 'fix', description: 'Correction import priorité et global_role vide' },
      { type: 'fix', description: 'Correction calculs recouvrement TTC et structure données' },
      { type: 'fix', description: 'Correction chat text overflow et support notifications' },
      { type: 'security', description: 'Superadmin bypass complet des modules (N5+ accès total)' },
      { type: 'security', description: 'Support level gating renforcé (SA1/SA2/SA3)' },
    ]
  },
  {
    version: 'V0.5.1',
    date: '2025-12-02',
    title: 'Correction critique - Droits superadmin absolus',
    changes: [
      { 
        type: 'security', 
        description: 'RÈGLE ABSOLUE: Superadmin (N6) et Platform Admin (N5+) ont TOUS les modules et options activés automatiquement, sans dépendre de enabled_modules'
      },
      { 
        type: 'fix', 
        description: 'Correction hasModule() et hasModuleOption() dans accessControl.ts - bypass complet pour N5+, élimine lecture seule involontaire sur les droits'
      },
      { 
        type: 'fix', 
        description: 'Correction des politiques RLS sur apogee_tickets - N5+ ont accès complet à tous les tickets sans dépendre du module enabled_modules'
      },
    ]
  },
  {
    version: 'V0.5.0',
    date: '2025-12-01',
    title: 'Sprint 1 & 2 - Sécurité RLS et cohérence permissions',
    changes: [
      { 
        type: 'security', 
        description: 'P1.1 - RLS Franchiseur: can_access_agency() et get_user_assigned_agencies(). Policies réécrites sur animator_visits, expense_requests, royalty_*.'
      },
      { 
        type: 'security', 
        description: 'P1.2 - RLS Support Console (Option B): Console accessible aux support.agent=true + N5+. Fonction is_support_agent(). Policies support_tickets réécrites.'
      },
      { 
        type: 'security', 
        description: 'P1.3 - Migration agency_id: profiles.agency_id (UUID) comme source unique. Fonction get_user_agency_id(). Policies réécrites sur apogee_agencies.'
      },
      { 
        type: 'security', 
        description: 'P2.1 - Sémantique Support clarifiée: isSupportAgent→hasSupportAgentRole, canAccessSupportConsole→canAccessSupportConsoleUI (8 fichiers)'
      },
      { 
        type: 'improvement', 
        description: 'P2.2 - Guards centralisés vérifiés: 100% des protections dans App.tsx, 0% dans les pages'
      },
      { 
        type: 'improvement', 
        description: 'P2.3 - Navigation unifiée: canAccessFeature() centrale dans roleMatrix.ts pour tiles/nav/routes'
      },
    ]
  },
  {
    version: 'V0.5.0',
    date: '2025-12-01',
    title: 'Sprints 1-3: Fondations Sécurité, Permissions & Data Model',
    changes: [
      { type: 'improvement', description: 'P3.1 - Registre centralisé scopes (scopeRegistry.ts)' },
      { type: 'improvement', description: 'P3.2 - Documentation format unique enabled_modules V2' },
      { type: 'security', description: 'P3.3 - Suppression has_franchiseur_role() des RLS' },
      { type: 'improvement', description: 'P3.4 - Enum strict rag_context_type (7 valeurs)' },
      { type: 'feature', description: 'P3.5 - heat_priority unique (suppression priority texte)' },
      { type: 'improvement', description: 'P2.1 - Support Console sémantique (hasSupportAgentRole)' },
      { type: 'improvement', description: 'P2.2 - Guards centralisés App.tsx' },
      { type: 'improvement', description: 'P2.3 - Navigation unifiée (canAccessFeature)' },
      { type: 'security', description: 'P1.1 - RLS Franchiseur (can_access_agency)' },
      { type: 'security', description: 'P1.2 - RLS Support Console (is_support_agent)' },
      { type: 'improvement', description: 'P1.3 - Migration agency_id unique' },
    ]
  },
  {
    version: 'V0.4.2',
    date: '2025-12-01',
    title: 'Audits de sécurité, permissions et fonctionnalités',
    changes: [
      { type: 'security', description: 'AUDIT F-SEC-CRIT-1: JWT validation via supabase.auth.getUser() au lieu de décodage manuel (update-user-email)' },
      { type: 'security', description: 'AUDIT F-SEC-5: Validation stricte agence - auto-création désactivée (create-user)' },
      { type: 'security', description: 'AUDIT F-SEC-1: Validation Zod centralisée dans _shared/validation.ts (chat-guide, qualify-ticket, network-kpis, create-user, update-user-email)' },
      { type: 'security', description: 'AUDIT F-SEC-2: Suppression logs sensibles email/agency_id (create-user, update-user-email, search-embeddings, chat-guide)' },
      { type: 'security', description: 'AUDIT F-SEC-3: Pagination .limit(200) sur notify-support-ticket + sanitize SMS' },
      { type: 'security', description: 'AUDIT F-SEC-4: Vérification rôle N3+ (franchisor_user) dans network-kpis' },
      { type: 'security', description: 'AUDIT F-SEC-6: Validation renforcée ticket_ids avec vérification UUID (qualify-ticket)' },
      { type: 'security', description: 'AUDIT F-RLS-4: Correction policy planning_signatures - tech_id cast invalide remplacé par signed_by_user_id' },
      { type: 'security', description: 'AUDIT F-PERM-1: Console support strictement réservée aux N5+ - suppression bypass via module option' },
      { type: 'security', description: 'AUDIT F-PERM-2: Groupe navigation Projects filtré selon module apogee_tickets activé' },
      { type: 'security', description: 'AUDIT F-PERM-3: Route /support/console protégée par SupportConsoleGuard dédié (N5+ strictement)' },
      { type: 'security', description: 'AUDIT F-EDIT-2: Agences dropdown filtrées selon manageScope (N2=ownAgency, N3=assignedAgencies, N4+=all)' },
      { type: 'security', description: 'AUDIT F-EDIT-4: Validation minRole pour activation modules - Switch désactivé si rôle utilisateur insuffisant' },
      { type: 'security', description: 'AUDIT PERMISSIONS: 12 findings identifiés - 2 critiques (Support Console Bypass, EditUserDialog incomplet), 4 élevés (module minRole, agence scope), 6 moyens (guards routes, scopeSlug)' },
      { type: 'fix', description: 'AUDIT F-MISC-1/F-MISC-2: Correction scopeSlug tiles (base_documentaire, rh_tech, mon_equipe)' },
      { type: 'improvement', description: 'AUDIT F-PERF-1: Parallélisation chargement agences (network-kpis) - Promise.all au lieu de boucle séquentielle' },
      { type: 'improvement', description: 'AUDIT F-TABLE-3: 14 index créés (chatbot_queries, support_tickets, apogee_tickets, profiles, franchiseur_assignments)' },
      { type: 'improvement', description: 'AUDIT FONCTIONNEL: Analyse complète 6 modules - 3 critiques identifiés (terminologie Apogée-Tickets, priorités support/apogée, statuts), 14h corrections pré-prod recommandées' },
    ]
  },
  {
    version: 'V0.4.1',
    date: '2025-12-01',
    title: 'Annonces prioritaires et communication réseau',
    changes: [
      { type: 'feature', description: 'Module d\'annonces prioritaires avec modal bloquante "J\'ai lu" / "Plus tard"' },
      { type: 'feature', description: 'Accès admin et franchiseur N3+ aux annonces depuis /admin et /hc-reseau' },
      { type: 'improvement', description: 'Tuile "Ouvrir un Ticket" sur page /support pour création rapide' },
      { type: 'improvement', description: 'Renommage "Bug Application" → "HC Services (ici)" dans création de ticket' },
      { type: 'improvement', description: 'Upload direct d\'image pour annonces (bucket Storage) au lieu d\'URL externe' },
      { type: 'improvement', description: 'Bouton "Plus tard" réaffiche l\'annonce à chaque connexion jusqu\'à lecture' },
      { type: 'improvement', description: 'Historique complet des annonces (actives/expirées) avec affichage du créateur et statistiques de lecture' },
      { type: 'fix', description: 'Gestion correcte du défilement des annonces multiples avec "Plus tard"' },
      { type: 'fix', description: 'Affichage automatique de l\'annonce suivante après avoir cliqué "J\'ai lu"' },
      { type: 'security', description: 'Permissions de suppression : N3+ peuvent supprimer uniquement leurs propres annonces, N5+ toutes les annonces' },
      { type: 'security', description: 'Restriction modification role_agence : uniquement Admin et N+1 peuvent modifier ce champ' },
      { type: 'improvement', description: 'Phase 1 - Élimination console.error (AnnouncementForm, use-announcements remplacés par logError)' },
      { type: 'improvement', description: 'Phase 1 - Types `any` éliminés dans useAgencies.ts (AgencyRow, ProfileRow, RoleRow)' },
      { type: 'improvement', description: 'Phase 1 - LocalErrorBoundary créé et intégré au Dashboard Apogée' },
      { type: 'improvement', description: 'Phase 2 - Élimination de 50% des types `any` (chart.tsx, use-chatbot.ts)' },
      { type: 'improvement', description: 'Phase 2 - React.memo ajouté sur composants lourds (UserAccordionItem, Landing)' },
      { type: 'improvement', description: 'Phase 2 - Debounce localStorage persistence chatbot (500ms)' },
      { type: 'improvement', description: 'Phase 3 - Skeleton loaders remplacent spinner générique (UserListSkeleton)' },
      { type: 'improvement', description: 'Phase 3 - React.memo ajouté sur 6 composants (ChartCard, MetricCard, UniversKpiCard, SortableCard)' },
      { type: 'improvement', description: 'Phase 3 - Bibliothèque react-window installée (préparation virtualisation listes longues)' },
    ]
  },
  {
    version: 'V0.4.0',
    date: '2025-12-01',
    title: 'Release Pré-production',
    changes: [
      { type: 'feature', description: 'Page historique des versions avec design cohérent' },
      { type: 'security', description: 'Hardening CORS et JWT sur toutes les edge functions' },
      { type: 'security', description: 'Rate limiting sur les endpoints sensibles' },
      { type: 'security', description: 'Audit RLS complet et correction des policies' },
      { type: 'feature', description: 'Intégration Sentry pour le monitoring d\'erreurs' },
      { type: 'improvement', description: 'React Query robustesse - élimination des undefined returns' },
      { type: 'feature', description: 'SLA automatique sur les tickets support' },
      { type: 'feature', description: 'Classification IA des tickets support' },
      { type: 'feature', description: 'RAG consolidé avec Mme MICHU chatbot' },
    ]
  },
  {
    version: 'V0.3.2',
    date: '2025-11-25',
    title: 'Corrections et améliorations',
    changes: [
      { type: 'fix', description: 'Correction isolation données agence' },
      { type: 'improvement', description: 'Optimisation chargement statistiques' },
      { type: 'feature', description: 'Notifications blinking sur tickets modifiés' },
      { type: 'improvement', description: 'Refactoring 100% - tous les fichiers < 400 lignes' },
      { type: 'feature', description: 'Dashboard franchiseur avec top apporteurs podium' },
      { type: 'feature', description: 'Export multi-format Kanban (CSV/Excel/PDF)' },
    ]
  },
  {
    version: 'V0.3.0',
    date: '2025-11-15',
    title: 'Système de permissions V2',
    changes: [
      { type: 'feature', description: 'Nouveau système de rôles hiérarchiques (N0-N6)' },
      { type: 'feature', description: 'Modules activables par utilisateur' },
      { type: 'improvement', description: 'Simplification de l\'architecture d\'autorisation' },
    ]
  },
  {
    version: 'V0.2.5',
    date: '2025-11-08',
    title: 'Ticketing Apogée avancé',
    changes: [
      { type: 'feature', description: 'Vue liste avec colonnes triables et redimensionnables' },
      { type: 'feature', description: 'Export CSV/Excel/PDF du Kanban avec filtres' },
      { type: 'feature', description: 'Système de priorité heat (0-12)' },
      { type: 'feature', description: 'Notifications visuelles par bordures clignotantes' },
      { type: 'improvement', description: 'Automatisation author_type selon rôle utilisateur' },
    ]
  },
  {
    version: 'V0.2.0',
    date: '2025-11-03',
    title: 'Support et ticketing',
    changes: [
      { type: 'feature', description: 'Système de tickets support avec SLA automatique' },
      { type: 'feature', description: 'Classification IA des tickets (catégorie, priorité, tags)' },
      { type: 'feature', description: 'Centre d\'aide avec FAQ et chatbot Mme MICHU' },
      { type: 'feature', description: 'Chat temps réel avec équipe support' },
      { type: 'security', description: 'RLS policies sur support_tickets et support_messages' },
    ]
  },
  {
    version: 'V0.1.5',
    date: '2025-10-30',
    title: 'Franchiseur & réseau',
    changes: [
      { type: 'feature', description: 'Dashboard franchiseur avec KPI réseau' },
      { type: 'feature', description: 'Gestion des agences et redevances' },
      { type: 'feature', description: 'Statistiques multi-agences avec filtres période' },
      { type: 'feature', description: 'Top 3 apporteurs avec podium' },
      { type: 'improvement', description: 'Isolation données par agence' },
    ]
  },
  {
    version: 'V0.1.0',
    date: '2025-10-29',
    title: 'Pilotage agence et indicateurs',
    changes: [
      { type: 'feature', description: 'Module "Mes indicateurs" avec KPI Apogée' },
      { type: 'feature', description: 'Intégration API Apogée multi-agences' },
      { type: 'feature', description: 'Dashboard avec filtres période (Jour, Semaine, Mois, Année)' },
      { type: 'feature', description: 'Widgets CA, interventions, projets, techniciens' },
      { type: 'improvement', description: 'Calculs d\'agrégation côté frontend' },
    ]
  },
  {
    version: 'V0.0.5',
    date: '2025-09-26',
    title: 'Guides et documentation',
    changes: [
      { type: 'feature', description: 'Help Academy avec guides Apogée, Apporteurs, HelpConfort' },
      { type: 'feature', description: 'Système de blocs éditables avec TipTap' },
      { type: 'feature', description: 'Upload et gestion de documents PDF' },
      { type: 'feature', description: 'Historique de navigation et favoris' },
      { type: 'improvement', description: 'Architecture modulaire par catégories' },
    ]
  },
  {
    version: 'V0.0.1',
    date: '2025-09-24',
    title: 'Version initiale',
    changes: [
      { type: 'feature', description: 'Authentification Supabase avec profils utilisateurs' },
      { type: 'feature', description: 'Layout unifié avec sidebar et header' },
      { type: 'feature', description: 'Dashboard d\'accueil avec tuiles de navigation' },
      { type: 'feature', description: 'Gestion des utilisateurs (admin)' },
      { type: 'feature', description: 'Système de thème clair/sombre' },
    ]
  },
];

/**
 * Obtenir la version actuelle (première entrée du changelog)
 */
export function getCurrentVersion(): ChangelogEntry {
  return CHANGELOG[0];
}

/**
 * Obtenir les versions précédentes (toutes sauf la première)
 */
export function getPreviousVersions(): ChangelogEntry[] {
  return CHANGELOG.slice(1);
}

/**
 * Configuration des badges de type de changement
 */
export const CHANGE_TYPE_CONFIG = {
  feature: {
    label: 'Nouveauté',
    emoji: '🟢',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-700',
  },
  fix: {
    label: 'Correction',
    emoji: '🔵',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
  },
  improvement: {
    label: 'Amélioration',
    emoji: '🟡',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-700',
  },
  security: {
    label: 'Sécurité',
    emoji: '🔴',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
  },
} as const;
