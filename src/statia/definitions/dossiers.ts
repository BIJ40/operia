/**
 * StatIA V2 - Définitions des métriques Dossiers
 * Nouvelle famille de métriques pour l'analyse des dossiers
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { parseISO, differenceInDays } from 'date-fns';
import { isFactureStateIncluded } from '../engine/normalizers';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Date unifiée dossier
 */
function getProjectDate(project: any): Date | null {
  const dateStr =
    project.dateReelle ||
    project.date ||
    project.created_at ||
    project.data?.dateReelle ||
    project.data?.date ||
    null;

  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Date unifiée facture
 */
function getFactureDate(facture: any): Date | null {
  const dateStr =
    facture.dateReelle ||
    facture.date ||
    facture.dateEmission ||
    facture.created_at ||
    facture.data?.dateReelle ||
    facture.data?.date ||
    facture.data?.dateEmission ||
    null;

  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Date unifiée intervention
 */
function getInterventionDate(intervention: any): Date | null {
  const dateStr =
    intervention.dateReelle ||
    intervention.date ||
    intervention.startTime ||
    intervention.started_at ||
    intervention.created_at ||
    intervention.data?.dateReelle ||
    intervention.data?.date ||
    null;

  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Filtre état intervention (uniquement réalisées)
 * États Apogée valides: validated, done, finished
 */
function isInterventionCompleted(state: any): boolean {
  const v = String(state || '').toLowerCase();
  return ['validated', 'done', 'finished'].includes(v);
}

// ============================================================================
// MÉTRIQUES
// ============================================================================

/**
 * Durée moyenne d'un dossier (jours entre création et première facturation)
 */
export const dureeMoyenneDossier: StatDefinition = {
  id: 'duree_moyenne_dossier',
  label: 'Durée moyenne d\'un dossier',
  description: 'Durée moyenne entre la création du dossier et la première facture (en jours)',
  category: 'dossiers',
  source: ['projects', 'factures'],
  aggregation: 'avg',
  unit: 'jours',
  dimensions: [],
  
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, factures } = data;

    // 1) Index première facture par projet
    const firstFactureDateByProject = new Map<string, Date>();

    for (const f of factures) {
      // Exclure factures non valides (brouillons, annulées)
      if (!isFactureStateIncluded(f.state)) continue;

      // Exclure avoirs
      const typeFacture = (f.typeFacture || f.data?.type || '').toLowerCase();
      if (typeFacture === 'avoir') continue;

      const pidRaw = f.projectId || f.project_id || f.data?.projectId;
      if (!pidRaw) continue;
      const pid = String(pidRaw);

      const dateF = getFactureDate(f);
      if (!dateF) continue;

      const current = firstFactureDateByProject.get(pid);
      if (!current || dateF < current) {
        firstFactureDateByProject.set(pid, dateF);
      }
    }

    // 2) Parcours des projets pour calculer les durées
    let sumDays = 0;
    let count = 0;
    let minDays: number | null = null;
    let maxDays: number | null = null;

    for (const project of projects) {
      const dateDossier = getProjectDate(project);
      if (!dateDossier) continue;

      // Filtrer par période sur la date DOSSIER
      if (params.dateRange) {
        if (dateDossier < params.dateRange.start || dateDossier > params.dateRange.end) {
          continue;
        }
      }

      const pid = String(project.id ?? project.projectId ?? '');
      if (!pid) continue;

      const firstFactureDate = firstFactureDateByProject.get(pid);
      if (!firstFactureDate) continue; // dossier jamais facturé → exclu

      const diffMs = firstFactureDate.getTime() - dateDossier.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      // On ignore les valeurs négatives aberrantes
      if (diffDays < 0) continue;

      sumDays += diffDays;
      count++;

      if (minDays === null || diffDays < minDays) minDays = diffDays;
      if (maxDays === null || diffDays > maxDays) maxDays = diffDays;
    }

    const avgDays = count > 0 ? sumDays / count : 0;
    const avgRounded = Math.round(avgDays * 10) / 10;

    return {
      value: avgRounded,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: count,
      },
      breakdown: {
        dossiersPrisEnCompte: count,
        min: minDays !== null ? Math.round(minDays * 10) / 10 : null,
        max: maxDays !== null ? Math.round(maxDays * 10) / 10 : null,
      },
    };
  },
};

/**
 * Durée médiane d'un dossier (jours entre création et première facturation)
 */
export const dureeMedianeDossier: StatDefinition = {
  id: 'duree_mediane_dossier',
  label: 'Durée médiane d\'un dossier',
  description: 'Durée médiane entre la création du dossier et la première facture (en jours)',
  category: 'dossiers',
  source: ['projects', 'factures'],
  unit: 'jours',
  dimensions: [],
  aggregation: 'median',

  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, factures } = data;

    // 1) Index première facture par projet
    const firstFactureDateByProject = new Map<string, Date>();

    for (const f of factures) {
      // Exclure factures non valides
      if (!isFactureStateIncluded(f.state)) continue;

      // Exclure avoirs
      const typeFacture = (f.typeFacture || f.data?.type || '').toLowerCase();
      if (typeFacture === 'avoir') continue;

      const pidRaw = f.projectId || f.project_id || f.data?.projectId;
      if (!pidRaw) continue;
      const pid = String(pidRaw);

      const dateF = getFactureDate(f);
      if (!dateF) continue;

      const current = firstFactureDateByProject.get(pid);
      if (!current || dateF < current) {
        firstFactureDateByProject.set(pid, dateF);
      }
    }

    // 2) Parcours des projets pour construire la liste des durées
    const durations: number[] = [];

    for (const project of projects) {
      const dateDossier = getProjectDate(project);
      if (!dateDossier) continue;

      // Filtrer par période sur la date DOSSIER
      if (params.dateRange) {
        if (dateDossier < params.dateRange.start || dateDossier > params.dateRange.end) {
          continue;
        }
      }

      const pid = String(project.id ?? project.projectId ?? '');
      if (!pid) continue;

      const firstFactureDate = firstFactureDateByProject.get(pid);
      if (!firstFactureDate) continue; // dossier jamais facturé → exclu

      const diffMs = firstFactureDate.getTime() - dateDossier.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays < 0) continue; // valeurs aberrantes

      durations.push(diffDays);
    }

    // 3) Calcul de la médiane
    let median = 0;
    if (durations.length > 0) {
      durations.sort((a, b) => a - b);
      const mid = Math.floor(durations.length / 2);

      if (durations.length % 2 === 0) {
        median = (durations[mid - 1] + durations[mid]) / 2;
      } else {
        median = durations[mid];
      }
    }

    const medianRounded = Math.round(median * 10) / 10;

    return {
      value: medianRounded,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: durations.length,
      },
      breakdown: {
        dossiersPrisEnCompte: durations.length,
        min: durations.length ? Math.round(Math.min(...durations) * 10) / 10 : null,
        max: durations.length ? Math.round(Math.max(...durations) * 10) / 10 : null,
      },
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
  category: 'dossiers',
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
  category: 'dossiers',
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
  category: 'dossiers',
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
  category: 'dossiers',
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

/**
 * Nombre moyen d'interventions par dossier
 */
export const nbMoyenInterventionsParDossier: StatDefinition = {
  id: 'nb_moyen_interventions_par_dossier',
  label: "Nombre moyen d'interventions par dossier",
  description:
    "Nombre moyen d'interventions réalisées par dossier sur la période",
  category: 'dossiers',
  source: ['interventions', 'projects'],
  unit: 'interventions/dossier',
  dimensions: [],
  aggregation: 'avg',

  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions } = data;

    let totalInterventions = 0;
    const projectsWithInterventions = new Set<string>();

    for (const interv of interventions) {
      const date = getInterventionDate(interv);
      if (!date) continue;

      // Filtrer par période
      if (
        params.dateRange &&
        (date < params.dateRange.start || date > params.dateRange.end)
      ) {
        continue;
      }

      // Filtrer par état (uniquement completed)
      if (!isInterventionCompleted(interv.state)) continue;

      const pidRaw =
        interv.projectId ||
        interv.project_id ||
        interv.data?.projectId ||
        interv.dossierId;

      if (!pidRaw) continue;

      const pid = String(pidRaw);

      totalInterventions++;
      projectsWithInterventions.add(pid);
    }

    const nbDossiers = projectsWithInterventions.size;
    const avg = nbDossiers > 0 ? totalInterventions / nbDossiers : 0;

    const value = Math.round(avg * 100) / 100;

    return {
      value,
      metadata: {
        computedAt: new Date(),
        source: 'interventions',
        recordCount: nbDossiers,
      },
      breakdown: {
        totalInterventions,
        nbDossiers,
      },
    };
  },
};

export const dossiersDefinitions = {
  duree_moyenne_dossier: dureeMoyenneDossier,
  duree_mediane_dossier: dureeMedianeDossier,
  taux_multi_visites: tauxMultiVisites,
  nb_rt_par_dossier: nbRtParDossier,
  taux_degats_eaux: tauxDegatsEaux,
  nb_dossiers_crees: nbDossiersCrees,
  nb_moyen_interventions_par_dossier: nbMoyenInterventionsParDossier,
};
