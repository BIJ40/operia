/**
 * StatIA V2 - Définitions métriques Complexité Dossiers
 * 
 * Règle "Dossier Complexe" :
 * - Au moins 6 visites
 * - Au moins 2500€ HT de CA
 * - Au moins 2 univers
 */

import { StatDefinition, StatResult, LoadedData, StatParams } from './types';
import { logDebug } from '@/lib/logger';
import { parseISO, isWithinInterval } from 'date-fns';

// ============================================================================
// CONSTANTES RÈGLES MÉTIER
// ============================================================================

export const DOSSIER_COMPLEXE_RULES = {
  minVisites: 6,
  minCaHt: 2500,
  minUnivers: 2,
} as const;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Compte le nombre de visites d'un dossier via ses interventions
 */
function countVisitesForProject(interventions: any[], projectId: string): number {
  let totalVisites = 0;
  
  for (const intervention of interventions) {
    const intProjectId = intervention.projectId || intervention.data?.projectId;
    if (intProjectId !== projectId) continue;
    
    // Compter les visites dans l'intervention
    const visites = intervention.visites || intervention.data?.visites || [];
    if (Array.isArray(visites) && visites.length > 0) {
      totalVisites += visites.length;
    } else {
      // Si pas de visites explicites, compter l'intervention comme 1 visite
      totalVisites += 1;
    }
  }
  
  return totalVisites;
}

/**
 * Calcule le CA HT d'un dossier via ses factures
 */
function calculateCaHtForProject(factures: any[], projectId: string): number {
  let totalCaHt = 0;
  
  for (const facture of factures) {
    const factProjectId = facture.projectId || facture.data?.projectId;
    if (factProjectId !== projectId) continue;
    
    // Récupérer le montant HT
    const montantHt = facture.totalHT || facture.data?.totalHT || 
                      facture.montantHT || facture.data?.montantHT || 0;
    
    // Gérer les avoirs (négatif)
    const typeFacture = (facture.invoiceType || facture.type || facture.data?.invoiceType || '').toLowerCase();
    const isAvoir = typeFacture === 'avoir' || typeFacture === 'credit_note';
    
    totalCaHt += isAvoir ? -Math.abs(montantHt) : montantHt;
  }
  
  return totalCaHt;
}

/**
 * Compte le nombre d'univers d'un dossier
 */
function countUniversForProject(project: any): number {
  const universes = project?.data?.universes || project?.universes || [];
  return Array.isArray(universes) ? universes.length : 0;
}

/**
 * Vérifie si un dossier est complexe selon les règles métier
 */
function isDossierComplexe(
  project: any,
  interventions: any[],
  factures: any[],
  rules = DOSSIER_COMPLEXE_RULES
): { isComplexe: boolean; visites: number; caHt: number; univers: number } {
  const projectId = project.id || project.data?.id;
  
  const visites = countVisitesForProject(interventions, projectId);
  const caHt = calculateCaHtForProject(factures, projectId);
  const univers = countUniversForProject(project);
  
  // Un dossier est complexe si TOUS les critères sont remplis
  const isComplexe = visites >= rules.minVisites && 
                     caHt >= rules.minCaHt && 
                     univers >= rules.minUnivers;
  
  return { isComplexe, visites, caHt, univers };
}

// ============================================================================
// DÉFINITIONS MÉTRIQUES
// ============================================================================

/**
 * Taux de dossiers complexes
 * Critères : ≥6 visites ET ≥2500€ HT ET ≥2 univers
 */
export const tauxDossiersComplexes: StatDefinition = {
  id: 'taux_dossiers_complexes',
  label: 'Taux de dossiers complexes',
  category: 'complexite',
  source: ['projects', 'interventions', 'factures'],
  aggregation: 'ratio',
  unit: '%',
  description: `Pourcentage de dossiers répondant aux critères de complexité : 
    au moins ${DOSSIER_COMPLEXE_RULES.minVisites} visites, 
    au moins ${DOSSIER_COMPLEXE_RULES.minCaHt}€ HT, 
    au moins ${DOSSIER_COMPLEXE_RULES.minUnivers} univers`,
  
  compute(data: LoadedData, params: StatParams): StatResult {
    const { projects, interventions, factures } = data;
    const { dateRange } = params;
    
    // Construire un Set des projectIds qui ont au moins une facture (dossiers facturés)
    const projectIdsFactures = new Set<string>();
    for (const facture of factures) {
      const projectId = facture.projectId || facture.data?.projectId;
      if (projectId) {
        projectIdsFactures.add(projectId);
      }
    }
    
    logDebug('STATIA', 'tauxDossiersComplexes - START', {
      nbProjects: projects.length,
      nbInterventions: interventions.length,
      nbFactures: factures.length,
      nbProjectsFactures: projectIdsFactures.size,
      dateRange: dateRange ? { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() } : 'none'
    });
    
    // Filtrer les projets : uniquement les FACTURÉS et dans la période
    let projectsFiltres = projects.filter(project => {
      const projectId = project.id || project.data?.id;
      // Doit avoir au moins une facture
      if (!projectIdsFactures.has(projectId)) return false;
      
      // Filtre par période si fournie
      if (dateRange) {
        const date = project.date || project.data?.date || project.createdAt;
        if (!date) return false;
        
        try {
          const projectDate = parseISO(date);
          return isWithinInterval(projectDate, dateRange);
        } catch {
          return false;
        }
      }
      
      return true;
    });
    
    logDebug('STATIA', 'tauxDossiersComplexes - FILTERED', {
      nbProjectsFiltres: projectsFiltres.length,
      info: 'Uniquement dossiers FACTURÉS'
    });
    
    if (projectsFiltres.length === 0) {
      return {
        value: 0,
        breakdown: {
          tauxComplexite: 0,
          nbComplexes: 0,
          nbTotal: 0
        }
      };
    }
    
    // Analyser chaque projet facturé avec debug
    let nbComplexes = 0;
    const debugResults: Array<{ projectId: string; ref?: string; visites: number; caHt: number; univers: number; isComplexe: boolean }> = [];
    
    for (const project of projectsFiltres) {
      const result = isDossierComplexe(project, interventions, factures);
      debugResults.push({
        projectId: project.id,
        ref: project.ref || project.data?.ref,
        ...result,
      });
      if (result.isComplexe) {
        nbComplexes++;
      }
    }
    
    // Log les 10 premiers résultats pour debug
    logDebug('STATIA', 'tauxDossiersComplexes - SAMPLES', {
      sampleResults: debugResults.slice(0, 10),
      nbMatchingVisites: debugResults.filter(r => r.visites >= DOSSIER_COMPLEXE_RULES.minVisites).length,
      nbMatchingCaHt: debugResults.filter(r => r.caHt >= DOSSIER_COMPLEXE_RULES.minCaHt).length,
      nbMatchingUnivers: debugResults.filter(r => r.univers >= DOSSIER_COMPLEXE_RULES.minUnivers).length,
    });
    
    // Taux calculé sur les dossiers FACTURÉS uniquement
    const tauxComplexite = projectsFiltres.length > 0
      ? (nbComplexes / projectsFiltres.length) * 100
      : 0;
    
    logDebug('STATIA', 'tauxDossiersComplexes - RESULT', {
      tauxComplexite: Math.round(tauxComplexite * 10) / 10,
      nbComplexes,
      nbDossiersFactures: projectsFiltres.length
    });
    
    return {
      value: Math.round(tauxComplexite * 10) / 10,
      breakdown: {
        tauxComplexite: Math.round(tauxComplexite * 10) / 10,
        nbComplexes,
        nbTotal: projectsFiltres.length
      }
    };
  }
};

/**
 * Nombre de dossiers complexes
 */
export const nbDossiersComplexes: StatDefinition = {
  id: 'nb_dossiers_complexes',
  label: 'Nombre de dossiers complexes',
  category: 'complexite',
  source: ['projects', 'interventions', 'factures'],
  aggregation: 'count',
  unit: 'dossiers',
  description: `Nombre de dossiers répondant aux critères de complexité`,
  
  compute(data: LoadedData, params: StatParams): StatResult {
    const result = tauxDossiersComplexes.compute(data, params);
    const breakdown = result.breakdown || {};
    
    return {
      value: breakdown.nbComplexes || 0,
      breakdown: {
        nbComplexes: breakdown.nbComplexes || 0,
        nbTotal: breakdown.nbTotal || 0
      }
    };
  }
};

// ============================================================================
// EXPORT REGISTRE
// ============================================================================

export const complexiteDefinitions: Record<string, StatDefinition> = {
  taux_dossiers_complexes: tauxDossiersComplexes,
  nb_dossiers_complexes: nbDossiersComplexes,
};
