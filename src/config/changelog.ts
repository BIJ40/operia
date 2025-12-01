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
