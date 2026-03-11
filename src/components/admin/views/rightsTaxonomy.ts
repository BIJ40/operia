export type RightsCategoryId =
  | 'pilotage'
  | 'commercial'
  | 'organisation'
  | 'documents'
  | 'support'
  | 'admin'
  | 'franchiseur';

export interface RightsCategory {
  id: RightsCategoryId;
  label: string;
  moduleKeys: string[];
}

export const RIGHTS_CATEGORIES: RightsCategory[] = [
  { id: 'pilotage', label: 'Pilotage', moduleKeys: ['stats', 'agence'] },
  { id: 'commercial', label: 'Commercial', moduleKeys: ['prospection', 'realisations'] },
  { id: 'organisation', label: 'Organisation', moduleKeys: ['rh', 'divers_apporteurs', 'divers_plannings', 'divers_reunions', 'parc'] },
  { id: 'documents', label: 'Documents', moduleKeys: ['divers_documents', 'documents'] },
  { id: 'support', label: 'Support', moduleKeys: ['aide', 'guides', 'ticketing'] },
  { id: 'admin', label: 'Admin', moduleKeys: ['admin_plateforme'] },
  { id: 'franchiseur', label: 'Franchiseur', moduleKeys: ['reseau_franchiseur'] },
];

export const RIGHTS_CATEGORY_ROOT_KEYS = new Set(RIGHTS_CATEGORIES.flatMap((category) => category.moduleKeys));

const NAVIGATION_LABEL_FALLBACKS: Record<string, string> = {
  rh: 'Salariés',
  parc: 'Parc',
  prospection: 'Prospection',
  admin_plateforme: 'Admin',
};

const LEGACY_LABELS: Partial<Record<string, string[]>> = {
  rh: ['Ressources humaines'],
  parc: ['Parc véhicules & EPI'],
  prospection: ['Commercial / Prospection'],
  admin_plateforme: ['Administration'],
};

export function getRightsDisplayLabel(moduleKey: string, label: string): string {
  const legacyLabels = LEGACY_LABELS[moduleKey];
  const fallback = NAVIGATION_LABEL_FALLBACKS[moduleKey];

  if (legacyLabels?.includes(label) && fallback) {
    return fallback;
  }

  return label;
}
