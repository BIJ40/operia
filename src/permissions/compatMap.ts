/**
 * COMPAT_MAP — Phase 3: Module Key Compatibility Layer
 * 
 * Résout les nouvelles clés fonctionnelles hiérarchiques (pilotage.*, commercial.*, etc.)
 * vers les anciennes clés legacy (agence, prospection, ticketing, etc.)
 * 
 * Ce module est la source de vérité unique du COMPAT_MAP.
 * Consommateurs : useEffectiveModules.ts, AuthContext.tsx, ModuleGuard.tsx
 * 
 * RÈGLE : legacy check d'abord, COMPAT en fallback uniquement.
 */

import type { EnabledModules } from '@/types/modules';

// ============================================================================
// TYPES
// ============================================================================

export interface CompatEntry {
  /** Legacy keys to check (OR logic) */
  keys: string[];
  /** If set, also require this option to be true on the legacy module */
  optionCheck?: { moduleKey: string; optionKey: string };
}

// ============================================================================
// COMPAT_MAP — Mapping nouvelles clés → legacy
// ============================================================================

export const COMPAT_MAP: Record<string, CompatEntry> = {
  // Pilotage ← stats
  'pilotage.statistiques':              { keys: ['stats'] },
  'pilotage.statistiques.general':      { keys: ['stats'] },
  'pilotage.statistiques.apporteurs':   { keys: ['stats'] },
  'pilotage.statistiques.techniciens':  { keys: ['stats'] },
  'pilotage.statistiques.univers':      { keys: ['stats'] },
  'pilotage.statistiques.sav':          { keys: ['stats'] },
  'pilotage.statistiques.previsionnel': { keys: ['stats'] },
  'pilotage.statistiques.exports':      { keys: ['stats'], optionCheck: { moduleKey: 'stats', optionKey: 'exports' } },
  'pilotage.dashboard':                 { keys: ['stats'] },
  // Pilotage ← agence
  'pilotage.performance':     { keys: ['agence'] },
  'pilotage.actions_a_mener': { keys: ['agence'] },
  'pilotage.devis_acceptes':  { keys: ['agence'] },
  'pilotage.incoherences':    { keys: ['agence'] },
  'pilotage.agence':          { keys: ['agence'] },
  // Commercial ← prospection + options
  'commercial.suivi_client': { keys: ['prospection'], optionCheck: { moduleKey: 'prospection', optionKey: 'dashboard' } },
  'commercial.comparateur':  { keys: ['prospection'], optionCheck: { moduleKey: 'prospection', optionKey: 'comparateur' } },
  'commercial.veille':       { keys: ['prospection'], optionCheck: { moduleKey: 'prospection', optionKey: 'veille' } },
  'commercial.prospects':    { keys: ['prospection'], optionCheck: { moduleKey: 'prospection', optionKey: 'prospects' } },
  // Commercial ← realisations
  'commercial.realisations': { keys: ['realisations'] },
  // Organisation ← legacy keys
  'organisation.salaries':         { keys: ['rh'] },
  'organisation.apporteurs':       { keys: ['divers_apporteurs'] },
  'organisation.plannings':        { keys: ['divers_plannings'] },
  'organisation.reunions':         { keys: ['divers_reunions'] },
  'organisation.parc':             { keys: ['parc'] },
  // organisation.documents_legaux — PAS de legacy, clé pure Phase 4
  // NE PAS mapper vers divers_documents (qui est la Médiathèque)
  // Médiathèque ← divers_documents (source de vérité unique)
  'mediatheque.consulter': { keys: ['divers_documents'], optionCheck: { moduleKey: 'divers_documents', optionKey: 'consulter' } },
  'mediatheque.gerer':     { keys: ['divers_documents'], optionCheck: { moduleKey: 'divers_documents', optionKey: 'gerer' } },
  'mediatheque.corbeille':  { keys: ['divers_documents'], optionCheck: { moduleKey: 'divers_documents', optionKey: 'corbeille_vider' } },
  // Support ← legacy keys
  'support.aide_en_ligne': { keys: ['aide'] },
  'support.guides':        { keys: ['guides'] },
  'support.ticketing':     { keys: ['ticketing'] },  // CONTRAINTE PROD
  // support.faq — pas de legacy, création pure → absent du compat map
  // Admin ← admin_plateforme / reseau_franchiseur
  'admin.gestion':    { keys: ['admin_plateforme'] },
  'admin.franchiseur': { keys: ['reseau_franchiseur'] },
  'admin.ia':         { keys: ['admin_plateforme'] },
  'admin.contenu':    { keys: ['admin_plateforme'] },
  'admin.ops':        { keys: ['admin_plateforme'] },
  'admin.plateforme': { keys: ['admin_plateforme'] },
};

// ============================================================================
// RESOLUTION FUNCTIONS — Pure, no React dependency
// ============================================================================

/**
 * Normalise un module state depuis EnabledModules (gère boolean | object)
 */
function getModuleState(enabledModules: EnabledModules, key: string): { enabled: boolean; options: Record<string, boolean> } | null {
  const state = (enabledModules as Record<string, any>)[key];
  if (!state) return null;
  if (typeof state === 'boolean') return { enabled: state, options: {} };
  if (typeof state === 'object') {
    return {
      enabled: state.enabled === true,
      options: (typeof state.options === 'object' && state.options !== null && !Array.isArray(state.options))
        ? state.options
        : {},
    };
  }
  return null;
}

/**
 * Résout une clé module via le COMPAT_MAP.
 * Ne vérifie PAS la clé directe — c'est le rôle de l'appelant.
 * 
 * @param enabledModules - modules bruts de l'utilisateur
 * @param moduleKey - clé à résoudre (ex: 'support.ticketing')
 * @returns true si la clé est résolue via compat
 */
export function resolveModuleViaCompat(
  enabledModules: EnabledModules | null,
  moduleKey: string,
): boolean {
  if (!enabledModules) return false;

  const compat = COMPAT_MAP[moduleKey];
  if (!compat) return false;

  // Option-based check (e.g. prospection.dashboard → commercial.suivi_client)
  if (compat.optionCheck) {
    const { moduleKey: mk, optionKey: ok } = compat.optionCheck;
    const state = getModuleState(enabledModules, mk);
    return !!(state?.enabled && state.options[ok]);
  }

  // Key-based fallback (OR logic across legacy keys)
  return compat.keys.some(k => {
    const state = getModuleState(enabledModules, k);
    return state?.enabled === true;
  });
}

/**
 * Résout une option module via le COMPAT_MAP.
 * Tente de mapper moduleKey.optionKey vers une entrée COMPAT.
 * 
 * @param enabledModules - modules bruts de l'utilisateur
 * @param moduleKey - clé module (ex: 'mediatheque')
 * @param optionKey - clé option (ex: 'gerer')
 * @returns true si l'option est résolue via compat
 */
export function resolveModuleOptionViaCompat(
  enabledModules: EnabledModules | null,
  moduleKey: string,
  optionKey: string,
): boolean {
  if (!enabledModules) return false;

  // Try composite key: "moduleKey.optionKey" (e.g. "mediatheque.gerer")
  const compositeKey = `${moduleKey}.${optionKey}`;
  const compat = COMPAT_MAP[compositeKey];
  if (!compat) return false;

  if (compat.optionCheck) {
    const { moduleKey: mk, optionKey: ok } = compat.optionCheck;
    const state = getModuleState(enabledModules, mk);
    return !!(state?.enabled && state.options[ok]);
  }

  return compat.keys.some(k => {
    const state = getModuleState(enabledModules, k);
    return state?.enabled === true;
  });
}
