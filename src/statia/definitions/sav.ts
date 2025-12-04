/**
 * StatIA V2 - Définitions des métriques SAV
 * Consolidation complète des métriques SAV depuis savCalculations et autres sources
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { 
  normalizeUniversSlug,
  extractProjectUniverses,
  isFactureStateIncluded
} from '../engine/normalizers';
import { extractFactureMeta } from '../rules/rules';
import { indexProjectsById } from '../engine/loaders';
import { parseISO, isWithinInterval } from 'date-fns';

/**
 * Détecte si une intervention est de type SAV
 */
function isSAVIntervention(intervention: any): boolean {
  const type2 = (intervention.data?.type2 || intervention.type2 || '').toLowerCase();
  const type = (intervention.data?.type || intervention.type || '').toLowerCase();
  const pictos = intervention.data?.pictosInterv || [];
  
  return (
    type2.includes('sav') || 
    type.includes('sav') || 
    pictos.includes('SAV')
  );
}

/**
 * Détecte si un projet est un SAV (dossier enfant/lié)
 */
function isSAVProject(project: any): boolean {
  return !!(
    project.parentProjectId || 
    project.parent_project_id ||
    project.data?.parentId ||
    project.data?.isSAV ||
    (project.type && project.type.toLowerCase().includes('sav'))
  );
}

/**
 * Détecte si un projet a eu un SAV (via interventions ou pictos)
 */
function projectHasSAV(project: any, interventions: any[]): boolean {
  const projectId = project.id;
  
  // Via interventions
  const hasSAVIntervention = interventions.some(
    i => i.projectId === projectId && isSAVIntervention(i)
  );
  
  // Via picto projet
  const pictos = project.data?.pictoInterv || [];
  const hasSAVPicto = pictos.includes('SAV');
  
  // Via sinistre
  const sinistre = (project.data?.sinistre || '').toLowerCase();
  const hasSAVSinistre = sinistre === 'sav';
  
  // Via relation parent
  const isChildSAV = isSAVProject(project);
  
  return hasSAVIntervention || hasSAVPicto || hasSAVSinistre || isChildSAV;
}

/**
 * Taux SAV Global
 * Pourcentage de dossiers ayant généré un SAV
 */
export const tauxSavGlobal: StatDefinition = {
  id: 'taux_sav_global',
  label: 'Taux SAV Global',
  description: 'Pourcentage de dossiers ayant généré un SAV',
  category: 'sav',
  source: ['projects', 'interventions'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, interventions } = data;
    
    let totalProjects = 0;
    let savProjects = 0;
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at;
      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          if (!isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      totalProjects++;
      
      if (projectHasSAV(project, interventions)) {
        savProjects++;
      }
    }
    
    const taux = totalProjects > 0 ? (savProjects / totalProjects) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: totalProjects,
      },
      breakdown: {
        totalProjects,
        savProjects,
        projetsSansSAV: totalProjects - savProjects,
      }
    };
  }
};

/**
 * Taux SAV par Univers
 */
export const tauxSavParUnivers: StatDefinition = {
  id: 'taux_sav_par_univers',
  label: 'Taux SAV par Univers',
  description: 'Pourcentage de SAV ventilé par univers métier',
  category: 'sav',
  source: ['projects', 'interventions'],
  dimensions: ['univers'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, interventions } = data;
    
    const statsByUnivers = new Map<string, { total: number; sav: number }>();
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at;
      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          if (!isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      const universes = extractProjectUniverses(project);
      if (universes.length === 0) continue;
      
      const hasSAV = projectHasSAV(project, interventions);
      
      for (const univers of universes) {
        if (!statsByUnivers.has(univers)) {
          statsByUnivers.set(univers, { total: 0, sav: 0 });
        }
        const stats = statsByUnivers.get(univers)!;
        stats.total++;
        if (hasSAV) stats.sav++;
      }
    }
    
    const result: Record<string, number> = {};
    statsByUnivers.forEach((stats, univers) => {
      result[univers] = stats.total > 0 
        ? Math.round((stats.sav / stats.total) * 1000) / 10 
        : 0;
    });
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: projects.length,
      }
    };
  }
};

/**
 * Taux SAV par Apporteur
 */
export const tauxSavParApporteur: StatDefinition = {
  id: 'taux_sav_par_apporteur',
  label: 'Taux SAV par Apporteur',
  description: 'Taux de SAV ventilé par apporteur',
  category: 'sav',
  source: ['projects', 'interventions', 'clients'],
  dimensions: ['apporteur'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, interventions, clients } = data;
    
    const clientsMap = new Map(clients.map(c => [c.id, c]));
    const statsByApporteur = new Map<string, { total: number; sav: number; name: string }>();
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at;
      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          if (!isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
      const apporteurKey = commanditaireId ? String(commanditaireId) : 'direct';
      const client = commanditaireId ? clientsMap.get(commanditaireId) : null;
      const apporteurName = client?.nom || client?.name || (commanditaireId ? `Apporteur ${commanditaireId}` : 'Direct');
      
      if (!statsByApporteur.has(apporteurKey)) {
        statsByApporteur.set(apporteurKey, { total: 0, sav: 0, name: apporteurName });
      }
      
      const stats = statsByApporteur.get(apporteurKey)!;
      stats.total++;
      
      if (projectHasSAV(project, interventions)) {
        stats.sav++;
      }
    }
    
    const result: Record<string, number> = {};
    const details: Record<string, any> = {};
    
    statsByApporteur.forEach((stats, apporteurId) => {
      const taux = stats.total > 0 ? (stats.sav / stats.total) * 100 : 0;
      result[stats.name] = Math.round(taux * 10) / 10;
      details[apporteurId] = {
        name: stats.name,
        total: stats.total,
        sav: stats.sav,
        taux: Math.round(taux * 10) / 10,
      };
    });
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: projects.length,
      },
      breakdown: details
    };
  }
};

/**
 * Nombre de SAV
 */
export const nombreSav: StatDefinition = {
  id: 'nombre_sav',
  label: 'Nombre de SAV',
  description: 'Nombre total de dossiers SAV',
  category: 'sav',
  source: ['projects', 'interventions'],
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, interventions } = data;
    
    let savCount = 0;
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at;
      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          if (!isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      if (projectHasSAV(project, interventions)) {
        savCount++;
      }
    }
    
    return {
      value: savCount,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: savCount,
      }
    };
  }
};

/**
 * Nombre d'interventions SAV
 */
export const nbInterventionsSav: StatDefinition = {
  id: 'nb_interventions_sav',
  label: 'Nb interventions SAV',
  description: 'Nombre total d\'interventions SAV sur la période',
  category: 'sav',
  source: 'interventions',
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions } = data;
    
    let count = 0;
    
    for (const intervention of interventions) {
      const date = intervention.date || intervention.created_at;
      if (date) {
        try {
          const interventionDate = parseISO(date);
          if (!isWithinInterval(interventionDate, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      if (isSAVIntervention(intervention)) {
        count++;
      }
    }
    
    return {
      value: count,
      metadata: {
        computedAt: new Date(),
        source: 'interventions',
        recordCount: count,
      }
    };
  }
};

/**
 * CA impacté par SAV (estimation)
 * CA des dossiers ayant eu un SAV (potentiel impacté)
 */
export const caImpacteSav: StatDefinition = {
  id: 'ca_impacte_sav',
  label: 'CA impacté par SAV',
  description: 'Chiffre d\'affaires des dossiers ayant généré un SAV',
  category: 'sav',
  source: ['factures', 'projects', 'interventions'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, interventions } = data;
    
    const projectsMap = new Map(projects.map(p => [p.id, p]));
    
    // Identifier les projets avec SAV
    const projetsSAV = new Set<number | string>();
    for (const project of projects) {
      if (projectHasSAV(project, interventions)) {
        projetsSAV.add(project.id);
      }
    }
    
    let caImpacte = 0;
    let nbFactures = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      if (!meta.date) continue;
      if (!isWithinInterval(meta.date, { start: params.dateRange.start, end: params.dateRange.end })) {
        continue;
      }
      
      if (projetsSAV.has(facture.projectId)) {
        caImpacte += meta.montantNetHT;
        nbFactures++;
      }
    }
    
    return {
      value: Math.round(caImpacte * 100) / 100,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: nbFactures,
      },
      breakdown: {
        nbProjetsSAV: projetsSAV.size,
        nbFactures,
      }
    };
  }
};

export const savDefinitions = {
  taux_sav_global: tauxSavGlobal,
  taux_sav_par_univers: tauxSavParUnivers,
  taux_sav_par_apporteur: tauxSavParApporteur,
  nombre_sav: nombreSav,
  nb_interventions_sav: nbInterventionsSav,
  ca_impacte_sav: caImpacteSav,
};
