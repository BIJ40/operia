export type RightsCategoryId =
  | 'accueil'
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
  { id: 'accueil', label: 'Accueil', moduleKeys: [
    'accueil',
  ]},
  { id: 'pilotage', label: 'Pilotage', moduleKeys: [
    'pilotage', 'pilotage.statistiques', 'pilotage.actions_a_mener',
    'pilotage.incoherences', 'pilotage.performance',
    'pilotage.rentabilite', 'pilotage.resultat',
    'pilotage.tresorerie', 'planning_augmente',
  ]},
  { id: 'commercial', label: 'Commercial', moduleKeys: [
    'commercial', 'prospection', 'commercial.suivi_client', 'commercial.comparateur',
    'commercial.veille', 'commercial.prospects', 'commercial.realisations',
  ]},
  { id: 'organisation', label: 'Organisation', moduleKeys: [
    'organisation', 'organisation.salaries', 'organisation.apporteurs',
    'organisation.plannings', 'organisation.reunions', 'organisation.parc',
    'organisation.docgen',
  ]},
  { id: 'documents', label: 'Documents', moduleKeys: [
    'mediatheque', 'mediatheque.documents',
  ]},
  { id: 'support', label: 'Support', moduleKeys: [
    'support', 'support.aide_en_ligne', 'support.guides', 'support.faq',
    'ticketing',
  ]},
  { id: 'admin', label: 'Admin', moduleKeys: [
    'admin', 'admin_plateforme',
    // reseau_franchiseur retiré — interface de rôle, pas un module administrable
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
  'organisation.docgen': 'DocGen',
  prospection: 'Prospection',
  admin_plateforme: 'Admin plateforme',
  planning_augmente: 'Planification Augmentée',
  'mediatheque.documents': 'Documents',
  'organisation.apporteurs': 'Apporteurs',
  'organisation.plannings': 'Plannings',
  'organisation.reunions': 'Réunions',
  'support.aide_en_ligne': 'Aide en ligne',
  // reseau_franchiseur retiré — interface de rôle
  // Legacy roots → business labels
  agence: 'Pilotage agence',
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
  
  // reseau_franchiseur retiré — interface de rôle
  'support.aide_en_ligne': ['Aide'],
  // Legacy roots
  agence: ['Pilotage agence', 'Mon agence'],
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
