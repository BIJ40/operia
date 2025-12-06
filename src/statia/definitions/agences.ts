/**
 * StatIA - Définitions des métriques Agences / Réseau
 * Métriques de comparaison et analyse réseau
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { isFactureStateIncluded, normalizeUniversSlug } from '../engine/normalizers';
import { extractFactureMeta } from '../rules/rules';
import { indexProjectsById } from '../engine/loaders';

// ============= HELPERS =============

function getAgencyId(item: any): string {
  return String(item.agencyId || item.agency_id || item.data?.agencyId || 'default');
}

function parseDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function isSAVIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase();
  const pictos = intervention.data?.pictosInterv ?? [];
  return type2.includes('sav') || type.includes('sav') || pictos.includes('SAV');
}

// ============= METRIC: CA par Agence =============

export const caParAgence: StatDefinition = {
  id: 'ca_par_agence',
  label: 'CA par Agence',
  description: 'Chiffre d\'affaires HT ventilé par agence',
  category: 'reseau',
  source: 'factures',
  dimensions: ['agence'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    const caByAgence: Record<string, number> = {};
    let totalCA = 0;
    
    for (const f of factures || []) {
      const meta = extractFactureMeta(f);
      if (!isFactureStateIncluded(f.state)) continue;
      
      if (params.dateRange && meta.date) {
        if (meta.date < params.dateRange.start || meta.date > params.dateRange.end) continue;
      }
      
      const agencyId = getAgencyId(f);
      caByAgence[agencyId] = (caByAgence[agencyId] || 0) + meta.montantNetHT;
      totalCA += meta.montantNetHT;
    }
    
    // Arrondir
    for (const key of Object.keys(caByAgence)) {
      caByAgence[key] = Math.round(caByAgence[key] * 100) / 100;
    }
    
    return {
      value: caByAgence,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: factures?.length || 0 },
      breakdown: { total: Math.round(totalCA * 100) / 100, nbAgences: Object.keys(caByAgence).length }
    };
  }
};

// ============= METRIC: Taux SAV par Agence =============

export const tauxSavParAgence: StatDefinition = {
  id: 'taux_sav_par_agence',
  label: 'Taux SAV par Agence',
  description: 'Taux de SAV ventilé par agence',
  category: 'reseau',
  source: ['interventions', 'projects'],
  dimensions: ['agence'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, projects } = data;
    
    const projectsById = indexProjectsById(projects || []);
    const totalByAgence: Record<string, number> = {};
    const savByAgence: Record<string, number> = {};
    
    for (const interv of interventions || []) {
      const state = (interv.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'draft') continue;
      
      // Filtre date
      const dateStr = interv.date || interv.created_at;
      const date = parseDate(dateStr);
      if (params.dateRange && date) {
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const projectId = String(interv.projectId || interv.project_id || '');
      const project = projectsById.get(projectId) || projectsById.get(Number(projectId));
      const agencyId = project ? getAgencyId(project) : 'unknown';
      
      totalByAgence[agencyId] = (totalByAgence[agencyId] || 0) + 1;
      
      if (isSAVIntervention(interv)) {
        savByAgence[agencyId] = (savByAgence[agencyId] || 0) + 1;
      }
    }
    
    const tauxByAgence: Record<string, number> = {};
    for (const agencyId of Object.keys(totalByAgence)) {
      const total = totalByAgence[agencyId] || 1;
      const sav = savByAgence[agencyId] || 0;
      tauxByAgence[agencyId] = Math.round((sav / total) * 1000) / 10;
    }
    
    return {
      value: tauxByAgence,
      metadata: { computedAt: new Date(), source: 'interventions', recordCount: interventions?.length || 0 },
      breakdown: { totalByAgence, savByAgence }
    };
  }
};

// ============= METRIC: CA Réseau Total =============

export const caReseauTotal: StatDefinition = {
  id: 'ca_reseau_total',
  label: 'CA Réseau Total',
  description: 'CA HT total cumulé sur l\'ensemble des agences du réseau',
  category: 'reseau',
  source: 'factures',
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    let totalCA = 0;
    let nbFactures = 0;
    
    for (const f of factures || []) {
      const meta = extractFactureMeta(f);
      if (!isFactureStateIncluded(f.state)) continue;
      
      if (params.dateRange && meta.date) {
        if (meta.date < params.dateRange.start || meta.date > params.dateRange.end) continue;
      }
      
      totalCA += meta.montantNetHT;
      nbFactures++;
    }
    
    return {
      value: Math.round(totalCA * 100) / 100,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: nbFactures }
    };
  }
};

// ============= METRIC: CA Moyen par Agence =============

export const caMoyenParAgence: StatDefinition = {
  id: 'ca_moyen_par_agence',
  label: 'CA Moyen par Agence',
  description: 'CA HT moyen par agence du réseau sur la période',
  category: 'reseau',
  source: 'factures',
  aggregation: 'avg',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    const caByAgence: Record<string, number> = {};
    
    for (const f of factures || []) {
      const meta = extractFactureMeta(f);
      if (!isFactureStateIncluded(f.state)) continue;
      
      if (params.dateRange && meta.date) {
        if (meta.date < params.dateRange.start || meta.date > params.dateRange.end) continue;
      }
      
      const agencyId = getAgencyId(f);
      caByAgence[agencyId] = (caByAgence[agencyId] || 0) + meta.montantNetHT;
    }
    
    const agences = Object.keys(caByAgence);
    const totalCA = Object.values(caByAgence).reduce((a, b) => a + b, 0);
    const moyenne = agences.length > 0 ? totalCA / agences.length : 0;
    
    return {
      value: Math.round(moyenne * 100) / 100,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: agences.length },
      breakdown: { nbAgences: agences.length, totalCA: Math.round(totalCA * 100) / 100 }
    };
  }
};

// ============= METRIC: Dispersion CA Agences =============

export const dispersionCaAgences: StatDefinition = {
  id: 'dispersion_ca_agences',
  label: 'Dispersion CA Agences',
  description: 'Écart-type des CA agences pour détecter les écarts de performance',
  category: 'reseau',
  source: 'factures',
  aggregation: 'avg',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    const caByAgence: Record<string, number> = {};
    
    for (const f of factures || []) {
      const meta = extractFactureMeta(f);
      if (!isFactureStateIncluded(f.state)) continue;
      
      if (params.dateRange && meta.date) {
        if (meta.date < params.dateRange.start || meta.date > params.dateRange.end) continue;
      }
      
      const agencyId = getAgencyId(f);
      caByAgence[agencyId] = (caByAgence[agencyId] || 0) + meta.montantNetHT;
    }
    
    const values = Object.values(caByAgence);
    if (values.length === 0) {
      return { value: 0, metadata: { computedAt: new Date(), source: 'factures', recordCount: 0 } };
    }
    
    const moyenne = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - moyenne, 2), 0) / values.length;
    const ecartType = Math.sqrt(variance);
    
    return {
      value: Math.round(ecartType * 100) / 100,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: values.length },
      breakdown: { moyenne: Math.round(moyenne * 100) / 100, variance: Math.round(variance * 100) / 100 }
    };
  }
};

// ============= METRIC: Part CA Top 10 Agences =============

export const partCaTop10Agences: StatDefinition = {
  id: 'part_ca_top_10_agences',
  label: 'Part CA Top 10 Agences',
  description: 'Part du CA réseau réalisée par les 10 agences les plus performantes',
  category: 'reseau',
  source: 'factures',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    const caByAgence: Record<string, number> = {};
    
    for (const f of factures || []) {
      const meta = extractFactureMeta(f);
      if (!isFactureStateIncluded(f.state)) continue;
      
      if (params.dateRange && meta.date) {
        if (meta.date < params.dateRange.start || meta.date > params.dateRange.end) continue;
      }
      
      const agencyId = getAgencyId(f);
      caByAgence[agencyId] = (caByAgence[agencyId] || 0) + meta.montantNetHT;
    }
    
    const sorted = Object.entries(caByAgence).sort((a, b) => b[1] - a[1]);
    const top10 = sorted.slice(0, 10);
    const caTop10 = top10.reduce((sum, [, ca]) => sum + ca, 0);
    const caTotal = sorted.reduce((sum, [, ca]) => sum + ca, 0);
    
    const part = caTotal > 0 ? (caTop10 / caTotal) * 100 : 0;
    
    return {
      value: Math.round(part * 10) / 10,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: sorted.length },
      breakdown: { caTop10: Math.round(caTop10 * 100) / 100, caTotal: Math.round(caTotal * 100) / 100 }
    };
  }
};

// ============= METRIC: Top Agences par Restant Dû =============

export const topAgencesParRestantDu: StatDefinition = {
  id: 'top_agences_par_restant_du',
  label: 'Top Agences par Restant Dû',
  description: 'Classement des agences selon le montant restant dû',
  category: 'recouvrement',
  source: 'factures',
  dimensions: ['agence'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    const restantDuByAgence: Record<string, number> = {};
    
    for (const f of factures || []) {
      if (!isFactureStateIncluded(f.state)) continue;
      
      const agencyId = getAgencyId(f);
      
      // Calculer restant dû
      const totalTTC = f.data?.totalTTC ?? f.totalTTC ?? 0;
      const amountPaid = f.data?.amountPaid ?? f.amountPaid ?? 0;
      const remainingDue = f.data?.remainingDue ?? f.restePaidTTC ?? f.calcPaymentsReste ?? (totalTTC - amountPaid);
      
      const restant = typeof remainingDue === 'string' ? parseFloat(remainingDue) || 0 : Number(remainingDue) || 0;
      
      if (restant > 0) {
        restantDuByAgence[agencyId] = (restantDuByAgence[agencyId] || 0) + restant;
      }
    }
    
    // Arrondir et trier
    const sorted = Object.entries(restantDuByAgence)
      .map(([id, val]) => [id, Math.round(val * 100) / 100] as [string, number])
      .sort((a, b) => b[1] - a[1]);
    
    const result: Record<string, number> = {};
    for (const [id, val] of sorted) {
      result[id] = val;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: sorted.length },
      breakdown: { totalRestantDu: sorted.reduce((sum, [, v]) => sum + v, 0) }
    };
  }
};

// ============= METRIC: Top Zones Postales par CA =============

export const topZonesPostalesParCa: StatDefinition = {
  id: 'top_zones_postales_par_ca',
  label: 'Top Zones Postales par CA',
  description: 'Classement des zones postales par CA HT',
  category: 'ca',
  source: ['factures', 'clients'],
  dimensions: ['zone_postale'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, clients } = data;
    
    // Index clients par code postal
    const clientsById = new Map<string, string>();
    for (const c of clients || []) {
      const cp = c.data?.codePostal || c.data?.zipCode || c.codePostal || c.zipCode || '';
      // Extraire les 2 premiers chiffres (département)
      const dept = String(cp).substring(0, 2);
      if (dept) {
        clientsById.set(String(c.id), dept);
      }
    }
    
    const caByDept: Record<string, number> = {};
    
    for (const f of factures || []) {
      const meta = extractFactureMeta(f);
      if (!isFactureStateIncluded(f.state)) continue;
      
      if (params.dateRange && meta.date) {
        if (meta.date < params.dateRange.start || meta.date > params.dateRange.end) continue;
      }
      
      const clientId = String(f.clientId || f.client_id || f.data?.clientId || '');
      const dept = clientsById.get(clientId) || 'unknown';
      
      caByDept[dept] = (caByDept[dept] || 0) + meta.montantNetHT;
    }
    
    // Arrondir
    for (const key of Object.keys(caByDept)) {
      caByDept[key] = Math.round(caByDept[key] * 100) / 100;
    }
    
    return {
      value: caByDept,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: Object.keys(caByDept).length }
    };
  }
};

// ============= METRIC: Délai Ouverture Dossier =============

export const delaiOuvertureDossier: StatDefinition = {
  id: 'delai_ouverture_dossier',
  label: 'Délai Ouverture Dossier',
  description: 'Délai moyen entre création du dossier et première intervention',
  category: 'dossiers',
  source: ['projects', 'interventions'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, interventions } = data;
    
    // Index première intervention par projet
    const premiereIntervByProject = new Map<string, Date>();
    
    for (const interv of interventions || []) {
      const state = (interv.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'draft') continue;
      
      const projectId = String(interv.projectId || interv.project_id || '');
      if (!projectId) continue;
      
      const dateStr = interv.date || interv.data?.dateDebut || interv.created_at;
      const date = parseDate(dateStr);
      if (!date) continue;
      
      const existing = premiereIntervByProject.get(projectId);
      if (!existing || date < existing) {
        premiereIntervByProject.set(projectId, date);
      }
    }
    
    // Calculer délais
    const delais: number[] = [];
    
    for (const p of projects || []) {
      // Filtre période
      const dateCreationStr = p.date || p.created_at || p.createdAt;
      const dateCreation = parseDate(dateCreationStr);
      if (!dateCreation) continue;
      
      if (params.dateRange) {
        if (dateCreation < params.dateRange.start || dateCreation > params.dateRange.end) continue;
      }
      
      const projectId = String(p.id);
      const premiereInterv = premiereIntervByProject.get(projectId);
      
      if (premiereInterv) {
        const delaiJours = (premiereInterv.getTime() - dateCreation.getTime()) / (1000 * 60 * 60 * 24);
        if (delaiJours >= 0 && delaiJours < 365) { // Exclure valeurs aberrantes
          delais.push(delaiJours);
        }
      }
    }
    
    const moyenne = delais.length > 0 ? delais.reduce((a, b) => a + b, 0) / delais.length : 0;
    
    return {
      value: Math.round(moyenne * 10) / 10,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: delais.length },
      breakdown: { nbProjetsAvecIntervention: delais.length }
    };
  }
};

// ============= METRIC: Classement Agences par Délai RDV =============

export const classementAgencesParDelaiRdv: StatDefinition = {
  id: 'classement_agences_par_delai_moyen_rdv',
  label: 'Classement Agences par Délai RDV',
  description: 'Classement des agences selon le délai moyen entre dossier et première intervention',
  category: 'dossiers',
  source: ['projects', 'interventions'],
  dimensions: ['agence'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, interventions } = data;
    
    const projectsById = indexProjectsById(projects || []);
    
    // Index première intervention par projet
    const premiereIntervByProject = new Map<string, Date>();
    
    for (const interv of interventions || []) {
      const state = (interv.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'draft') continue;
      
      const projectId = String(interv.projectId || interv.project_id || '');
      if (!projectId) continue;
      
      const dateStr = interv.date || interv.data?.dateDebut || interv.created_at;
      const date = parseDate(dateStr);
      if (!date) continue;
      
      const existing = premiereIntervByProject.get(projectId);
      if (!existing || date < existing) {
        premiereIntervByProject.set(projectId, date);
      }
    }
    
    // Calculer délais par agence
    const delaisByAgence: Record<string, number[]> = {};
    
    for (const p of projects || []) {
      const dateCreationStr = p.date || p.created_at || p.createdAt;
      const dateCreation = parseDate(dateCreationStr);
      if (!dateCreation) continue;
      
      if (params.dateRange) {
        if (dateCreation < params.dateRange.start || dateCreation > params.dateRange.end) continue;
      }
      
      const projectId = String(p.id);
      const premiereInterv = premiereIntervByProject.get(projectId);
      
      if (premiereInterv) {
        const delaiJours = (premiereInterv.getTime() - dateCreation.getTime()) / (1000 * 60 * 60 * 24);
        if (delaiJours >= 0 && delaiJours < 365) {
          const agencyId = getAgencyId(p);
          if (!delaisByAgence[agencyId]) delaisByAgence[agencyId] = [];
          delaisByAgence[agencyId].push(delaiJours);
        }
      }
    }
    
    // Calculer moyennes
    const result: Record<string, number> = {};
    for (const [agencyId, delais] of Object.entries(delaisByAgence)) {
      const moyenne = delais.reduce((a, b) => a + b, 0) / delais.length;
      result[agencyId] = Math.round(moyenne * 10) / 10;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: Object.keys(result).length }
    };
  }
};

// ============= METRIC: Croissance CA par Agence vs N-1 =============

export const tauxCroissanceCaAgenceVsN1: StatDefinition = {
  id: 'taux_croissance_ca_agence_vs_n_1',
  label: 'Croissance CA par Agence vs N-1',
  description: 'Variation du CA de chaque agence par rapport à la même période N-1',
  category: 'reseau',
  source: 'factures',
  dimensions: ['agence'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    if (!params.dateRange) {
      return { value: {}, metadata: { computedAt: new Date(), source: 'factures', recordCount: 0 } };
    }
    
    // Période actuelle
    const startP = params.dateRange.start;
    const endP = params.dateRange.end;
    
    // Période N-1 (même période, année précédente)
    const startN1 = new Date(startP);
    startN1.setFullYear(startN1.getFullYear() - 1);
    const endN1 = new Date(endP);
    endN1.setFullYear(endN1.getFullYear() - 1);
    
    const caByAgenceP: Record<string, number> = {};
    const caByAgenceN1: Record<string, number> = {};
    
    for (const f of factures || []) {
      const meta = extractFactureMeta(f);
      if (!isFactureStateIncluded(f.state)) continue;
      if (!meta.date) continue;
      
      const agencyId = getAgencyId(f);
      
      // Période actuelle
      if (meta.date >= startP && meta.date <= endP) {
        caByAgenceP[agencyId] = (caByAgenceP[agencyId] || 0) + meta.montantNetHT;
      }
      
      // Période N-1
      if (meta.date >= startN1 && meta.date <= endN1) {
        caByAgenceN1[agencyId] = (caByAgenceN1[agencyId] || 0) + meta.montantNetHT;
      }
    }
    
    const result: Record<string, number> = {};
    const allAgencies = new Set([...Object.keys(caByAgenceP), ...Object.keys(caByAgenceN1)]);
    
    for (const agencyId of allAgencies) {
      const caP = caByAgenceP[agencyId] || 0;
      const caN1 = caByAgenceN1[agencyId] || 0;
      
      if (caN1 !== 0) {
        result[agencyId] = Math.round(((caP - caN1) / caN1) * 1000) / 10;
      } else if (caP > 0) {
        result[agencyId] = 100; // Nouvelle agence = 100% croissance
      } else {
        result[agencyId] = 0;
      }
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: Object.keys(result).length },
      breakdown: { caByAgenceP, caByAgenceN1 }
    };
  }
};

// ============= METRIC: Croissance CA Réseau vs N-1 =============

export const tauxCroissanceCaReseauVsN1: StatDefinition = {
  id: 'taux_croissance_ca_reseau_vs_n_1',
  label: 'Croissance CA Réseau vs N-1',
  description: 'Variation du CA réseau par rapport à la même période N-1',
  category: 'reseau',
  source: 'factures',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    if (!params.dateRange) {
      return { value: 0, metadata: { computedAt: new Date(), source: 'factures', recordCount: 0 } };
    }
    
    const startP = params.dateRange.start;
    const endP = params.dateRange.end;
    const startN1 = new Date(startP);
    startN1.setFullYear(startN1.getFullYear() - 1);
    const endN1 = new Date(endP);
    endN1.setFullYear(endN1.getFullYear() - 1);
    
    let caP = 0;
    let caN1 = 0;
    
    for (const f of factures || []) {
      const meta = extractFactureMeta(f);
      if (!isFactureStateIncluded(f.state)) continue;
      if (!meta.date) continue;
      
      if (meta.date >= startP && meta.date <= endP) {
        caP += meta.montantNetHT;
      }
      if (meta.date >= startN1 && meta.date <= endN1) {
        caN1 += meta.montantNetHT;
      }
    }
    
    const taux = caN1 !== 0 ? ((caP - caN1) / caN1) * 100 : (caP > 0 ? 100 : 0);
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: factures?.length || 0 },
      breakdown: { caP: Math.round(caP * 100) / 100, caN1: Math.round(caN1 * 100) / 100 }
    };
  }
};

// ============= EXPORT =============

export const agencesDefinitions: Record<string, StatDefinition> = {
  ca_par_agence: caParAgence,
  taux_sav_par_agence: tauxSavParAgence,
  ca_reseau_total: caReseauTotal,
  ca_moyen_par_agence: caMoyenParAgence,
  dispersion_ca_agences: dispersionCaAgences,
  part_ca_top_10_agences: partCaTop10Agences,
  top_agences_par_restant_du: topAgencesParRestantDu,
  top_zones_postales_par_ca: topZonesPostalesParCa,
  delai_ouverture_dossier: delaiOuvertureDossier,
  classement_agences_par_delai_moyen_rdv: classementAgencesParDelaiRdv,
  taux_croissance_ca_agence_vs_n_1: tauxCroissanceCaAgenceVsN1,
  taux_croissance_ca_reseau_vs_n_1: tauxCroissanceCaReseauVsN1,
};
