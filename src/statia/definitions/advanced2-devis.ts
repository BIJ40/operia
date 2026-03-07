/**
 * StatIA Definitions - Advanced Pack 2: Devis / Commercial
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { extractProjectUniverses } from '../engine/normalizers';
import { differenceInDays, parseISO } from 'date-fns';

const tauxDevisAbandonnes: StatDefinition = {
  id: 'taux_devis_abandonnes',
  label: 'Taux de devis abandonnés',
  description: 'Proportion de devis restés sans décision après un délai',
  category: 'devis',
  source: 'devis',
  dimensions: ['global'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;
    const { dateRange, filters } = params;
    const seuilJours = filters?.seuilJours || 30;
    const now = new Date();
    let totalDevis = 0;
    let abandonnes = 0;

    for (const d of devis) {
      const devisDate = d.dateReelle || d.date;
      if (!devisDate) continue;
      const date = parseISO(devisDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      totalDevis++;
      const state = d.state?.toLowerCase();
      const isAccepted = ['validated', 'signed', 'order', 'accepted'].includes(state);
      const isRefused = state === 'refused' || state === 'cancelled';
      if (!isAccepted && !isRefused) {
        if (differenceInDays(now, date) > seuilJours) abandonnes++;
      }
    }

    return {
      value: totalDevis > 0 ? Math.round((abandonnes / totalDevis) * 10000) / 100 : 0,
      breakdown: { totalDevis, abandonnes, seuilJours }
    };
  }
};

const montantDevisMedian: StatDefinition = {
  id: 'montant_devis_median',
  label: 'Montant médian des devis',
  description: 'Médiane des montants de devis émis sur la période',
  category: 'devis',
  source: 'devis',
  dimensions: ['global'],
  aggregation: 'median',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;
    const { dateRange } = params;
    const montants: number[] = [];

    for (const d of devis) {
      const devisDate = d.dateReelle || d.date;
      if (!devisDate) continue;
      const date = parseISO(devisDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const montant = d.totalHT || d.data?.totalHT || 0;
      if (montant > 0) montants.push(montant);
    }

    if (montants.length === 0) return { value: 0, breakdown: { devisCount: 0 } };

    montants.sort((a, b) => a - b);
    const mid = Math.floor(montants.length / 2);
    const median = montants.length % 2 !== 0 ? montants[mid] : (montants[mid - 1] + montants[mid]) / 2;

    return { value: Math.round(median * 100) / 100, breakdown: { devisCount: montants.length } };
  }
};

const delaiEmissionDevis: StatDefinition = {
  id: 'delai_emission_devis',
  label: 'Délai moyen dossier → premier devis',
  description: 'Délai moyen entre la création du dossier et l\'émission du premier devis',
  category: 'devis',
  source: ['projects', 'devis'],
  dimensions: ['global'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, devis } = data;
    const { dateRange } = params;
    const firstDevisByProject: Record<number, Date> = {};

    for (const d of devis) {
      const projectId = d.projectId;
      if (!projectId) continue;
      const devisDate = d.dateReelle || d.date;
      if (!devisDate) continue;
      const date = parseISO(devisDate);
      if (!firstDevisByProject[projectId] || date < firstDevisByProject[projectId]) {
        firstDevisByProject[projectId] = date;
      }
    }

    const delays: number[] = [];
    for (const project of projects) {
      const projectDate = project.date || project.dateReelle;
      if (!projectDate) continue;
      const pDate = parseISO(projectDate);
      if (pDate < dateRange.start || pDate > dateRange.end) continue;
      const firstDevisDate = firstDevisByProject[project.id];
      if (!firstDevisDate) continue;
      const delay = differenceInDays(firstDevisDate, pDate);
      if (delay >= 0 && delay <= 60) delays.push(delay);
    }

    if (delays.length === 0) return { value: 0, breakdown: { projectCount: 0 } };
    return {
      value: Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10,
      breakdown: { projectCount: delays.length }
    };
  }
};

const devisParTypeClient: StatDefinition = {
  id: 'devis_par_type_client',
  label: 'Volume de devis par type de client',
  description: 'Nombre de devis ventilé par type de client',
  category: 'devis',
  source: ['devis', 'projects', 'clients'],
  dimensions: ['type_client'],
  aggregation: 'count',
  unit: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis, projects, clients } = data;
    const { dateRange } = params;
    const clientTypeMap: Record<number, string> = {};
    for (const client of clients) clientTypeMap[client.id] = client.type || client.data?.type || 'Inconnu';
    const projectClientMap: Record<number, number> = {};
    for (const project of projects) { if (project.clientId) projectClientMap[project.id] = project.clientId; }
    const countByType: Record<string, number> = {};

    for (const d of devis) {
      const devisDate = d.dateReelle || d.date;
      if (!devisDate) continue;
      const date = parseISO(devisDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const clientId = projectClientMap[d.projectId];
      const clientType = clientId ? (clientTypeMap[clientId] || 'Inconnu') : 'Inconnu';
      countByType[clientType] = (countByType[clientType] || 0) + 1;
    }

    return { value: countByType, breakdown: { totalDevis: Object.values(countByType).reduce((a, b) => a + b, 0) } };
  }
};

const delaiAcceptationDevisParUnivers: StatDefinition = {
  id: 'delai_acceptation_devis_par_univers',
  label: 'Délai moyen d\'acceptation de devis par univers',
  description: 'Délai d\'acceptation des devis ventilé par univers métier',
  category: 'devis',
  source: ['devis', 'projects'],
  dimensions: ['univers'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis, projects } = data;
    const { dateRange } = params;
    const projectUniversMap: Record<number, string[]> = {};
    for (const project of projects) projectUniversMap[project.id] = extractProjectUniverses(project);
    const delaysByUnivers: Record<string, number[]> = {};

    for (const d of devis) {
      const state = d.state?.toLowerCase();
      if (!['validated', 'signed', 'order', 'accepted'].includes(state)) continue;
      const emissionDate = d.dateReelle || d.date;
      const signatureDate = d.dateSignature || d.data?.dateSignature;
      if (!emissionDate || !signatureDate) continue;
      const emission = parseISO(emissionDate);
      const signature = parseISO(signatureDate);
      if (emission < dateRange.start || emission > dateRange.end) continue;
      const delay = differenceInDays(signature, emission);
      if (delay < 0 || delay > 180) continue;
      const universes = projectUniversMap[d.projectId] || ['Non catégorisé'];
      for (const univers of universes) {
        if (!delaysByUnivers[univers]) delaysByUnivers[univers] = [];
        delaysByUnivers[univers].push(delay);
      }
    }

    const result: Record<string, number> = {};
    for (const [univers, delays] of Object.entries(delaysByUnivers)) {
      result[univers] = Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10;
    }
    return { value: result, breakdown: { universCount: Object.keys(result).length } };
  }
};

const tauxConversionDevisParTechnicien: StatDefinition = {
  id: 'taux_conversion_devis_par_technicien',
  label: 'Taux de conversion des devis par technicien',
  description: 'Taux de devis acceptés par technicien',
  category: 'devis',
  source: ['devis', 'interventions', 'users'],
  dimensions: ['technicien'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis, interventions, users } = data;
    const { dateRange } = params;
    const projectTechMap: Record<number, number> = {};
    for (const intervention of interventions) {
      if (!intervention.projectId || projectTechMap[intervention.projectId]) continue;
      if (intervention.userId) projectTechMap[intervention.projectId] = intervention.userId;
    }
    const userNameMap: Record<number, string> = {};
    for (const user of users) userNameMap[user.id] = `${user.firstname || ''} ${user.lastname || ''}`.trim() || `Tech ${user.id}`;
    const devisByTech: Record<string, { total: number; signes: number }> = {};

    for (const d of devis) {
      const devisDate = d.dateReelle || d.date;
      if (!devisDate) continue;
      const date = parseISO(devisDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const techId = projectTechMap[d.projectId]?.toString();
      if (!techId) continue;
      if (!devisByTech[techId]) devisByTech[techId] = { total: 0, signes: 0 };
      devisByTech[techId].total++;
      const state = d.state?.toLowerCase();
      if (['validated', 'signed', 'order', 'accepted'].includes(state)) devisByTech[techId].signes++;
    }

    const result: Record<string, { name: string; taux: number }> = {};
    for (const [techId, stats] of Object.entries(devisByTech)) {
      result[techId] = { name: userNameMap[parseInt(techId)] || `Tech ${techId}`, taux: stats.total > 0 ? Math.round((stats.signes / stats.total) * 10000) / 100 : 0 };
    }
    return { value: result, breakdown: { technicianCount: Object.keys(result).length } };
  }
};

const topUniversParTauxAcceptation: StatDefinition = {
  id: 'top_univers_par_taux_acceptation',
  label: 'Top univers par taux d\'acceptation de devis',
  description: 'Classement des univers selon leur taux d\'acceptation de devis',
  category: 'devis',
  source: ['devis', 'projects'],
  dimensions: ['univers'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis, projects } = data;
    const { dateRange, filters } = params;
    const topN = filters?.topN || 10;
    const projectUniversMap: Record<number, string[]> = {};
    for (const project of projects) projectUniversMap[project.id] = extractProjectUniverses(project);
    const statsByUnivers: Record<string, { total: number; signes: number }> = {};

    for (const d of devis) {
      const devisDate = d.dateReelle || d.date;
      if (!devisDate) continue;
      const date = parseISO(devisDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const universes = projectUniversMap[d.projectId] || ['Non catégorisé'];
      const state = d.state?.toLowerCase();
      const isSigne = ['validated', 'signed', 'order', 'accepted'].includes(state);
      for (const univers of universes) {
        if (!statsByUnivers[univers]) statsByUnivers[univers] = { total: 0, signes: 0 };
        statsByUnivers[univers].total++;
        if (isSigne) statsByUnivers[univers].signes++;
      }
    }

    const tauxParUnivers = Object.entries(statsByUnivers)
      .map(([univers, stats]) => ({ univers, taux: stats.total > 0 ? (stats.signes / stats.total) * 100 : 0 }))
      .sort((a, b) => b.taux - a.taux).slice(0, topN);

    const result: Record<string, number> = {};
    for (const { univers, taux } of tauxParUnivers) result[univers] = Math.round(taux * 100) / 100;
    return { value: result, breakdown: { universCount: tauxParUnivers.length } };
  }
};

const topApporteursParVolumeDevis: StatDefinition = {
  id: 'top_apporteurs_par_volume_devis',
  label: 'Top apporteurs par volume de devis',
  description: 'Classement des apporteurs par nombre de devis émis',
  category: 'apporteur',
  source: ['devis', 'projects', 'clients'],
  dimensions: ['apporteur'],
  aggregation: 'count',
  unit: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis, projects, clients } = data;
    const { dateRange, filters } = params;
    const topN = filters?.topN || 10;
    const projectApporteurMap: Record<number, number> = {};
    for (const project of projects) { const apporteurId = project.data?.commanditaireId; if (apporteurId) projectApporteurMap[project.id] = apporteurId; }
    const clientNameMap: Record<number, string> = {};
    for (const client of clients) clientNameMap[client.id] = client.raisonSociale || client.nom || `Apporteur ${client.id}`;
    const countByApporteur: Record<string, { name: string; count: number }> = {};

    for (const d of devis) {
      const devisDate = d.dateReelle || d.date;
      if (!devisDate) continue;
      const date = parseISO(devisDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const apporteurId = projectApporteurMap[d.projectId];
      if (!apporteurId) continue;
      const key = apporteurId.toString();
      if (!countByApporteur[key]) countByApporteur[key] = { name: clientNameMap[apporteurId] || `Apporteur ${apporteurId}`, count: 0 };
      countByApporteur[key].count++;
    }

    const sorted = Object.entries(countByApporteur).sort(([, a], [, b]) => b.count - a.count).slice(0, topN);
    const result: Record<string, { name: string; count: number }> = {};
    for (const [key, value] of sorted) result[key] = value;
    return { value: result, breakdown: { apporteurCount: sorted.length } };
  }
};

export const advanced2DevisDefinitions: Record<string, StatDefinition> = {
  taux_devis_abandonnes: tauxDevisAbandonnes,
  montant_devis_median: montantDevisMedian,
  delai_emission_devis: delaiEmissionDevis,
  devis_par_type_client: devisParTypeClient,
  delai_acceptation_devis_par_univers: delaiAcceptationDevisParUnivers,
  taux_conversion_devis_par_technicien: tauxConversionDevisParTechnicien,
  top_univers_par_taux_acceptation: topUniversParTauxAcceptation,
  top_apporteurs_par_volume_devis: topApporteursParVolumeDevis,
};
