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
export const N2_ASSIGNABLE_MODULES: { key: ModuleKey; fallbackLabel: string; category: string }[] = [
  // Commercial
  { key: 'commercial.suivi_client', fallbackLabel: 'Suivi client', category: 'Commercial' },
  { key: 'commercial.comparateur', fallbackLabel: 'Comparateur', category: 'Commercial' },
  { key: 'commercial.prospects', fallbackLabel: 'Prospects', category: 'Commercial' },
  { key: 'commercial.realisations', fallbackLabel: 'Réalisations', category: 'Commercial' },
  { key: 'commercial.veille', fallbackLabel: 'Veille concurrentielle', category: 'Commercial' },
  // Mon agence  
  { key: 'organisation.salaries', fallbackLabel: 'Mes collaborateurs', category: 'Mon agence' },
  { key: 'organisation.plannings', fallbackLabel: 'Plannings', category: 'Mon agence' },
  { key: 'organisation.documents_legaux', fallbackLabel: 'Documents légaux', category: 'Mon agence' },
  // Documents
  { key: 'mediatheque.consulter', fallbackLabel: 'Médiathèque', category: 'Documents' },
  { key: 'mediatheque.documents', fallbackLabel: 'Mes documents', category: 'Documents' },
  // Centre d'aide
  { key: 'support.guides', fallbackLabel: 'Guides & tutoriels', category: 'Centre d\'aide' },
  { key: 'support.aide_en_ligne', fallbackLabel: 'Assistance en ligne', category: 'Centre d\'aide' },
  { key: 'support.faq', fallbackLabel: 'Questions fréquentes', category: 'Centre d\'aide' },
];

/**
 * Retourne les modules par défaut pour un role_agence donné
 */
export function getPresetForRole(roleAgence: string): ModuleKey[] {
  return ROLE_AGENCE_MODULE_PRESETS[roleAgence.toLowerCase()] ?? [];
}
