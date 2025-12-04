/**
 * StatIA V2 - Définitions des métriques Qualité
 * Famille de métriques pour l'analyse qualité et SAV
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { parseISO, isWithinInterval } from 'date-fns';
import { extractFactureMeta } from '../rules/rules';

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
 * Détecte si un projet a eu un SAV
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
  
  return hasSAVIntervention || hasSAVPicto || hasSAVSinistre;
}

/**
 * Taux SAV global
 */
export const tauxSavGlobal: StatDefinition = {
  id: 'taux_sav_global',
  label: 'Taux SAV global',
  description: 'Pourcentage de dossiers ayant généré un SAV',
  category: 'sav',
  source: ['interventions', 'projects'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, projects } = data;
    
    let totalProjets = 0;
    let projetsSAV = 0;
    
    for (const project of projects) {
      const dateCreation = project.created_at || project.createdAt || project.date;
      if (dateCreation) {
        try {
          const projectDate = parseISO(dateCreation);
          if (!isWithinInterval(projectDate, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      totalProjets++;
      
      if (projectHasSAV(project, interventions)) {
        projetsSAV++;
      }
    }
    
    const taux = totalProjets > 0 ? (projetsSAV / totalProjets) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: totalProjets,
      },
      breakdown: {
        totalProjets,
        projetsSAV,
        projetsSansSAV: totalProjets - projetsSAV,
      }
    };
  }
};

/**
 * Taux SAV par univers
 */
export const tauxSavParUnivers: StatDefinition = {
  id: 'taux_sav_par_univers',
  label: 'Taux SAV par univers',
  description: 'Taux de SAV ventilé par univers métier',
  category: 'sav',
  source: ['interventions', 'projects'],
  dimensions: ['univers'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, projects } = data;
    
    const statsByUnivers = new Map<string, { total: number; sav: number }>();
    
    for (const project of projects) {
      const dateCreation = project.created_at || project.createdAt || project.date;
      if (dateCreation) {
        try {
          const projectDate = parseISO(dateCreation);
          if (!isWithinInterval(projectDate, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      const universes = project.data?.universes || project.universes || [];
      if (universes.length === 0) continue;
      
      const hasSAV = projectHasSAV(project, interventions);
      
      for (const univers of universes) {
        const normalized = univers.toLowerCase();
        if (!statsByUnivers.has(normalized)) {
          statsByUnivers.set(normalized, { total: 0, sav: 0 });
        }
        const stats = statsByUnivers.get(normalized)!;
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
 * Taux SAV par apporteur
 */
export const tauxSavParApporteur: StatDefinition = {
  id: 'taux_sav_par_apporteur',
  label: 'Taux SAV par apporteur',
  description: 'Taux de SAV ventilé par apporteur',
  category: 'sav',
  source: ['interventions', 'projects', 'clients'],
  dimensions: ['apporteur'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, projects, clients } = data;
    
    const clientsMap = new Map(clients.map(c => [c.id, c]));
    const statsByApporteur = new Map<string, { total: number; sav: number; name: string }>();
    
    for (const project of projects) {
      const dateCreation = project.created_at || project.createdAt || project.date;
      if (dateCreation) {
        try {
          const projectDate = parseISO(dateCreation);
          if (!isWithinInterval(projectDate, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
      if (!commanditaireId) continue; // Particulier, pas d'apporteur
      
      const client = clientsMap.get(commanditaireId);
      const apporteurName = client?.nom || client?.prenom || `Apporteur ${commanditaireId}`;
      const apporteurKey = String(commanditaireId);
      
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
 * Nb interventions SAV
 */
export const nbInterventionsSav: StatDefinition = {
  id: 'nb_interventions_sav',
  label: 'Nb interventions SAV',
  description: 'Nombre total d\'interventions SAV sur la période',
  category: 'sav',
  source: 'interventions',
  aggregation: 'count',
  unit: '',
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

export const qualiteDefinitions = {
  taux_sav_global: tauxSavGlobal,
  taux_sav_par_univers: tauxSavParUnivers,
  taux_sav_par_apporteur: tauxSavParApporteur,
  nb_interventions_sav: nbInterventionsSav,
  ca_impacte_sav: caImpacteSav,
};
