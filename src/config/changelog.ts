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
      { type: 'improvement', description: 'Refactoring 100% - tous les fichiers < 400 lignes' },
      { type: 'feature', description: 'Dashboard franchiseur avec top apporteurs podium' },
      { type: 'feature', description: 'Export multi-format Kanban (CSV/Excel/PDF)' },
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
    date: '2025-11-01',
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
    date: '2025-10-15',
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
    date: '2025-09-20',
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
    date: '2025-08-01',
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
    date: '2025-07-15',
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
    date: '2025-06-01',
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
