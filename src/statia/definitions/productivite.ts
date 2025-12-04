/**
 * StatIA V2 - Définitions des métriques Productivité
 * Famille de métriques pour l'analyse de la productivité
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { parseISO, isWithinInterval } from 'date-fns';
import { extractFactureMeta } from '../rules/rules';
import { 
  computeTechUniversStatsForAgency, 
  isActiveTechnician 
} from '@/shared/utils/technicienUniversEngine';

/**
 * CA par heure global
 */
export const caParHeureGlobal: StatDefinition = {
  id: 'ca_par_heure_global',
  label: 'CA/heure global',
  description: 'Chiffre d\'affaires moyen par heure travaillée (tous techniciens)',
  category: 'productivite',
  source: ['factures', 'interventions', 'projects', 'users'],
  aggregation: 'avg',
  unit: '€/h',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, interventions, projects, users } = data;
    
    const stats = computeTechUniversStatsForAgency(
      factures,
      projects,
      interventions,
      users,
      params.dateRange
    );
    
    let totalCA = 0;
    let totalHeures = 0;
    
    for (const tech of stats) {
      totalCA += tech.totaux.caHT;
      totalHeures += tech.totaux.heures;
    }
    
    const caParHeure = totalHeures > 0 ? totalCA / totalHeures : 0;
    
    return {
      value: Math.round(caParHeure),
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: stats.length,
      },
      breakdown: {
        totalCA: Math.round(totalCA * 100) / 100,
        totalHeures: Math.round(totalHeures * 10) / 10,
        nbTechniciens: stats.length,
      }
    };
  }
};

/**
 * CA par heure par technicien
 */
export const caParHeureParTechnicien: StatDefinition = {
  id: 'ca_par_heure_par_technicien',
  label: 'CA/heure par technicien',
  description: 'CA par heure ventilé par technicien',
  category: 'productivite',
  source: ['factures', 'interventions', 'projects', 'users'],
  dimensions: ['technicien'],
  aggregation: 'avg',
  unit: '€/h',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, interventions, projects, users } = data;
    
    const stats = computeTechUniversStatsForAgency(
      factures,
      projects,
      interventions,
      users,
      params.dateRange
    );
    
    const result: Record<string, number> = {};
    
    for (const tech of stats) {
      result[tech.technicienNom] = tech.totaux.caParHeure;
    }
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: stats.length,
      }
    };
  }
};

/**
 * Productivité par univers
 */
export const productiviteParUnivers: StatDefinition = {
  id: 'productivite_par_univers',
  label: 'Productivité par univers',
  description: 'CA par heure ventilé par univers métier',
  category: 'productivite',
  source: ['factures', 'interventions', 'projects', 'users'],
  dimensions: ['univers'],
  aggregation: 'avg',
  unit: '€/h',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, interventions, projects, users } = data;
    
    const stats = computeTechUniversStatsForAgency(
      factures,
      projects,
      interventions,
      users,
      params.dateRange
    );
    
    // Agréger par univers
    const universStats = new Map<string, { ca: number; heures: number }>();
    
    for (const tech of stats) {
      for (const [univers, data] of Object.entries(tech.universes)) {
        if (!universStats.has(univers)) {
          universStats.set(univers, { ca: 0, heures: 0 });
        }
        const u = universStats.get(univers)!;
        u.ca += data.caHT;
        u.heures += data.heures;
      }
    }
    
    const result: Record<string, number> = {};
    
    universStats.forEach((data, univers) => {
      result[univers] = data.heures > 0 ? Math.round(data.ca / data.heures) : 0;
    });
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: universStats.size,
      }
    };
  }
};

/**
 * Nb heures productives
 */
export const nbHeuresProductives: StatDefinition = {
  id: 'nb_heures_productives',
  label: 'Heures productives',
  description: 'Nombre total d\'heures productives (hors RT/SAV)',
  category: 'productivite',
  source: ['interventions', 'users'],
  aggregation: 'sum',
  unit: 'h',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, users } = data;
    
    const usersMap = new Map(users.map(u => [u.id, u]));
    let totalHeures = 0;
    
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
      
      // Exclure RT et SAV
      const isRT = 
        intervention.data?.biRt?.isValidated === true ||
        intervention.data?.type2 === 'RT' ||
        (intervention.type2 || '').toUpperCase() === 'RT';
      
      const type2Lower = (intervention.data?.type2 || intervention.type2 || '').toLowerCase();
      const typeRaw = (intervention.data?.type || intervention.type || '').toLowerCase();
      const isSAV = type2Lower.includes('sav') || typeRaw.includes('sav');
      
      if (isRT || isSAV) continue;
      
      // Types productifs uniquement
      const isProductive = intervention.data?.biDepan || intervention.data?.biTvx;
      if (!isProductive) continue;
      
      // Comptabiliser les heures des visites validées
      const visites = intervention.data?.visites || [];
      for (const visite of visites) {
        if (visite.state !== 'validated') continue;
        
        const duree = Number(visite.duree) || 0;
        if (duree <= 0) continue;
        
        // Vérifier qu'il y a au moins un technicien actif
        const usersIds = visite.usersIds || [];
        const hasTech = usersIds.some((userId: number) => {
          const user = usersMap.get(userId);
          return isActiveTechnician(user);
        });
        
        if (hasTech) {
          totalHeures += duree / 60; // Convertir minutes en heures
        }
      }
    }
    
    return {
      value: Math.round(totalHeures * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'interventions',
        recordCount: interventions.length,
      }
    };
  }
};

/**
 * Nb interventions par technicien
 */
export const nbInterventionsParTechnicien: StatDefinition = {
  id: 'nb_interventions_par_technicien',
  label: 'Interventions par technicien',
  description: 'Nombre d\'interventions par technicien',
  category: 'productivite',
  source: ['interventions', 'users'],
  dimensions: ['technicien'],
  aggregation: 'count',
  unit: '',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, users } = data;
    
    const usersMap = new Map(users.map(u => [u.id, u]));
    const interventionsByTech = new Map<string, number>();
    const techNames = new Map<number, string>();
    
    for (const user of users) {
      if (isActiveTechnician(user)) {
        const name = `${user.firstname || ''} ${user.lastname || ''}`.trim() || `Tech ${user.id}`;
        techNames.set(user.id, name);
      }
    }
    
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
      
      // Identifier les techniciens de l'intervention
      const visites = intervention.data?.visites || [];
      const techIds = new Set<number>();
      
      for (const visite of visites) {
        if (visite.state !== 'validated') continue;
        const usersIds = visite.usersIds || [];
        usersIds.forEach((id: number) => {
          if (techNames.has(id)) {
            techIds.add(id);
          }
        });
      }
      
      // Si pas de visites validées, utiliser userId principal
      if (techIds.size === 0 && intervention.userId && techNames.has(intervention.userId)) {
        techIds.add(intervention.userId);
      }
      
      // Comptabiliser
      techIds.forEach(techId => {
        const name = techNames.get(techId)!;
        const current = interventionsByTech.get(name) || 0;
        interventionsByTech.set(name, current + 1);
      });
    }
    
    const result: Record<string, number> = {};
    interventionsByTech.forEach((count, name) => {
      result[name] = count;
    });
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'interventions',
        recordCount: interventions.length,
      }
    };
  }
};

/**
 * Taux d'utilisation techniciens
 * (Heures productives / Heures théoriques disponibles)
 */
export const tauxUtilisationTechniciens: StatDefinition = {
  id: 'taux_utilisation_techniciens',
  label: 'Taux utilisation',
  description: 'Ratio heures productives / heures théoriques (base 35h/semaine)',
  category: 'productivite',
  source: ['interventions', 'users'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, users } = data;
    
    // Calculer les heures productives
    const usersMap = new Map(users.map(u => [u.id, u]));
    let totalHeuresProductives = 0;
    
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
      
      const isRT = intervention.data?.biRt?.isValidated === true || (intervention.type2 || '').toUpperCase() === 'RT';
      const type2Lower = (intervention.data?.type2 || intervention.type2 || '').toLowerCase();
      const isSAV = type2Lower.includes('sav');
      
      if (isRT || isSAV) continue;
      
      const isProductive = intervention.data?.biDepan || intervention.data?.biTvx;
      if (!isProductive) continue;
      
      const visites = intervention.data?.visites || [];
      for (const visite of visites) {
        if (visite.state !== 'validated') continue;
        const duree = Number(visite.duree) || 0;
        if (duree > 0) {
          totalHeuresProductives += duree / 60;
        }
      }
    }
    
    // Calculer les heures théoriques
    const nbTechActifs = users.filter(u => isActiveTechnician(u)).length;
    const nbJours = Math.ceil(
      (params.dateRange.end.getTime() - params.dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const nbSemaines = nbJours / 7;
    const heuresTheoriques = nbTechActifs * nbSemaines * 35; // 35h/semaine
    
    const taux = heuresTheoriques > 0 ? (totalHeuresProductives / heuresTheoriques) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'interventions',
        recordCount: interventions.length,
      },
      breakdown: {
        heuresProductives: Math.round(totalHeuresProductives * 10) / 10,
        heuresTheoriques: Math.round(heuresTheoriques * 10) / 10,
        nbTechActifs,
        nbSemaines: Math.round(nbSemaines * 10) / 10,
      }
    };
  }
};

export const productiviteDefinitions = {
  ca_par_heure_global: caParHeureGlobal,
  ca_par_heure_par_technicien: caParHeureParTechnicien,
  productivite_par_univers: productiviteParUnivers,
  nb_heures_productives: nbHeuresProductives,
  nb_interventions_par_technicien: nbInterventionsParTechnicien,
  taux_utilisation_techniciens: tauxUtilisationTechniciens,
};
