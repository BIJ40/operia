/**
 * StatIA Definitions - Advanced Pack 2: SAV / Qualité
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { extractProjectUniverses } from '../engine/normalizers';
import { differenceInDays, parseISO } from 'date-fns';

const tauxRepetitionSav: StatDefinition = {
  id: 'taux_repetition_sav',
  label: 'Taux de répétition SAV',
  description: 'Proportion de dossiers ayant plusieurs interventions SAV',
  category: 'sav',
  source: ['interventions', 'projects'],
  dimensions: ['global'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions } = data;
    const { dateRange, savOverrides } = params;
    const savCountByProject: Record<number, number> = {};

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;
      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const type2 = intervention.type2?.toLowerCase();
      const isSav = type2 === 'sav' || savOverrides?.get(intervention.projectId)?.is_confirmed_sav === true;
      if (isSav) savCountByProject[intervention.projectId] = (savCountByProject[intervention.projectId] || 0) + 1;
    }

    const projectsWithSav = Object.keys(savCountByProject).length;
    const projectsWithMultipleSav = Object.values(savCountByProject).filter(c => c >= 2).length;
    return { value: projectsWithSav > 0 ? Math.round((projectsWithMultipleSav / projectsWithSav) * 10000) / 100 : 0, breakdown: { projectsWithSav, projectsWithMultipleSav } };
  }
};

const topUniversGenerantSav: StatDefinition = {
  id: 'top_univers_generant_sav',
  label: 'Top univers générant le plus de SAV',
  description: 'Classement des univers par volume de SAV',
  category: 'sav',
  source: ['interventions', 'projects'],
  dimensions: ['univers'],
  aggregation: 'count',
  unit: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, projects } = data;
    const { dateRange, savOverrides, filters } = params;
    const topN = filters?.topN || 10;
    const projectUniversMap: Record<number, string[]> = {};
    for (const project of projects) projectUniversMap[project.id] = extractProjectUniverses(project);
    const savByUnivers: Record<string, number> = {};

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;
      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const type2 = intervention.type2?.toLowerCase();
      const isSav = type2 === 'sav' || savOverrides?.get(intervention.projectId)?.is_confirmed_sav === true;
      if (!isSav) continue;
      for (const univers of (projectUniversMap[intervention.projectId] || ['Non catégorisé'])) {
        savByUnivers[univers] = (savByUnivers[univers] || 0) + 1;
      }
    }

    const sorted = Object.entries(savByUnivers).sort(([, a], [, b]) => b - a).slice(0, topN);
    const result: Record<string, number> = {};
    for (const [univers, count] of sorted) result[univers] = count;
    return { value: result, breakdown: { universCount: sorted.length } };
  }
};

const delaiMoyenResolutionSav: StatDefinition = {
  id: 'delai_moyen_resolution_sav',
  label: 'Délai moyen de résolution SAV',
  description: 'Temps moyen entre ouverture du SAV et clôture',
  category: 'sav',
  source: ['projects', 'interventions'],
  dimensions: ['global'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions } = data;
    const { dateRange, savOverrides } = params;
    const savDatesByProject: Record<number, { first: Date; last: Date }> = {};

    for (const intervention of interventions) {
      const type2 = intervention.type2?.toLowerCase();
      const isSav = type2 === 'sav' || savOverrides?.get(intervention.projectId)?.is_confirmed_sav === true;
      if (!isSav) continue;
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;
      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const projectId = intervention.projectId;
      if (!savDatesByProject[projectId]) {
        savDatesByProject[projectId] = { first: date, last: date };
      } else {
        if (date < savDatesByProject[projectId].first) savDatesByProject[projectId].first = date;
        if (date > savDatesByProject[projectId].last) savDatesByProject[projectId].last = date;
      }
    }

    const delays: number[] = [];
    for (const { first, last } of Object.values(savDatesByProject)) {
      const delay = differenceInDays(last, first);
      if (delay >= 0) delays.push(delay);
    }

    if (delays.length === 0) return { value: 0, breakdown: { savProjectCount: 0 } };
    return { value: Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10, breakdown: { savProjectCount: delays.length } };
  }
};

const tauxSavParTypeClient: StatDefinition = {
  id: 'taux_sav_par_type_client',
  label: 'Taux de SAV par type de client',
  description: 'Proportion de SAV selon le type de client',
  category: 'sav',
  source: ['interventions', 'projects', 'clients'],
  dimensions: ['type_client'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, projects, clients } = data;
    const { dateRange, savOverrides } = params;
    const projectClientMap: Record<number, number> = {};
    for (const project of projects) { if (project.clientId) projectClientMap[project.id] = project.clientId; }
    const clientTypeMap: Record<number, string> = {};
    for (const client of clients) clientTypeMap[client.id] = client.type || client.data?.type || 'Inconnu';
    const statsByType: Record<string, { total: number; sav: number }> = {};

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;
      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const state = intervention.state?.toLowerCase();
      if (state === 'cancelled' || state === 'refused') continue;
      const clientId = projectClientMap[intervention.projectId];
      const clientType = clientId ? (clientTypeMap[clientId] || 'Inconnu') : 'Inconnu';
      if (!statsByType[clientType]) statsByType[clientType] = { total: 0, sav: 0 };
      statsByType[clientType].total++;
      const type2 = intervention.type2?.toLowerCase();
      const isSav = type2 === 'sav' || savOverrides?.get(intervention.projectId)?.is_confirmed_sav === true;
      if (isSav) statsByType[clientType].sav++;
    }

    const result: Record<string, number> = {};
    for (const [type, stats] of Object.entries(statsByType)) {
      result[type] = stats.total > 0 ? Math.round((stats.sav / stats.total) * 10000) / 100 : 0;
    }
    return { value: result, breakdown: { typeCount: Object.keys(result).length } };
  }
};

export const advanced2SavDefinitions: Record<string, StatDefinition> = {
  taux_repetition_sav: tauxRepetitionSav,
  top_univers_generant_sav: topUniversGenerantSav,
  delai_moyen_resolution_sav: delaiMoyenResolutionSav,
  taux_sav_par_type_client: tauxSavParTypeClient,
};
