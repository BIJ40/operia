/**
 * Module delegation utilities for N2 → N1 rights management
 * Extracted from deleted config/roleAgenceModulePresets.ts
 */

import { MODULE_DEFINITIONS, type ModuleKey } from '@/types/modules';

const CATEGORY_TO_UI_LABEL: Record<string, string> = {
  pilotage: 'Pilotage',
  commercial: 'Commercial',
  organisation: 'Organisation',
  documents: 'Médiathèque',
  support: 'Support',
};

/**
 * Returns all modules a N2 can delegate to a N1.
 * Derived from `delegatable: true` in MODULE_DEFINITIONS.
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
