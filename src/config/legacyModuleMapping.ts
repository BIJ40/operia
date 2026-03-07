/**
 * LEGACY MODULE MAPPING
 * @deprecated Temporary bridge between new hierarchical keys and old flat keys.
 * No new code should consume legacy keys. This file will be removed once all
 * consumers are migrated to the new registry keys.
 * 
 * Mapping types:
 * - Cas A: leaf → old option (e.g. outils.parc.vehicules → parc.vehicules)  
 * - Cas B: screen → old module (e.g. guides.apogee → guides)
 * - Cas C: aggregation of children → single legacy key (e.g. stats.* → stats)
 */

/**
 * Maps new registry keys to legacy module+option pairs.
 * Format: { registryKey: { legacyModule, legacyOption? } }
 * 
 * When legacyOption is undefined, the registry key maps to a module-level enable.
 * When legacyOption is defined, it maps to a specific option within a legacy module.
 */
export interface LegacyMapping {
  legacyModule: string;
  legacyOption?: string;
}

export const REGISTRY_TO_LEGACY: Record<string, LegacyMapping> = {
  // Stats — aggregate to 'stats' or 'pilotage_agence'
  'stats':              { legacyModule: 'stats' },
  'stats.general':      { legacyModule: 'stats' },
  'stats.apporteurs':   { legacyModule: 'stats' },
  'stats.techniciens':  { legacyModule: 'stats' },
  'stats.univers':      { legacyModule: 'stats' },
  'stats.sav':          { legacyModule: 'stats' },
  'stats.previsionnel': { legacyModule: 'stats', legacyOption: 'previsionnel' },
  'stats.exports':      { legacyModule: 'stats', legacyOption: 'exports' },

  // Salariés → rh module
  'salaries':               { legacyModule: 'rh' },
  'salaries.gestionnaire':  { legacyModule: 'rh', legacyOption: 'rh_viewer' },
  'salaries.admin_rh':      { legacyModule: 'rh', legacyOption: 'rh_admin' },

  // Outils
  'outils':                           { legacyModule: 'agence' },
  'outils.actions':                   { legacyModule: 'agence', legacyOption: 'actions' },
  'outils.apporteurs':                { legacyModule: 'agence', legacyOption: 'mes_apporteurs' },
  'outils.apporteurs.consulter':      { legacyModule: 'agence', legacyOption: 'mes_apporteurs' },
  'outils.apporteurs.gerer':          { legacyModule: 'agence', legacyOption: 'gestion_apporteurs' },
  'outils.administratif':             { legacyModule: 'agence' },
  'outils.administratif.plannings':   { legacyModule: 'agence', legacyOption: 'plannings' },
  'outils.administratif.reunions':    { legacyModule: 'agence', legacyOption: 'reunions' },
  'outils.administratif.documents':   { legacyModule: 'agence', legacyOption: 'documents_admin' },
  'outils.parc':                      { legacyModule: 'parc' },
  'outils.parc.vehicules':            { legacyModule: 'parc', legacyOption: 'vehicules' },
  'outils.parc.epi':                  { legacyModule: 'parc', legacyOption: 'epi' },
  'outils.parc.equipements':          { legacyModule: 'parc', legacyOption: 'equipements' },
  'outils.performance':               { legacyModule: 'agence', legacyOption: 'performance' },
  'outils.commercial':                { legacyModule: 'agence', legacyOption: 'commercial' },

  // Documents
  'documents':                { legacyModule: 'divers_documents' },
  'documents.consulter':      { legacyModule: 'divers_documents', legacyOption: 'consulter' },
  'documents.gerer':          { legacyModule: 'divers_documents', legacyOption: 'gerer' },
  'documents.corbeille_vider':{ legacyModule: 'divers_documents', legacyOption: 'corbeille_vider' },

  // Guides
  'guides':             { legacyModule: 'guides' },
  'guides.apogee':      { legacyModule: 'guides' },
  'guides.apporteurs':  { legacyModule: 'guides' },
  'guides.helpconfort': { legacyModule: 'guides' },
  'guides.faq':         { legacyModule: 'guides' },

  // Ticketing → apogee_tickets
  'ticketing':         { legacyModule: 'apogee_tickets' },
  'ticketing.kanban':  { legacyModule: 'apogee_tickets', legacyOption: 'kanban' },
  'ticketing.create':  { legacyModule: 'apogee_tickets', legacyOption: 'create' },
  'ticketing.manage':  { legacyModule: 'apogee_tickets', legacyOption: 'manage' },
  'ticketing.import':  { legacyModule: 'apogee_tickets', legacyOption: 'import' },

  // Aide → support
  'aide':       { legacyModule: 'support' },
  'aide.user':  { legacyModule: 'support', legacyOption: 'user' },
  'aide.agent': { legacyModule: 'support', legacyOption: 'agent' },
};

/**
 * Given a set of active registry keys, produce the legacy module map
 * expected by the existing frontend code.
 */
export function projectToLegacyModules(
  activeRegistryKeys: Set<string>
): Record<string, { enabled: boolean; options: Record<string, boolean> }> {
  const result: Record<string, { enabled: boolean; options: Record<string, boolean> }> = {};

  for (const registryKey of activeRegistryKeys) {
    const mapping = REGISTRY_TO_LEGACY[registryKey];
    if (!mapping) continue;

    const { legacyModule, legacyOption } = mapping;

    if (!result[legacyModule]) {
      result[legacyModule] = { enabled: true, options: {} };
    }

    result[legacyModule].enabled = true;

    if (legacyOption) {
      result[legacyModule].options[legacyOption] = true;
    }
  }

  return result;
}
