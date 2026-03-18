/**
 * useModuleLabels — Hook centralisé pour la résolution des labels de modules
 * 
 * Priorité de résolution :
 * 1. module_registry.label (override DB, éditable dans l'admin)
 * 2. MODULE_DEFINITIONS.label (fallback frontend compilé)
 * 3. MODULE_SHORT_LABELS pour les labels courts
 * 4. Clé technique en dernier recours
 * 
 * IMPORTANT : Ce hook ne touche PAS aux clés techniques.
 * Les guards, permissions et logique métier continuent d'utiliser les clés.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MODULE_DEFINITIONS, MODULE_SHORT_LABELS, type ModuleKey } from '@/types/modules';

// ============================================================================
// Types
// ============================================================================

export interface ModuleLabelsMap {
  /** key → label DB (override admin) */
  dbLabels: Record<string, string>;
  /** key → label MODULE_DEFINITIONS (fallback compilé) */
  definitionLabels: Record<string, string>;
}

// ============================================================================
// Static fallback map (built once from MODULE_DEFINITIONS)
// ============================================================================

const DEFINITION_LABELS: Record<string, string> = Object.fromEntries(
  MODULE_DEFINITIONS.map(m => [m.key, m.label])
);

const SHORT_LABELS: Record<string, string> = { ...MODULE_SHORT_LABELS } as Record<string, string>;

// ============================================================================
// Pure resolver functions (usable without React)
// ============================================================================

/**
 * Résout le label d'un module.
 * Priorité : dbLabel > definitionLabel > fallback > key
 */
export function resolveModuleLabel(
  key: string,
  dbLabels: Record<string, string>,
  fallback?: string
): string {
  return dbLabels[key] ?? DEFINITION_LABELS[key] ?? fallback ?? key;
}

/**
 * Résout le label court d'un module.
 * Priorité : dbLabel > SHORT_LABELS > definitionLabel > fallback > key
 * Le label DB (renommage admin) a TOUJOURS priorité.
 */
export function resolveModuleShortLabel(
  key: string,
  dbLabels: Record<string, string>,
  fallback?: string
): string {
  return dbLabels[key] ?? SHORT_LABELS[key] ?? DEFINITION_LABELS[key] ?? fallback ?? key;
}

// ============================================================================
// Query key & fetcher
// ============================================================================

const QUERY_KEY = ['module-registry-labels'];

async function fetchRegistryLabels(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('module_registry' as any)
    .select('key, label');

  if (error) {
    console.warn('[useModuleLabels] Failed to fetch registry labels:', error.message);
    return {};
  }

  const labels: Record<string, string> = {};
  for (const row of (data as any[]) ?? []) {
    if (row.key && row.label) {
      labels[row.key] = row.label;
    }
  }
  return labels;
}

// ============================================================================
// React Hook
// ============================================================================

export function useModuleLabels() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchRegistryLabels,
    staleTime: 1000 * 60 * 5, // 5 min cache — labels change rarely
    gcTime: 1000 * 60 * 30,
  });

  const dbLabels = query.data ?? {};

  return {
    /** Résout le label complet d'un module */
    getLabel: (key: string, fallback?: string): string =>
      resolveModuleLabel(key, dbLabels, fallback),

    /** Résout le label court d'un module (pour badges) */
    getShortLabel: (key: string, fallback?: string): string =>
      resolveModuleShortLabel(key, dbLabels, fallback),

    /** Labels DB bruts (pour debug/admin) */
    dbLabels,

    /** True si les labels DB sont chargés */
    isLoaded: query.isSuccess,

    /** True si en cours de chargement */
    isLoading: query.isLoading,
  };
}
