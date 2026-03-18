/**
 * Presets de modules par poste (role_agence) pour les utilisateurs N1
 * 
 * Quand un compte N1 est créé avec un role_agence connu,
 * ces modules sont automatiquement activés dans user_modules.
 * Le N2 (dirigeant) peut ensuite ajuster individuellement.
 */

import type { ModuleKey } from '@/types/modules';

/**
 * Mapping role_agence → modules activés par défaut
 * 
 * Règle : chaque poste n'obtient que les modules pertinents à sa fonction.
 * Le N2 peut ensuite ajouter/retirer des modules via l'interface de gestion.
 */
export const ROLE_AGENCE_MODULE_PRESETS: Record<string, ModuleKey[]> = {
  commercial: [
    'commercial.suivi_client',
    'commercial.comparateur',
    'commercial.prospects',
    'commercial.realisations',
    'support.guides',
    'support.aide_en_ligne',
  ],
  assistante: [
    'organisation.salaries',
    'organisation.plannings',
    'organisation.documents_legaux',
    'mediatheque.consulter',
    'mediatheque.documents',
    'support.guides',
    'support.aide_en_ligne',
  ],
  technicien: [
    'support.guides',
    'support.aide_en_ligne',
    // Accès minimal — le N2 peut ajouter des modules si besoin
  ],
};

/**
 * Modules que le N2 peut attribuer à ses N1
 * = tous les modules dont minRole <= franchisee_user,
 * filtrés côté UI par les modules du N2 lui-même
 */
export const N2_ASSIGNABLE_MODULES: { key: ModuleKey; label: string; category: string }[] = [
  // Commercial
  { key: 'commercial.suivi_client', label: 'Suivi client', category: 'Commercial' },
  { key: 'commercial.comparateur', label: 'Comparateur', category: 'Commercial' },
  { key: 'commercial.prospects', label: 'Prospects', category: 'Commercial' },
  { key: 'commercial.realisations', label: 'Réalisations', category: 'Commercial' },
  { key: 'commercial.veille', label: 'Veille', category: 'Commercial' },
  // Organisation  
  { key: 'organisation.salaries', label: 'Salariés', category: 'Organisation' },
  { key: 'organisation.plannings', label: 'Plannings', category: 'Organisation' },
  { key: 'organisation.documents_legaux', label: 'Documents légaux', category: 'Organisation' },
  // Médiathèque
  { key: 'mediatheque.consulter', label: 'Médiathèque', category: 'Médiathèque' },
  { key: 'mediatheque.documents', label: 'Documents', category: 'Médiathèque' },
  // Support
  { key: 'support.guides', label: 'Guides', category: 'Support' },
  { key: 'support.aide_en_ligne', label: 'Aide en ligne', category: 'Support' },
  { key: 'support.faq', label: 'FAQ', category: 'Support' },
];

/**
 * Retourne les modules par défaut pour un role_agence donné
 */
export function getPresetForRole(roleAgence: string): ModuleKey[] {
  return ROLE_AGENCE_MODULE_PRESETS[roleAgence.toLowerCase()] ?? [];
}
