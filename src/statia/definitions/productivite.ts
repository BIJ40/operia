/**
 * StatIA V2 - Définitions des métriques Productivité
 * Famille de métriques pour l'analyse de la productivité
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { parseISO, isWithinInterval } from 'date-fns';
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
 * Vérifie si une intervention est de type RT (Relevé Technique) - NON PRODUCTIF
 */
function isRTIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase();
  
  if (type2.includes('relevé') || type2.includes('releve') || type2.includes('technique')) return true;
  if (type2 === 'rt') return true;
  if (type.includes('rt')) return true;
  if (intervention.data?.biRt && !intervention.data?.biDepan && !intervention.data?.biTvx && !intervention.data?.biV3) return true;
  if (intervention.data?.isRT) return true;
  
  return false;
}

/**
 * Vérifie si une intervention est de type SAV - NON PRODUCTIF
 */
function isSAVIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase();
  return type2.includes('sav') || type.includes('sav');
}

/**
 * Vérifie si une intervention est de type diagnostic - NON PRODUCTIF
 */
function isDiagnosticIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase();
  return type2.includes('diagnostic') || type.includes('diagnostic');
}

/**
 * Vérifie si une intervention est productive
 */
function isProductiveIntervention(intervention: any): boolean {
  if (isRTIntervention(intervention)) return false;
  if (isSAVIntervention(intervention)) return false;
  if (isDiagnosticIntervention(intervention)) return false;
  
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  
  // Cas "RDV à définir" : inclure seulement si travaux réalisés
  if (type2.includes('définir') || type2.includes('a définir') || type2.includes('à définir')) {
    const hasDepanWork = intervention.data?.biDepan?.isWorkDone || intervention.data?.biDepan?.tvxEffectues;
    const hasTvxWork = intervention.data?.biTvx?.isWorkDone || intervention.data?.biTvx?.tvxEffectues;
    const hasV3Work = intervention.data?.biV3?.items?.length > 0;
    return hasDepanWork || hasTvxWork || hasV3Work;
  }
  
  // Par défaut : inclure (dépannages, travaux, etc.)
  return true;
}

/**
 * Nb heures productives
 * Logique alignée sur calculateTechTimeByProject de techniciens.ts
 */
export const nbHeuresProductives: StatDefinition = {
  id: 'nb_heures_productives',
  label: 'Heures productives',
  description: 'Nombre total d\'heures productives (hors RT/SAV/diagnostic)',
  category: 'productivite',
  source: ['interventions', 'users'],
  aggregation: 'sum',
  unit: 'h',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, users } = data;
    
    // GARDE-FOU: dateRange obligatoire pour éviter de compter tout l'historique
    if (!params.dateRange?.start || !params.dateRange?.end) {
      console.error('[nb_heures_productives] ERREUR: dateRange est obligatoire');
      return {
        value: 0,
        metadata: {
          computedAt: new Date(),
          source: 'interventions',
          recordCount: 0,
        },
        breakdown: {
          error: 'dateRange is required',
        }
      };
    }
    
    const usersMap = new Map(users.map(u => [u.id, u]));
    let totalHeures = 0;
    let interventionsComptees = 0;
    let interventionsFiltrees = 0;
    let earliest: Date | null = null;
    let latest: Date | null = null;
    
    for (const intervention of interventions) {
      const date = intervention.date || intervention.created_at;
      if (!date) {
        continue;
      }
      
      let interventionDate: Date;
      try {
        interventionDate = parseISO(date);
        // Filtrage strict par dateRange
        if (!isWithinInterval(interventionDate, { start: params.dateRange.start, end: params.dateRange.end })) {
          interventionsFiltrees++;
          continue;
        }
      } catch {
        continue;
      }
      
      // Utiliser la même logique que calculateTechTimeByProject
      if (!isProductiveIntervention(intervention)) continue;
      
      let tempsCompte = false;
      let heuresIntervention = 0;
      
      // Priorité 1: biV3.items avec techTimeStart/techTimeEnd
      if (intervention.data?.biV3?.items && Array.isArray(intervention.data.biV3.items)) {
        for (const item of intervention.data.biV3.items) {
          if (item.techTimeStart && item.techTimeEnd && item.usersIds?.length > 0) {
            const start = new Date(item.techTimeStart).getTime();
            const end = new Date(item.techTimeEnd).getTime();
            const dureeMinutes = (end - start) / (1000 * 60);
            if (dureeMinutes > 0 && dureeMinutes < 1440) { // Max 24h par item pour éviter les valeurs aberrantes
              heuresIntervention += dureeMinutes / 60;
              tempsCompte = true;
            }
          }
        }
      }
      
      // Priorité 2: data.visites avec duree
      if (!tempsCompte) {
        const visites = intervention.visites || intervention.data?.visites || [];
        for (const visite of visites) {
          const duree = Number(visite.duree) || 0;
          // Durée en minutes, max 720 (12h) par visite pour éviter les valeurs aberrantes
          if (duree > 0 && duree < 720 && visite.usersIds?.length > 0) {
            heuresIntervention += duree / 60;
            tempsCompte = true;
          }
        }
      }
      
      if (tempsCompte) {
        totalHeures += heuresIntervention;
        interventionsComptees++;
        
        // Tracker les dates pour debug
        if (!earliest || interventionDate < earliest) earliest = interventionDate;
        if (!latest || interventionDate > latest) latest = interventionDate;
      }
    }
    
    // Log de debug
    console.log('[nb_heures_productives]', {
      totalHeures: Math.round(totalHeures * 10) / 10,
      interventionsComptees,
      interventionsFiltrees,
      earliest: earliest?.toISOString().split('T')[0],
      latest: latest?.toISOString().split('T')[0],
      dateRange: {
        start: params.dateRange.start.toISOString().split('T')[0],
        end: params.dateRange.end.toISOString().split('T')[0],
      },
    });
    
    return {
      value: Math.round(totalHeures * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'interventions',
        recordCount: interventionsComptees,
      },
      breakdown: {
        heuresTotal: Math.round(totalHeures * 10) / 10,
        interventionsProductives: interventionsComptees,
        interventionsFiltrees,
        earliestDate: earliest?.toISOString().split('T')[0],
        latestDate: latest?.toISOString().split('T')[0],
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
    
    // Calculer les heures productives avec la même logique que nbHeuresProductives
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
      
      if (!isProductiveIntervention(intervention)) continue;
      
      let tempsCompte = false;
      
      // Priorité 1: biV3.items avec techTimeStart/techTimeEnd
      if (intervention.data?.biV3?.items && Array.isArray(intervention.data.biV3.items)) {
        for (const item of intervention.data.biV3.items) {
          if (item.techTimeStart && item.techTimeEnd && item.usersIds?.length > 0) {
            const start = new Date(item.techTimeStart).getTime();
            const end = new Date(item.techTimeEnd).getTime();
            const dureeMinutes = (end - start) / (1000 * 60);
            if (dureeMinutes > 0) {
              totalHeuresProductives += dureeMinutes / 60;
              tempsCompte = true;
            }
          }
        }
      }
      
      // Priorité 2: data.visites avec duree
      if (!tempsCompte) {
        const visites = intervention.visites || intervention.data?.visites || [];
        for (const visite of visites) {
          const duree = Number(visite.duree) || 0;
          if (duree > 0 && visite.usersIds?.length > 0) {
            totalHeuresProductives += duree / 60;
          }
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
