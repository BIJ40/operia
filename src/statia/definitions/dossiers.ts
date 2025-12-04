/**
 * StatIA V2 - Définitions des métriques Dossiers
 * Nouvelle famille de métriques pour l'analyse des dossiers
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { parseISO, differenceInDays } from 'date-fns';

/**
 * Durée moyenne dossier (jours entre création et facturation)
 */
export const dureeMoyenneDossier: StatDefinition = {
  id: 'duree_moyenne_dossier',
  label: 'Durée moyenne dossier',
  description: 'Nombre de jours moyen entre création du dossier et facturation',
  category: 'ca',
  source: ['factures', 'projects'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    
    const projectsMap = new Map(projects.map(p => [p.id, p]));
    const durees: number[] = [];
    
    for (const facture of factures) {
      const dateFacture = facture.dateReelle || facture.dateEmission || facture.created_at;
      if (!dateFacture) continue;
      
      // Exclure avoirs
      const typeFacture = (facture.typeFacture || facture.data?.type || '').toLowerCase();
      if (typeFacture === 'avoir') continue;
      
      const project = projectsMap.get(facture.projectId);
      if (!project) continue;
      
      const dateCreation = project.created_at || project.createdAt || project.date;
      if (!dateCreation) continue;
      
      try {
        const factureDate = parseISO(dateFacture);
        const creationDate = parseISO(dateCreation);
        
        // Filtrer par période sur la date de facture
        if (factureDate < params.dateRange.start || factureDate > params.dateRange.end) continue;
        
        const delai = differenceInDays(factureDate, creationDate);
        if (delai >= 0) {
          durees.push(delai);
        }
      } catch {
        continue;
      }
    }
    
    const moyenne = durees.length > 0 
      ? durees.reduce((a, b) => a + b, 0) / durees.length 
      : 0;
    
    return {
      value: Math.round(moyenne),
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: durees.length,
      },
      breakdown: {
        min: durees.length > 0 ? Math.min(...durees) : 0,
        max: durees.length > 0 ? Math.max(...durees) : 0,
        nbDossiers: durees.length,
      }
    };
  }
};

/**
 * Durée médiane dossier
 */
export const dureeMedianeDossier: StatDefinition = {
  id: 'duree_mediane_dossier',
  label: 'Durée médiane dossier',
  description: 'Durée médiane entre création du dossier et facturation',
  category: 'ca',
  source: ['factures', 'projects'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    
    const projectsMap = new Map(projects.map(p => [p.id, p]));
    const durees: number[] = [];
    
    for (const facture of factures) {
      const dateFacture = facture.dateReelle || facture.dateEmission || facture.created_at;
      if (!dateFacture) continue;
      
      const typeFacture = (facture.typeFacture || facture.data?.type || '').toLowerCase();
      if (typeFacture === 'avoir') continue;
      
      const project = projectsMap.get(facture.projectId);
      if (!project) continue;
      
      const dateCreation = project.created_at || project.createdAt || project.date;
      if (!dateCreation) continue;
      
      try {
        const factureDate = parseISO(dateFacture);
        const creationDate = parseISO(dateCreation);
        
        if (factureDate < params.dateRange.start || factureDate > params.dateRange.end) continue;
        
        const delai = differenceInDays(factureDate, creationDate);
        if (delai >= 0) {
          durees.push(delai);
        }
      } catch {
        continue;
      }
    }
    
    // Calcul médiane
    durees.sort((a, b) => a - b);
    const mediane = durees.length > 0 
      ? durees.length % 2 === 0
        ? (durees[durees.length / 2 - 1] + durees[durees.length / 2]) / 2
        : durees[Math.floor(durees.length / 2)]
      : 0;
    
    return {
      value: Math.round(mediane),
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: durees.length,
      }
    };
  }
};

/**
 * Taux dossiers multi-visites
 */
export const tauxMultiVisites: StatDefinition = {
  id: 'taux_multi_visites',
  label: 'Taux dossiers multi-visites',
  description: 'Pourcentage de dossiers ayant nécessité plus d\'une visite',
  category: 'ca',
  source: ['interventions', 'projects'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, projects } = data;
    
    // Compter les visites par projet
    const visitesParProjet = new Map<string | number, number>();
    
    for (const intervention of interventions) {
      const projectId = intervention.projectId;
      if (!projectId) continue;
      
      // Filtrer par période
      const date = intervention.date || intervention.created_at;
      if (date) {
        try {
          const interventionDate = parseISO(date);
          if (interventionDate < params.dateRange.start || interventionDate > params.dateRange.end) continue;
        } catch {
          continue;
        }
      }
      
      // Compter les visites validées
      const visites = intervention.data?.visites || [];
      const visitesValidees = visites.filter((v: any) => v.state === 'validated').length;
      
      const current = visitesParProjet.get(projectId) || 0;
      visitesParProjet.set(projectId, current + Math.max(1, visitesValidees));
    }
    
    // Calculer le taux
    const totalProjets = visitesParProjet.size;
    let projetsMultiVisites = 0;
    
    visitesParProjet.forEach((nbVisites) => {
      if (nbVisites > 1) {
        projetsMultiVisites++;
      }
    });
    
    const taux = totalProjets > 0 ? (projetsMultiVisites / totalProjets) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'interventions',
        recordCount: totalProjets,
      },
      breakdown: {
        totalProjets,
        projetsMultiVisites,
        projetsMono: totalProjets - projetsMultiVisites,
      }
    };
  }
};

/**
 * Nombre moyen RT par dossier
 */
export const nbRtParDossier: StatDefinition = {
  id: 'nb_rt_par_dossier',
  label: 'Nb RT moyen par dossier',
  description: 'Nombre moyen de relevés techniques par dossier',
  category: 'ca',
  source: ['interventions', 'projects'],
  aggregation: 'avg',
  unit: '',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, projects } = data;
    
    const rtParProjet = new Map<string | number, number>();
    const projetsAvecIntervention = new Set<string | number>();
    
    for (const intervention of interventions) {
      const projectId = intervention.projectId;
      if (!projectId) continue;
      
      // Filtrer par période
      const date = intervention.date || intervention.created_at;
      if (date) {
        try {
          const interventionDate = parseISO(date);
          if (interventionDate < params.dateRange.start || interventionDate > params.dateRange.end) continue;
        } catch {
          continue;
        }
      }
      
      projetsAvecIntervention.add(projectId);
      
      // Détecter RT
      const isRT = 
        intervention.data?.biRt?.isValidated === true ||
        intervention.data?.type2 === 'RT' ||
        (intervention.type2 || '').toUpperCase() === 'RT' ||
        (intervention.type || '').toLowerCase().includes('relevé technique') ||
        (intervention.type || '').toLowerCase().includes('releve technique');
      
      if (isRT) {
        const current = rtParProjet.get(projectId) || 0;
        rtParProjet.set(projectId, current + 1);
      }
    }
    
    const totalProjets = projetsAvecIntervention.size;
    const totalRT = Array.from(rtParProjet.values()).reduce((a, b) => a + b, 0);
    
    const moyenne = totalProjets > 0 ? totalRT / totalProjets : 0;
    
    return {
      value: Math.round(moyenne * 100) / 100,
      metadata: {
        computedAt: new Date(),
        source: 'interventions',
        recordCount: totalProjets,
      },
      breakdown: {
        totalRT,
        totalProjets,
        projetsAvecRT: rtParProjet.size,
      }
    };
  }
};

/**
 * Taux dossiers dégâts des eaux
 */
export const tauxDegatsEaux: StatDefinition = {
  id: 'taux_degats_eaux',
  label: 'Taux dégâts des eaux',
  description: 'Pourcentage de dossiers de type dégât des eaux',
  category: 'ca',
  source: 'projects',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    let totalProjets = 0;
    let projetsDDE = 0;
    
    for (const project of projects) {
      const dateCreation = project.created_at || project.createdAt || project.date;
      if (dateCreation) {
        try {
          const projectDate = parseISO(dateCreation);
          if (projectDate < params.dateRange.start || projectDate > params.dateRange.end) continue;
        } catch {
          continue;
        }
      }
      
      totalProjets++;
      
      // Détection dégât des eaux
      const sinistre = (project.data?.sinistre || project.sinistre || '').toLowerCase();
      const label = (project.label || '').toLowerCase();
      const universes = project.data?.universes || project.universes || [];
      
      const isDDE = 
        sinistre.includes('dégât') || 
        sinistre.includes('degat') ||
        sinistre.includes('eau') ||
        label.includes('dégât') ||
        label.includes('degat') ||
        universes.some((u: string) => u.toLowerCase().includes('plomberie'));
      
      if (isDDE) {
        projetsDDE++;
      }
    }
    
    const taux = totalProjets > 0 ? (projetsDDE / totalProjets) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: totalProjets,
      },
      breakdown: {
        totalProjets,
        projetsDDE,
      }
    };
  }
};

/**
 * Nb dossiers créés
 */
export const nbDossiersCrees: StatDefinition = {
  id: 'nb_dossiers_crees',
  label: 'Dossiers créés',
  description: 'Nombre de dossiers créés sur la période',
  category: 'ca',
  source: 'projects',
  aggregation: 'count',
  unit: '',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    let count = 0;
    
    for (const project of projects) {
      const dateCreation = project.created_at || project.createdAt || project.date;
      if (!dateCreation) continue;
      
      try {
        const projectDate = parseISO(dateCreation);
        if (projectDate >= params.dateRange.start && projectDate <= params.dateRange.end) {
          count++;
        }
      } catch {
        continue;
      }
    }
    
    return {
      value: count,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: count,
      }
    };
  }
};

export const dossiersDefinitions = {
  duree_moyenne_dossier: dureeMoyenneDossier,
  duree_mediane_dossier: dureeMedianeDossier,
  taux_multi_visites: tauxMultiVisites,
  nb_rt_par_dossier: nbRtParDossier,
  taux_degats_eaux: tauxDegatsEaux,
  nb_dossiers_crees: nbDossiersCrees,
};
