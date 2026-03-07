/**
 * StatIA Definitions - Advanced Pack 2: Interventions / Productivité
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { extractProjectUniverses } from '../engine/normalizers';
import { parseISO, getDay, format } from 'date-fns';

const ratioInterventionsFaitesVsPlanifiees: StatDefinition = {
  id: 'ratio_interventions_faites_vs_planifiees',
  label: 'Ratio interventions réalisées vs planifiées',
  description: 'Taux de réalisation des interventions planifiées',
  category: 'productivite',
  source: 'interventions',
  dimensions: ['global'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions } = data;
    const { dateRange } = params;
    let planifiees = 0, realisees = 0;

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;
      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const state = intervention.state?.toLowerCase();
      if (state === 'cancelled' || state === 'refused') continue;
      planifiees++;
      if (['validated', 'done', 'finished', 'completed'].includes(state)) realisees++;
    }

    return { value: planifiees > 0 ? Math.round((realisees / planifiees) * 10000) / 100 : 0, breakdown: { planifiees, realisees } };
  }
};

const dureeMoyenneParUnivers: StatDefinition = {
  id: 'duree_moyenne_par_univers',
  label: 'Durée moyenne d\'intervention par univers',
  description: 'Temps moyen passé par intervention, ventilé par univers',
  category: 'productivite',
  source: ['interventions', 'projects'],
  dimensions: ['univers'],
  aggregation: 'avg',
  unit: 'h',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, projects } = data;
    const { dateRange } = params;
    const projectUniversMap: Record<number, string[]> = {};
    for (const project of projects) projectUniversMap[project.id] = extractProjectUniverses(project);
    const durationsByUnivers: Record<string, number[]> = {};

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;
      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const state = intervention.state?.toLowerCase();
      if (!['validated', 'done', 'finished'].includes(state)) continue;
      let totalDuration = 0;
      for (const visite of (intervention.visites || [])) totalDuration += visite.duree || visite.dureeMinutes || 0;
      if (totalDuration === 0) continue;
      const universes = projectUniversMap[intervention.projectId] || ['Non catégorisé'];
      const durationPerUniverse = totalDuration / universes.length;
      for (const univers of universes) {
        if (!durationsByUnivers[univers]) durationsByUnivers[univers] = [];
        durationsByUnivers[univers].push(durationPerUniverse);
      }
    }

    const result: Record<string, number> = {};
    for (const [univers, durations] of Object.entries(durationsByUnivers)) {
      result[univers] = Math.round((durations.reduce((a, b) => a + b, 0) / durations.length / 60) * 100) / 100;
    }
    return { value: result, breakdown: { universCount: Object.keys(result).length } };
  }
};

const nbInterventionsJourParTechnicien: StatDefinition = {
  id: 'nb_interventions_jour_par_technicien',
  label: 'Nombre moyen d\'interventions par jour et par technicien',
  description: 'Volume moyen d\'interventions réalisées par jour ouvré pour chaque technicien',
  category: 'productivite',
  source: ['interventions', 'users'],
  dimensions: ['technicien'],
  aggregation: 'avg',
  unit: 'interventions/jour',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, users } = data;
    const { dateRange } = params;
    const userNameMap: Record<number, string> = {};
    for (const user of users) userNameMap[user.id] = `${user.firstname || ''} ${user.lastname || ''}`.trim() || `Tech ${user.id}`;
    const interventionsByTechAndDay: Record<string, Set<string>> = {};
    const interventionCountByTech: Record<string, number> = {};

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;
      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const state = intervention.state?.toLowerCase();
      if (!['validated', 'done', 'finished'].includes(state)) continue;
      const techId = intervention.userId?.toString();
      if (!techId) continue;
      const dayKey = format(date, 'yyyy-MM-dd');
      if (!interventionsByTechAndDay[techId]) interventionsByTechAndDay[techId] = new Set();
      interventionsByTechAndDay[techId].add(dayKey);
      interventionCountByTech[techId] = (interventionCountByTech[techId] || 0) + 1;
    }

    const result: Record<string, { name: string; avg: number }> = {};
    for (const techId of Object.keys(interventionCountByTech)) {
      const daysWorked = interventionsByTechAndDay[techId]?.size || 1;
      result[techId] = { name: userNameMap[parseInt(techId)] || `Tech ${techId}`, avg: Math.round((interventionCountByTech[techId] / daysWorked) * 100) / 100 };
    }
    return { value: result, breakdown: { technicianCount: Object.keys(result).length } };
  }
};

const tauxAnnulationsInterventions: StatDefinition = {
  id: 'taux_annulations_interventions',
  label: 'Taux d\'annulations d\'interventions',
  description: 'Proportion d\'interventions annulées par rapport aux interventions planifiées',
  category: 'productivite',
  source: 'interventions',
  dimensions: ['global'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions } = data;
    const { dateRange } = params;
    let total = 0, annulees = 0;

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;
      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      total++;
      const state = intervention.state?.toLowerCase();
      if (state === 'cancelled' || state === 'annulee') annulees++;
    }

    return { value: total > 0 ? Math.round((annulees / total) * 10000) / 100 : 0, breakdown: { total, annulees } };
  }
};

const chargeTravailParJourSemaine: StatDefinition = {
  id: 'charge_travail_par_jour_semaine',
  label: 'Charge de travail par jour de semaine',
  description: 'Nombre d\'interventions par jour de semaine',
  category: 'productivite',
  source: 'interventions',
  dimensions: ['jour_semaine'],
  aggregation: 'count',
  unit: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions } = data;
    const { dateRange } = params;
    const joursSemaine = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const countByDay: Record<string, number> = {};

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;
      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const state = intervention.state?.toLowerCase();
      if (state === 'cancelled' || state === 'refused') continue;
      countByDay[joursSemaine[getDay(date)]] = (countByDay[joursSemaine[getDay(date)]] || 0) + 1;
    }

    return { value: countByDay, breakdown: { totalInterventions: Object.values(countByDay).reduce((a, b) => a + b, 0) } };
  }
};

const tauxInterventionsUrgentes: StatDefinition = {
  id: 'taux_interventions_urgentes',
  label: 'Taux d\'interventions urgentes',
  description: 'Proportion d\'interventions marquées urgentes',
  category: 'productivite',
  source: 'interventions',
  dimensions: ['global'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions } = data;
    const { dateRange } = params;
    let total = 0, urgentes = 0;

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;
      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const state = intervention.state?.toLowerCase();
      if (state === 'cancelled' || state === 'refused') continue;
      total++;
      const isUrgent = intervention.urgent || intervention.data?.urgent || intervention.type?.toLowerCase().includes('urgent') || intervention.type2?.toLowerCase().includes('urgent');
      if (isUrgent) urgentes++;
    }

    return { value: total > 0 ? Math.round((urgentes / total) * 10000) / 100 : 0, breakdown: { total, urgentes } };
  }
};

export const advanced2InterventionsDefinitions: Record<string, StatDefinition> = {
  ratio_interventions_faites_vs_planifiees: ratioInterventionsFaitesVsPlanifiees,
  duree_moyenne_par_univers: dureeMoyenneParUnivers,
  nb_interventions_jour_par_technicien: nbInterventionsJourParTechnicien,
  taux_annulations_interventions: tauxAnnulationsInterventions,
  charge_travail_par_jour_semaine: chargeTravailParJourSemaine,
  taux_interventions_urgentes: tauxInterventionsUrgentes,
};
