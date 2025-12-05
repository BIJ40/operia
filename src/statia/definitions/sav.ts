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
 * Identifie si une intervention est "réalisée" (terminée)
 */
function isInterventionRealisee(intervention: any): boolean {
  const state = (intervention.state || intervention.statut || intervention.data?.state || '').toLowerCase();
  return ['done', 'finished', 'validated', 'completed', 'réalisée', 'terminée'].includes(state);
}

/**
 * Taux SAV Global (basé interventions)
 * taux = nb_interventions_SAV / nb_interventions_initiales
 * Intervention initiale = première intervention réalisée par dossier (min date)
 */
export const tauxSavGlobal: StatDefinition = {
  id: 'taux_sav_global',
  label: 'Taux SAV Global',
  description: 'Taux de SAV = nb interventions SAV / nb interventions initiales (par dossier)',
  category: 'sav',
  source: ['interventions'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions } = data;
    
    console.log('[StatIA] TAUX_SAV_GLOBAL - START', { nbInterventions: interventions.length });
    
    // 1. Filtrer interventions réalisées dans la période
    const interventionsRealisees: any[] = [];
    
    for (const intervention of interventions) {
      if (!isInterventionRealisee(intervention)) continue;
      
      const dateStr = intervention.dateReelle || intervention.date || intervention.data?.dateReelle || intervention.created_at;
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
      
      interventionsRealisees.push(intervention);
    }
    
    console.log('[StatIA] TAUX_SAV_GLOBAL - Interventions réalisées:', interventionsRealisees.length);
    
    // 2. Grouper par dossier et identifier intervention initiale
    const parDossier = new Map<string | number, { interventions: any[], dateMin: Date | null }>();
    
    for (const intervention of interventionsRealisees) {
      const projectId = intervention.projectId || intervention.project_id;
      if (!projectId) continue;
      
      if (!parDossier.has(projectId)) {
        parDossier.set(projectId, { interventions: [], dateMin: null });
      }
      
      const group = parDossier.get(projectId)!;
      group.interventions.push(intervention);
      
      const dateStr = intervention.dateReelle || intervention.date || intervention.data?.dateReelle;
      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          if (!group.dateMin || date < group.dateMin) {
            group.dateMin = date;
          }
        } catch {}
      }
    }
    
    // 3. Compter interventions initiales et SAV
    let nbInterventionsInitiales = 0;
    let nbInterventionsSAV = 0;
    
    for (const [projectId, group] of parDossier) {
      // Chaque dossier a une intervention initiale
      nbInterventionsInitiales++;
      
      // Compter les SAV dans ce dossier
      for (const intervention of group.interventions) {
        if (isSAVIntervention(intervention)) {
          nbInterventionsSAV++;
        }
      }
    }
    
    console.log('[StatIA] TAUX_SAV_GLOBAL - Résultat:', { 
      nbDossiers: parDossier.size,
      nbInterventionsInitiales, 
      nbInterventionsSAV 
    });
    
    // 4. Calculer taux
    const taux = nbInterventionsInitiales > 0 
      ? (nbInterventionsSAV / nbInterventionsInitiales) * 100 
      : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'interventions',
        recordCount: interventionsRealisees.length,
      },
      breakdown: {
        nbInterventionsInitiales,
        nbInterventionsSAV,
        nbDossiers: parDossier.size,
        taux: Math.round(taux * 10) / 10,
      }
    };
  }
};

/**
 * Taux SAV par Univers
 * Proportion de dossiers SAV par univers
 */
export const tauxSavParUnivers: StatDefinition = {
  id: 'taux_sav_par_univers',
  label: 'Taux SAV par Univers',
  description: 'Proportion de dossiers SAV par univers',
  category: 'sav',
  source: ['projects'],
  unit: '%',
  dimensions: ['univers'],
  aggregation: 'ratio',

  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;

    const totalByUnivers: Record<string, number> = {};
    const savByUnivers: Record<string, number> = {};

    for (const project of projects) {
      const dateStr = project.date || project.created_at;
      if (!dateStr) continue;

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;

      if (params.dateRange && (date < params.dateRange.start || date > params.dateRange.end)) {
        continue;
      }

      const universes = extractProjectUniverses(project);
      const finalUniverses = universes.length > 0 ? universes : ['non-classe'];

      const isSav = isSAVProject(project);

      for (const u of finalUniverses) {
        totalByUnivers[u] = (totalByUnivers[u] || 0) + 1;
        if (isSav) {
          savByUnivers[u] = (savByUnivers[u] || 0) + 1;
        }
      }
    }

    const result: Record<string, number> = {};
    const details: Record<string, { total: number; sav: number; taux: number }> = {};

    for (const u of Object.keys(totalByUnivers)) {
      const total = totalByUnivers[u] || 0;
      const sav = savByUnivers[u] || 0;
      const taux = total > 0 ? (sav / total) * 100 : 0;
      const tauxRounded = Math.round(taux * 10) / 10;

      result[u] = tauxRounded;
      details[u] = { total, sav, taux: tauxRounded };
    }

    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: projects.length,
      },
      breakdown: { details },
    };
  },
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
 * Nombre de SAV sur la période
 * Compte les dossiers SAV (projets enfants/liés)
 */
export const nbSavGlobal: StatDefinition = {
  id: 'nb_sav_global',
  label: 'Nombre de SAV',
  description: 'Nombre de dossiers SAV sur la période',
  category: 'sav',
  source: ['projects'],
  unit: '',
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    let nbSav = 0;
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at;
      if (!dateStr) continue;
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;
      
      if (params.dateRange && (date < params.dateRange.start || date > params.dateRange.end)) {
        continue;
      }
      
      if (isSAVProject(project)) {
        nbSav++;
      }
    }
    
    return {
      value: nbSav,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: nbSav,
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
  nb_sav_global: nbSavGlobal,
  nb_interventions_sav: nbInterventionsSav,
  ca_impacte_sav: caImpacteSav,
};
