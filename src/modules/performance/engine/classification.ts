/**
 * Performance Terrain — Work item classification
 * Productif / Non-productif / SAV / Autre
 */

import type { WorkItemCategory } from './types';
import {
  PRODUCTIVE_TYPES,
  NON_PRODUCTIVE_TYPES,
  ALWAYS_PRODUCTIVE,
  SAV_EXACT_TYPES,
} from './rules';

function normalize(s: string | undefined): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Classify a work item by its intervention type(s).
 * Returns category + whether classification used fallback.
 */
export function classifyWorkItem(
  type?: string,
  type2?: string
): { category: WorkItemCategory; usedFallback: boolean } {
  const t1 = normalize(type);
  const t2 = normalize(type2);

  // SAV detection (exact match on type2)
  if (SAV_EXACT_TYPES.includes(t2)) {
    return { category: 'sav', usedFallback: false };
  }

  // Always productive (e.g. recherche de fuite)
  if (ALWAYS_PRODUCTIVE.some(p => t1.includes(p) || t2.includes(p))) {
    return { category: 'productive', usedFallback: false };
  }

  // Non-productive explicit
  if (NON_PRODUCTIVE_TYPES.some(np => t1.includes(np) || t2.includes(np))) {
    return { category: 'non_productive', usedFallback: false };
  }

  // Productive explicit
  if (PRODUCTIVE_TYPES.some(p => t1.includes(p) || t2.includes(p))) {
    return { category: 'productive', usedFallback: false };
  }

  // No match — classify as 'other' with fallback flag
  return { category: 'other', usedFallback: true };
}

/**
 * Detect SAV from intervention + project pictos.
 * Strict rules: type2 === 'sav' OR visite type2 === 'sav' OR picto 'sav'
 */
export function isSavIntervention(
  intervention: Record<string, unknown> | null,
  project: Record<string, unknown> | null
): boolean {
  if (!intervention) return false;

  // 1. intervention.type2 === 'sav'
  const type2 = normalize(
    (intervention.type2 as string) || 
    ((intervention.data as Record<string, unknown>)?.type2 as string) || ''
  );
  if (type2 === 'sav') return true;

  // 2. Visites type2
  const visites = (
    (intervention.visites as unknown[]) || 
    ((intervention.data as Record<string, unknown>)?.visites as unknown[]) || 
    []
  );
  for (const v of visites) {
    const vt2 = normalize(((v as Record<string, unknown>)?.type2 as string) || '');
    if (vt2 === 'sav') return true;
  }

  // 3. Project pictos
  const pictos = (
    ((project?.data as Record<string, unknown>)?.pictosInterv as string[]) || 
    (project?.pictosInterv as string[]) || 
    []
  );
  if (Array.isArray(pictos) && pictos.some(p => normalize(p) === 'sav')) {
    return true;
  }

  return false;
}
