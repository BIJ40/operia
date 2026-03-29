/**
 * Presets de modules par poste (role_agence) pour les utilisateurs N1
 * 
 * Quand un compte N1 est créé avec un role_agence connu,
 * ces modules sont automatiquement activés dans user_modules.
 * Le N2 (dirigeant) peut ensuite ajuster individuellement.
 */

import { MODULE_DEFINITIONS, type ModuleKey, type ModuleDefinition } from '@/types/modules';

// ============================================================================
// MODULE CATEGORY LABELS (pour l'UI des droits équipe)
// ============================================================================

const CATEGORY_TO_UI_LABEL: Record<string, string> = {
  pilotage: 'Pilotage',
  commercial: 'Commercial',
  organisation: 'Organisation',
  documents: 'Médiathèque',
  support: 'Support',
};

// ============================================================================
// SOURCE DE VÉRITÉ CANONIQUE: MODULES DÉLÉGABLES
// ============================================================================

/**
 * Retourne tous les modules qu'un N2 peut déléguer à un N1.
 * Source de vérité unique — dérivé de `delegatable: true` dans MODULE_DEFINITIONS.
 * Remplace l'ancien N2_ASSIGNABLE_MODULES hardcodé.
 */
export function getDelegatableModules(): { key: ModuleKey; fallbackLabel: string; category: string }[] {
  return MODULE_DEFINITIONS
    .filter(m => m.delegatable === true)
    .map(m => ({
      key: m.key,
      fallbackLabel: m.label,
      category: CATEGORY_TO_UI_LABEL[m.category] ?? m.category,
    }));
}

/**
 * @deprecated Utiliser getDelegatableModules() à la place.
 * Conservé temporairement pour compatibilité d'import — alias vers getDelegatableModules.
 */
export const N2_ASSIGNABLE_MODULES = getDelegatableModules();

// ============================================================================
// PRESETS PAR POSTE
// ============================================================================

/**
 * Mapping role_agence → modules activés par défaut
 * 
 * Règle : chaque poste n'obtient que les modules pertinents à sa fonction.
 * Le N2 peut ensuite ajouter/retirer des modules via l'interface de gestion.
 */
export const ROLE_AGENCE_MODULE_PRESETS: Record<string, ModuleKey[]> = {
  commercial: [
    'commercial.veille',
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
 * Retourne les modules par défaut pour un role_agence donné
 */
export function getPresetForRole(roleAgence: string): ModuleKey[] {
  return ROLE_AGENCE_MODULE_PRESETS[roleAgence.toLowerCase()] ?? [];
}
