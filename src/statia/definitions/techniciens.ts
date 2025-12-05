/**
 * StatIA V1 - Définitions des métriques par Technicien
 * Réutilise les formules existantes Classe A de technicienUniversEngine
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { 
  normalizeUniversSlug,
  normalizeInterventionType,
  isProductiveInterventionType,
  isNonProductiveInterventionType,
  isValidInterventionState,
  isFactureStateIncluded
} from '../engine/normalizers';
import { extractFactureMeta } from '../rules/rules';
import { indexProjectsById, indexUsersById } from '../engine/loaders';

/**
 * Interface pour les stats technicien
 */
interface TechnicianStats {
  technicianId: string | number;
  technicianName: string;
  totalCA: number;
  totalHeures: number;
  caParHeure: number;
  byUnivers: Record<string, { ca: number; heures: number }>;
}

/**
 * Calcule le temps passé par technicien par projet
 * Adapté de technicienUniversEngine.calculateTechTimeByProject
 */
function calculateTechTimeByProject(
  interventions: any[],
  projectsById: Map<string | number, any>
): { 
  dureeTechParProjet: Map<string, Map<string | number, number>>; 
  dureeTotaleParProjet: Map<string, number>;
} {
  const dureeTechParProjet = new Map<string, Map<string | number, number>>();
  const dureeTotaleParProjet = new Map<string, number>();
  
  for (const intervention of interventions) {
    // Filtrer les interventions non-productives (RT, SAV, diagnostic)
    const type = normalizeInterventionType(intervention.type || intervention.type2);
    if (isNonProductiveInterventionType(type)) continue;
    
    // Vérifier l'état de l'intervention
    if (!isValidInterventionState(intervention.state)) continue;
    
    const projectId = String(intervention.projectId || intervention.project_id);
    if (!projectId) continue;
    
    // Parcourir les visites validées
    const visites = intervention.visites || [];
    for (const visite of visites) {
      if (visite.state !== 'validated' && visite.state !== 'done') continue;
      
      const duree = visite.duree || visite.duration || 1; // Durée en heures, défaut 1h
      const techIds = visite.usersIds || [intervention.userId];
      
      for (const techId of techIds) {
        if (!techId) continue;
        
        // Ajouter au temps par technicien par projet
        if (!dureeTechParProjet.has(projectId)) {
          dureeTechParProjet.set(projectId, new Map());
        }
        const projectTechMap = dureeTechParProjet.get(projectId)!;
        projectTechMap.set(techId, (projectTechMap.get(techId) || 0) + duree);
        
        // Ajouter au temps total du projet
        dureeTotaleParProjet.set(projectId, (dureeTotaleParProjet.get(projectId) || 0) + duree);
      }
    }
  }
  
  return { dureeTechParProjet, dureeTotaleParProjet };
}

/**
 * CA par Technicien × Univers
 * Conforme à computeTechUniversStatsForAgency de technicienUniversEngine
 */
export const caParTechnicienUnivers: StatDefinition = {
  id: 'ca_par_technicien_univers',
  label: 'CA par Technicien × Univers',
  description: 'Répartition du CA entre techniciens ventilée par univers',
  category: 'technicien',
  source: ['factures', 'projects', 'interventions', 'users'],
  dimensions: ['technicien', 'univers'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, interventions, users } = data;
    
    const projectsById = indexProjectsById(projects);
    const usersById = indexUsersById(users);
    
    // Calculer le temps par technicien par projet
    const { dureeTechParProjet, dureeTotaleParProjet } = calculateTechTimeByProject(
      interventions, 
      projectsById
    );
    
    // Structure pour accumuler les stats
    const techStats = new Map<string | number, TechnicianStats>();
    
    // Parcourir les factures
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = String(facture.projectId || facture.project_id);
      const project = projectId ? projectsById.get(projectId) : null;
      
      // Récupérer les univers du projet
      const universes = project?.data?.universes || project?.universes || ['non-classe'];
      const normalizedUniverses = universes.map(normalizeUniversSlug);
      
      // Récupérer le temps des techniciens sur ce projet
      const projectTechTime = dureeTechParProjet.get(projectId);
      const totalProjectTime = dureeTotaleParProjet.get(projectId) || 0;
      
      if (!projectTechTime || totalProjectTime === 0) {
        // Pas de temps technicien = CA non attribué
        continue;
      }
      
      // Répartir le CA proportionnellement au temps
      for (const [techId, techTime] of projectTechTime.entries()) {
        const proportion = techTime / totalProjectTime;
        const techCA = meta.montantNetHT * proportion;
        
        // Initialiser les stats du technicien si nécessaire
        if (!techStats.has(techId)) {
          const user = usersById.get(techId);
          techStats.set(techId, {
            technicianId: techId,
            technicianName: user ? `${user.firstname || ''} ${user.lastname || ''}`.trim() : `Tech ${techId}`,
            totalCA: 0,
            totalHeures: 0,
            caParHeure: 0,
            byUnivers: {},
          });
        }
        
        const stats = techStats.get(techId)!;
        stats.totalCA += techCA;
        stats.totalHeures += techTime;
        
        // Répartir par univers
        const caParUnivers = techCA / normalizedUniverses.length;
        const heuresParUnivers = techTime / normalizedUniverses.length;
        
        for (const univers of normalizedUniverses) {
          if (!stats.byUnivers[univers]) {
            stats.byUnivers[univers] = { ca: 0, heures: 0 };
          }
          stats.byUnivers[univers].ca += caParUnivers;
          stats.byUnivers[univers].heures += heuresParUnivers;
        }
      }
    }
    
    // Calculer CA/heure pour chaque technicien
    for (const stats of techStats.values()) {
      stats.caParHeure = stats.totalHeures > 0 ? stats.totalCA / stats.totalHeures : 0;
    }
    
    // Formater le résultat
    const result: Record<string, any> = {};
    let totalCA = 0;
    
    for (const [techId, stats] of techStats.entries()) {
      result[String(techId)] = {
        name: stats.technicianName,
        ca: stats.totalCA,
        heures: stats.totalHeures,
        caParHeure: stats.caParHeure,
        byUnivers: stats.byUnivers,
      };
      totalCA += stats.totalCA;
    }
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: techStats.size,
      },
      breakdown: {
        total: totalCA,
        technicianCount: techStats.size,
      }
    };
  }
};

/**
 * CA par Technicien (simplifié)
 */
export const caParTechnicien: StatDefinition = {
  id: 'ca_par_technicien',
  label: 'CA par Technicien',
  description: 'Chiffre d\'affaires attribué à chaque technicien',
  category: 'technicien',
  source: ['factures', 'projects', 'interventions', 'users'],
  dimensions: ['technicien'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    // Réutiliser le calcul détaillé
    const detailedResult = caParTechnicienUnivers.compute(data, params);
    
    // Simplifier pour ne garder que le CA par technicien
    const result: Record<string, number> = {};
    const names: Record<string, string> = {};
    
    for (const [techId, stats] of Object.entries(detailedResult.value as Record<string, any>)) {
      result[techId] = stats.ca;
      names[techId] = stats.name;
    }
    
    return {
      value: result,
      metadata: detailedResult.metadata,
      breakdown: {
        ...detailedResult.breakdown,
        names,
      }
    };
  }
};

/**
 * Top N Techniciens par CA
 */
export const topTechniciensCA: StatDefinition = {
  id: 'top_techniciens_ca',
  label: 'Top Techniciens (CA)',
  description: 'Classement des meilleurs techniciens par CA',
  category: 'technicien',
  source: ['factures', 'projects', 'interventions', 'users'],
  dimensions: ['technicien'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const baseResult = caParTechnicien.compute(data, params);
    
    // Trier par CA décroissant
    const entries = Object.entries(baseResult.value as Record<string, number>);
    entries.sort((a, b) => b[1] - a[1]);
    
    const topN = params.filters?.topN || 10;
    const topEntries = entries.slice(0, topN);
    
    const result: Record<string, number> = {};
    for (const [id, ca] of topEntries) {
      result[id] = ca;
    }
    
    return {
      value: result,
      metadata: baseResult.metadata,
      breakdown: {
        ...baseResult.breakdown,
        ranking: topEntries.map(([id], index) => ({ 
          rank: index + 1, 
          id, 
          name: baseResult.breakdown?.names?.[id] 
        })),
      }
    };
  }
};

/**
 * CA Moyen par Technicien (mois en cours)
 * KPI simple : CA total productif / nombre de techniciens actifs
 * 
 * Règle métier :
 * - Période = dateRange fourni (typiquement mois en cours)
 * - Factures : normales + avoirs (négatifs) 
 * - Techniciens actifs = ceux ayant au moins une part de CA > 0
 * - Formule : CA_total / nb_tech_actifs
 */
export const caMoyenParTech: StatDefinition = {
  id: 'ca_moyen_par_tech',
  label: 'CA moyen par technicien',
  description: 'CA productif moyen par technicien sur la période (factures productives, visites validées, répartition prorata techniciens)',
  category: 'technicien',
  source: ['factures', 'projects', 'interventions', 'users'],
  dimensions: [],
  aggregation: 'avg',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    // Réutiliser le calcul CA par technicien
    const baseResult = caParTechnicien.compute(data, params);
    const caByTech = baseResult.value as Record<string, number>;
    
    // Filtrer les techniciens actifs (CA > 0)
    const techsActifs = Object.entries(caByTech).filter(([, ca]) => ca > 0);
    const nbTechActifs = techsActifs.length;
    
    // Calculer CA total productif
    const caTotal = techsActifs.reduce((sum, [, ca]) => sum + ca, 0);
    
    // CA moyen (éviter division par 0)
    const caMoyen = nbTechActifs > 0 ? caTotal / nbTechActifs : 0;
    
    return {
      value: caMoyen,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: nbTechActifs,
      },
      breakdown: {
        caTotal,
        nbTechActifs,
        techniciens: techsActifs.map(([id, ca]) => ({
          id,
          name: baseResult.breakdown?.names?.[id] || `Tech ${id}`,
          ca,
        })),
      }
    };
  }
};

export const techniciensDefinitions = {
  ca_par_technicien_univers: caParTechnicienUnivers,
  ca_par_technicien: caParTechnicien,
  top_techniciens_ca: topTechniciensCA,
  ca_moyen_par_tech: caMoyenParTech,
};
