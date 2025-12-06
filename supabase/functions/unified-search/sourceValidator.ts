/**
 * Source Validator Module
 * Validation des sources avant calcul StatIA
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ApogeeData {
  factures: any[];
  projects: any[];
  clients: any[];
  interventions: any[];
  users: any[];
}

export interface SourceValidationResult {
  isValid: boolean;
  missingSources: string[];
  emptySources: string[];
  errorMessage?: string;
}

// ═══════════════════════════════════════════════════════════════
// METRICS REQUIRING FULL SOURCES
// ═══════════════════════════════════════════════════════════════

/**
 * Métriques qui nécessitent TOUTES les sources complètes
 * Pour ces métriques, on force le chargement complet même si getRequiredSources est mal câblé
 */
export const METRICS_NEED_FULL_SOURCES = new Set([
  'ca_par_technicien',
  'ca_par_apporteur', 
  'ca_par_univers',
  'top_techniciens_ca',
  'top_apporteurs_ca',
  'ca_moyen_par_tech',
  'nb_interventions_par_technicien',
  'taux_sav_par_technicien',
  'sav_par_apporteur',
]);

/**
 * Sources complètes pour les métriques sensibles
 */
export const FULL_SOURCES = ['factures', 'projects', 'interventions', 'users', 'clients'];

/**
 * Retourne les sources forcées si la métrique est sensible
 */
export function getEnforcedSources(metricId: string, originalSources: string[]): string[] {
  if (METRICS_NEED_FULL_SOURCES.has(metricId)) {
    console.log(`[sourceValidator] FORCE FULL SOURCES for ${metricId}`);
    return FULL_SOURCES;
  }
  return originalSources;
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Valide que toutes les sources requises sont chargées et non vides
 * Lance une erreur si validation échoue
 */
export function validateSourcesOrThrow(
  metricId: string, 
  requiredSources: string[], 
  data: ApogeeData
): void {
  const result = validateSources(metricId, requiredSources, data);
  
  if (!result.isValid) {
    throw new Error(`STATIA_DATA_MISSING: metric=${metricId}, ${result.errorMessage}`);
  }
}

/**
 * Valide les sources et retourne un résultat structuré
 */
export function validateSources(
  metricId: string,
  requiredSources: string[],
  data: ApogeeData
): SourceValidationResult {
  const missingSources: string[] = [];
  const emptySources: string[] = [];
  
  for (const src of requiredSources) {
    const sourceData = (data as Record<string, any>)[src];
    
    if (sourceData === undefined || sourceData === null) {
      missingSources.push(src);
    } else if (!Array.isArray(sourceData)) {
      missingSources.push(src);
    } else if (sourceData.length === 0) {
      // Pour certaines métriques, une source vide peut être acceptable
      // Ex: pas d'interventions sur une période = pas de CA technicien
      // Mais on log quand même pour debug
      emptySources.push(src);
    }
  }
  
  // Sources vraiment critiques = celles qui sont vraiment manquantes (pas juste vides)
  if (missingSources.length > 0) {
    return {
      isValid: false,
      missingSources,
      emptySources,
      errorMessage: `sources manquantes: ${missingSources.join(', ')}`
    };
  }
  
  // Pour les métriques technicien/apporteur/univers, interventions et users sont CRITIQUES
  if (METRICS_NEED_FULL_SOURCES.has(metricId)) {
    // Si factures vides → pas de CA à attribuer
    if (emptySources.includes('factures')) {
      return {
        isValid: false,
        missingSources: [],
        emptySources,
        errorMessage: `aucune facture trouvée pour cette période`
      };
    }
    
    // Pour les métriques technicien, interventions ET users sont indispensables
    if (metricId.includes('technicien') || metricId.includes('tech')) {
      if (emptySources.includes('interventions') || emptySources.includes('users')) {
        return {
          isValid: false,
          missingSources: [],
          emptySources,
          errorMessage: `données techniciens incomplètes (interventions: ${data.interventions?.length ?? 0}, users: ${data.users?.length ?? 0})`
        };
      }
    }
  }
  
  return {
    isValid: true,
    missingSources: [],
    emptySources
  };
}

/**
 * Log de debug des sources chargées
 */
export function logSourcesDebug(metricId: string, data: ApogeeData): void {
  console.log('[DEBUG STATIA IA SOURCES]', {
    metricId,
    factures: data.factures?.length ?? 'undefined',
    projects: data.projects?.length ?? 'undefined',
    interventions: data.interventions?.length ?? 'undefined',
    users: data.users?.length ?? 'undefined',
    clients: data.clients?.length ?? 'undefined',
  });
}

/**
 * Génère un message d'erreur utilisateur-friendly
 */
export function buildUserFriendlyError(validationResult: SourceValidationResult): string {
  if (validationResult.missingSources.length > 0) {
    return `Impossible de calculer cette statistique : les données nécessaires (${validationResult.missingSources.join(', ')}) ne sont pas disponibles. Vérifiez la connexion à Apogée.`;
  }
  
  // Erreur spécifique techniciens
  if (validationResult.emptySources.includes('interventions') || 
      validationResult.emptySources.includes('users')) {
    return `Les données techniciens ne sont pas disponibles pour cette période (interventions: ${validationResult.emptySources.includes('interventions') ? 'vide' : 'ok'}, users: ${validationResult.emptySources.includes('users') ? 'vide' : 'ok'}). Impossible de calculer le CA par technicien.`;
  }
  
  if (validationResult.emptySources.includes('factures')) {
    return `Aucune facture trouvée pour cette période. Vérifiez les dates ou les filtres appliqués.`;
  }
  
  return `Les données nécessaires pour ce calcul ne sont pas disponibles.`;
}
