/**
 * StatIA V2 - Registre central des définitions de métriques
 */

import { StatDefinition, StatDefinitionRegistry } from './types';
import { caDefinitions } from './ca';
import { universDefinitions } from './univers';
import { apporteursDefinitions } from './apporteurs';
import { techniciensDefinitions } from './techniciens';
import { savDefinitions } from './sav';
import { devisDefinitions } from './devis';
import { recouvrementDefinitions } from './recouvrement';
// V2: Nouvelles familles de métriques
import { dossiersDefinitions } from './dossiers';
import { qualiteDefinitions } from './qualite';
import { productiviteDefinitions } from './productivite';
import { complexiteDefinitions } from './complexite';
import { reseauDefinitions } from './reseau';
import { advancedDefinitions } from './advanced';
import { advancedDefinitions2 } from './advanced2';

// Export types
export * from './types';

/**
 * Registre central de toutes les définitions StatIA V2
 */
export const STAT_DEFINITIONS: StatDefinitionRegistry = {
  // CA
  ...caDefinitions,
  
  // Univers
  ...universDefinitions,
  
  // Apporteurs
  ...apporteursDefinitions,
  
  // Techniciens
  ...techniciensDefinitions,
  
  // SAV
  ...savDefinitions,
  
  // Devis
  ...devisDefinitions,
  
  // Recouvrement
  ...recouvrementDefinitions,
  
  // V2: Dossiers
  ...dossiersDefinitions,
  
  // V2: Qualité
  ...qualiteDefinitions,
  
  // V2: Productivité
  ...productiviteDefinitions,
  
  // V2: Complexité
  ...complexiteDefinitions,
  
  // V2: Réseau Franchiseur
  ...reseauDefinitions,
  
  // V2: Métriques avancées
  ...advancedDefinitions,
  
  // V2: Métriques avancées Pack 2
  ...advancedDefinitions2,
};

/**
 * Récupère une définition de métrique par son ID
 */
export function getStatDefinition(id: string): StatDefinition | undefined {
  return STAT_DEFINITIONS[id];
}

/**
 * Vérifie si une métrique existe
 */
export function hasStatDefinition(id: string): boolean {
  return id in STAT_DEFINITIONS;
}

/**
 * Liste toutes les métriques disponibles
 */
export function listStatDefinitions(): StatDefinition[] {
  return Object.values(STAT_DEFINITIONS);
}

/**
 * Liste les métriques par catégorie
 */
export function listStatDefinitionsByCategory(category: string): StatDefinition[] {
  return Object.values(STAT_DEFINITIONS).filter(def => def.category === category);
}

/**
 * Liste toutes les catégories disponibles
 */
export function listCategories(): string[] {
  const categories = new Set<string>();
  for (const def of Object.values(STAT_DEFINITIONS)) {
    categories.add(def.category);
  }
  return Array.from(categories);
}

/**
 * Résumé du registre pour debugging
 */
export function getRegistrySummary(): { total: number; byCategory: Record<string, number> } {
  const byCategory: Record<string, number> = {};
  
  for (const def of Object.values(STAT_DEFINITIONS)) {
    byCategory[def.category] = (byCategory[def.category] || 0) + 1;
  }
  
  return {
    total: Object.keys(STAT_DEFINITIONS).length,
    byCategory,
  };
}
