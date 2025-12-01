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
    version: 'V0.4.2',
    date: '2025-12-02',
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
