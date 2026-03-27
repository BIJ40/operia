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
  administratif: [
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
  // Pilotage
  { key: 'pilotage.statistiques', fallbackLabel: 'Statistiques', category: 'Pilotage' },
  { key: 'pilotage.performance', fallbackLabel: 'Performance', category: 'Pilotage' },
  { key: 'pilotage.actions_a_mener', fallbackLabel: 'Actions à mener', category: 'Pilotage' },
  
  { key: 'pilotage.incoherences', fallbackLabel: 'Incohérences', category: 'Pilotage' },
  { key: 'pilotage.resultat', fallbackLabel: 'Résultat', category: 'Pilotage' },
  { key: 'pilotage.rentabilite', fallbackLabel: 'Rentabilité', category: 'Pilotage' },
  // Commercial
  { key: 'commercial.suivi_client', fallbackLabel: 'Suivi client', category: 'Commercial' },
  { key: 'commercial.comparateur', fallbackLabel: 'Comparateur', category: 'Commercial' },
  { key: 'commercial.prospects', fallbackLabel: 'Prospects', category: 'Commercial' },
  { key: 'commercial.realisations', fallbackLabel: 'Réalisations', category: 'Commercial' },
  { key: 'commercial.veille', fallbackLabel: 'Veille concurrentielle', category: 'Commercial' },
  // Organisation
  { key: 'organisation.salaries', fallbackLabel: 'Collaborateurs', category: 'Organisation' },
  { key: 'organisation.apporteurs', fallbackLabel: 'Apporteurs', category: 'Organisation' },
  { key: 'organisation.plannings', fallbackLabel: 'Plannings', category: 'Organisation' },
  { key: 'organisation.reunions', fallbackLabel: 'Réunions', category: 'Organisation' },
  { key: 'organisation.parc', fallbackLabel: 'Parc', category: 'Organisation' },
  { key: 'organisation.documents_legaux', fallbackLabel: 'Documents légaux', category: 'Organisation' },
  // Médiathèque
  { key: 'mediatheque.consulter', fallbackLabel: 'Consulter', category: 'Médiathèque' },
  { key: 'mediatheque.documents', fallbackLabel: 'Documents', category: 'Médiathèque' },
  // Support
  { key: 'support.guides', fallbackLabel: 'Guides & tutoriels', category: 'Support' },
  { key: 'support.aide_en_ligne', fallbackLabel: 'Assistance en ligne', category: 'Support' },
  { key: 'support.faq', fallbackLabel: 'Questions fréquentes', category: 'Support' },
];

/**
 * Retourne les modules par défaut pour un role_agence donné
 */
export function getPresetForRole(roleAgence: string): ModuleKey[] {
  return ROLE_AGENCE_MODULE_PRESETS[roleAgence.toLowerCase()] ?? [];
}
