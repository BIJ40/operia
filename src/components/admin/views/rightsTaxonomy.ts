export type RightsCategoryId =
  | 'pilotage'
  | 'commercial'
  | 'organisation'
  | 'documents'
  | 'support'
  | 'admin';

export interface RightsCategory {
  id: RightsCategoryId;
  label: string;
  moduleKeys: string[];
}

export const RIGHTS_CATEGORIES: RightsCategory[] = [
  { id: 'pilotage', label: 'Pilotage', moduleKeys: [
    'pilotage', 'pilotage.dashboard', 'pilotage.agence',
    'stats', 'agence',
  ]},
  { id: 'commercial', label: 'Commercial', moduleKeys: [
    'commercial', 'prospection', 'commercial.realisations',
    'realisations',
  ]},
  { id: 'organisation', label: 'Organisation', moduleKeys: [
    'organisation', 'organisation.salaries', 'organisation.apporteurs',
    'organisation.plannings', 'organisation.reunions', 'organisation.parc',
    'rh', 'salaries', 'parc', 'outils',
    'divers_apporteurs', 'divers_plannings', 'divers_reunions', 'divers_documents',
  ]},
  { id: 'documents', label: 'Documents', moduleKeys: [
    'mediatheque', 'mediatheque.documents', 'documents',
  ]},
  { id: 'support', label: 'Support', moduleKeys: [
    'support', 'support.aide_en_ligne', 'support.guides',
    'ticketing', 'guides', 'aide',
  ]},
  { id: 'admin', label: 'Admin', moduleKeys: [
    'admin', 'admin_plateforme', 'reseau_franchiseur',
  ]},
];

/**
 * All module keys covered by RIGHTS_CATEGORIES (used for legacy detection).
 */
export const RIGHTS_CATEGORY_ROOT_KEYS = new Set(RIGHTS_CATEGORIES.flatMap((category) => category.moduleKeys));

/**
 * Returns true if a registry node key belongs to the given category moduleKeys.
 * Supports both exact match and prefix (descendant) match.
 */
export function nodeMatchesCategory(nodeKey: string, moduleKeys: string[]): boolean {
  return moduleKeys.some(mk => nodeKey === mk || nodeKey.startsWith(mk + '.'));
}

/**
 * Returns true if a node belongs to ANY known category (i.e. is not legacy).
 */
export function nodeMatchesAnyCategory(nodeKey: string): boolean {
  return RIGHTS_CATEGORIES.some(cat => nodeMatchesCategory(nodeKey, cat.moduleKeys));
}

const NAVIGATION_LABEL_FALLBACKS: Record<string, string> = {
  'organisation.salaries': 'Salariés',
  'organisation.parc': 'Parc',
  prospection: 'Prospection',
  admin_plateforme: 'Admin plateforme',
  'pilotage.agence': 'Mon agence',
  'mediatheque.documents': 'Documents',
  'organisation.apporteurs': 'Apporteurs',
  'organisation.plannings': 'Plannings',
  'organisation.reunions': 'Réunions',
  'support.aide_en_ligne': 'Aide en ligne',
  reseau_franchiseur: 'Franchiseur',
  // Legacy roots → business labels
  agence: 'Mon agence',
  rh: 'Salariés',
  parc: 'Parc',
  realisations: 'Réalisations',
  divers_apporteurs: 'Apporteurs',
  divers_plannings: 'Plannings',
  divers_reunions: 'Réunions',
  divers_documents: 'Documents légaux',
  outils: 'Outils',
};

const LEGACY_LABELS: Partial<Record<string, string[]>> = {
  'organisation.salaries': ['Ressources humaines', 'RH'],
  'organisation.parc': ['Parc véhicules & EPI'],
  prospection: ['Commercial / Prospection'],
  admin_plateforme: ['Administration'],
  'pilotage.agence': ['Pilotage agence'],
  reseau_franchiseur: ['Réseau Franchiseur'],
  'support.aide_en_ligne': ['Aide'],
  // Legacy roots
  agence: ['Pilotage agence'],
  rh: ['Ressources humaines'],
  parc: ['Parc véhicules & EPI'],
};

export function getRightsDisplayLabel(moduleKey: string, label: string): string {
  const legacyLabels = LEGACY_LABELS[moduleKey];
  const fallback = NAVIGATION_LABEL_FALLBACKS[moduleKey];

  if (legacyLabels?.includes(label) && fallback) {
    return fallback;
  }

  return label;
}
