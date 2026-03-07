/**
 * StatIA Definitions - Advanced Pack 2: Univers / Mix Produit
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { extractProjectUniverses } from '../engine/normalizers';
import { differenceInDays, parseISO, subYears } from 'date-fns';

const mixCaGlobalParUnivers: StatDefinition = {
  id: 'mix_ca_global_par_univers',
  label: 'Mix CA global par univers',
  description: 'Répartition du CA global en pourcentage par univers',
  category: 'univers',
  source: ['factures', 'projects'],
  dimensions: ['univers'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    const { dateRange } = params;
    const projectUniversMap: Record<number, string[]> = {};
    for (const project of projects) projectUniversMap[project.id] = extractProjectUniverses(project);
    let totalCA = 0;
    const caByUnivers: Record<string, number> = {};

    for (const facture of factures) {
      const factureDate = facture.dateReelle || facture.date;
      if (!factureDate) continue;
      const date = parseISO(factureDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const isAvoir = facture.typeFacture?.toLowerCase() === 'avoir';
      const montant = isAvoir ? -Math.abs(facture.totalHT || 0) : (facture.totalHT || 0);
      totalCA += montant;
      const universes = projectUniversMap[facture.projectId] || ['Non catégorisé'];
      const montantPerUniverse = montant / universes.length;
      for (const univers of universes) caByUnivers[univers] = (caByUnivers[univers] || 0) + montantPerUniverse;
    }

    const result: Record<string, number> = {};
    for (const [univers, ca] of Object.entries(caByUnivers)) {
      result[univers] = totalCA > 0 ? Math.round((ca / totalCA) * 10000) / 100 : 0;
    }
    return { value: result, breakdown: { totalCA, universCount: Object.keys(result).length } };
  }
};

const croissanceParUniversVsN1: StatDefinition = {
  id: 'croissance_par_univers_vs_n_1',
  label: 'Croissance CA par univers vs N-1',
  description: 'Variation du CA par univers par rapport à la même période N-1',
  category: 'univers',
  source: ['factures', 'projects'],
  dimensions: ['univers'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    const { dateRange } = params;
    const projectUniversMap: Record<number, string[]> = {};
    for (const project of projects) projectUniversMap[project.id] = extractProjectUniverses(project);
    const n1Start = subYears(dateRange.start, 1);
    const n1End = subYears(dateRange.end, 1);
    const caByUniversN: Record<string, number> = {};
    const caByUniversN1: Record<string, number> = {};

    for (const facture of factures) {
      const factureDate = facture.dateReelle || facture.date;
      if (!factureDate) continue;
      const date = parseISO(factureDate);
      const isAvoir = facture.typeFacture?.toLowerCase() === 'avoir';
      const montant = isAvoir ? -Math.abs(facture.totalHT || 0) : (facture.totalHT || 0);
      const universes = projectUniversMap[facture.projectId] || ['Non catégorisé'];
      const montantPerUniverse = montant / universes.length;
      const isCurrentPeriod = date >= dateRange.start && date <= dateRange.end;
      const isN1Period = date >= n1Start && date <= n1End;
      for (const univers of universes) {
        if (isCurrentPeriod) caByUniversN[univers] = (caByUniversN[univers] || 0) + montantPerUniverse;
        if (isN1Period) caByUniversN1[univers] = (caByUniversN1[univers] || 0) + montantPerUniverse;
      }
    }

    const result: Record<string, number> = {};
    const allUnivers = new Set([...Object.keys(caByUniversN), ...Object.keys(caByUniversN1)]);
    for (const univers of allUnivers) {
      const caN = caByUniversN[univers] || 0;
      const caN1 = caByUniversN1[univers] || 0;
      result[univers] = caN1 > 0 ? Math.round(((caN - caN1) / caN1) * 10000) / 100 : caN > 0 ? 100 : 0;
    }
    return { value: result, breakdown: { universCount: allUnivers.size } };
  }
};

const rentabiliteParUnivers: StatDefinition = {
  id: 'rentabilite_par_univers',
  label: 'Rentabilité par univers (CA / temps)',
  description: 'CA horaire moyen par univers',
  category: 'univers',
  source: ['factures', 'interventions', 'projects'],
  dimensions: ['univers'],
  aggregation: 'ratio',
  unit: '€/h',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, interventions, projects } = data;
    const { dateRange } = params;
    const projectUniversMap: Record<number, string[]> = {};
    for (const project of projects) projectUniversMap[project.id] = extractProjectUniverses(project);
    const caByUnivers: Record<string, number> = {};
    const heuresByUnivers: Record<string, number> = {};

    for (const facture of factures) {
      const factureDate = facture.dateReelle || facture.date;
      if (!factureDate) continue;
      const date = parseISO(factureDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const isAvoir = facture.typeFacture?.toLowerCase() === 'avoir';
      const montant = isAvoir ? -Math.abs(facture.totalHT || 0) : (facture.totalHT || 0);
      const universes = projectUniversMap[facture.projectId] || ['Non catégorisé'];
      const montantPerUniverse = montant / universes.length;
      for (const univers of universes) caByUnivers[univers] = (caByUnivers[univers] || 0) + montantPerUniverse;
    }

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;
      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const state = intervention.state?.toLowerCase();
      if (!['validated', 'done', 'finished'].includes(state)) continue;
      let totalMinutes = 0;
      for (const visite of (intervention.visites || [])) totalMinutes += visite.duree || visite.dureeMinutes || 0;
      if (totalMinutes === 0) continue;
      const universes = projectUniversMap[intervention.projectId] || ['Non catégorisé'];
      const minutesPerUniverse = totalMinutes / universes.length;
      for (const univers of universes) heuresByUnivers[univers] = (heuresByUnivers[univers] || 0) + minutesPerUniverse / 60;
    }

    const result: Record<string, number> = {};
    const allUnivers = new Set([...Object.keys(caByUnivers), ...Object.keys(heuresByUnivers)]);
    for (const univers of allUnivers) {
      const ca = caByUnivers[univers] || 0;
      const heures = heuresByUnivers[univers] || 0;
      result[univers] = heures > 0 ? Math.round((ca / heures) * 100) / 100 : 0;
    }
    return { value: result, breakdown: { universCount: allUnivers.size } };
  }
};

const cycleMoyenDossierParUnivers: StatDefinition = {
  id: 'cycle_moyen_dossier_par_univers',
  label: 'Cycle moyen dossier par univers',
  description: 'Durée moyenne d\'un dossier de sa création à sa clôture pour chaque univers',
  category: 'univers',
  source: 'projects',
  dimensions: ['univers'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    const { dateRange } = params;
    const cyclesByUnivers: Record<string, number[]> = {};

    for (const project of projects) {
      const createdDate = project.date || project.dateReelle;
      if (!createdDate) continue;
      const created = parseISO(createdDate);
      if (created < dateRange.start || created > dateRange.end) continue;
      const closedDate = project.dateCloture || project.data?.dateCloture;
      if (!closedDate) continue;
      const cycle = differenceInDays(parseISO(closedDate), created);
      if (cycle < 0 || cycle > 365) continue;
      for (const univers of extractProjectUniverses(project)) {
        if (!cyclesByUnivers[univers]) cyclesByUnivers[univers] = [];
        cyclesByUnivers[univers].push(cycle);
      }
    }

    const result: Record<string, number> = {};
    for (const [univers, cycles] of Object.entries(cyclesByUnivers)) {
      result[univers] = Math.round((cycles.reduce((a, b) => a + b, 0) / cycles.length) * 10) / 10;
    }
    return { value: result, breakdown: { universCount: Object.keys(result).length } };
  }
};

export const advanced2UniversDefinitions: Record<string, StatDefinition> = {
  croissance_par_univers_vs_n_1: croissanceParUniversVsN1,
  cycle_moyen_dossier_par_univers: cycleMoyenDossierParUnivers,
  mix_ca_global_par_univers: mixCaGlobalParUnivers,
  rentabilite_par_univers: rentabiliteParUnivers,
};
