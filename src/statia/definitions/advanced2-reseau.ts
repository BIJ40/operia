/**
 * StatIA Definitions - Advanced Pack 2: Réseau / Multi-agences
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { parseISO } from 'date-fns';

const classementAgencesParPanierMoyen: StatDefinition = {
  id: 'classement_agences_par_panier_moyen',
  label: 'Classement agences par panier moyen',
  description: 'Classement des agences en fonction du panier moyen par dossier',
  category: 'reseau',
  source: ['factures', 'projects'],
  dimensions: ['agence'],
  aggregation: 'avg',
  unit: '€',
  compute: (): StatResult => ({ value: {}, breakdown: { error: 'Métrique réseau - nécessite contexte multi-agences' } })
};

const classementAgencesParDelaiMoyenRdv: StatDefinition = {
  id: 'classement_agences_par_delai_moyen_rdv',
  label: 'Classement agences par délai moyen d\'obtention de RDV',
  description: 'Classement des agences selon le délai moyen entre dossier et première intervention',
  category: 'reseau',
  source: ['projects', 'interventions'],
  dimensions: ['agence'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (): StatResult => ({ value: {}, breakdown: { error: 'Métrique réseau - nécessite contexte multi-agences' } })
};

const tauxCroissanceCaAgenceVsN1: StatDefinition = {
  id: 'taux_croissance_ca_agence_vs_n_1',
  label: 'Croissance CA par agence vs N-1',
  description: 'Variation du CA de chaque agence par rapport à la même période N-1',
  category: 'reseau',
  source: 'factures',
  dimensions: ['agence'],
  aggregation: 'ratio',
  unit: '%',
  compute: (): StatResult => ({ value: {}, breakdown: { error: 'Métrique réseau - nécessite contexte multi-agences' } })
};

const topZonesPostalesParCa: StatDefinition = {
  id: 'top_zones_postales_par_ca',
  label: 'Top zones postales par CA',
  description: 'Classement des zones postales par CA HT',
  category: 'reseau',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['global'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, clients } = data;
    const { dateRange, filters } = params;
    const topN = filters?.topN || 10;
    const clientCpMap: Record<number, string> = {};
    for (const client of clients) {
      const cp = client.codePostal || client.data?.codePostal || client.address?.codePostal;
      if (cp) clientCpMap[client.id] = cp.toString().substring(0, 2);
    }
    const projectClientMap: Record<number, number> = {};
    for (const project of projects) { if (project.clientId) projectClientMap[project.id] = project.clientId; }
    const caByZone: Record<string, number> = {};

    for (const facture of factures) {
      const factureDate = facture.dateReelle || facture.date;
      if (!factureDate) continue;
      const date = parseISO(factureDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      const clientId = projectClientMap[facture.projectId];
      const zone = clientId ? (clientCpMap[clientId] || 'Inconnu') : 'Inconnu';
      const isAvoir = facture.typeFacture?.toLowerCase() === 'avoir';
      const montant = isAvoir ? -Math.abs(facture.totalHT || 0) : (facture.totalHT || 0);
      caByZone[zone] = (caByZone[zone] || 0) + montant;
    }

    const sorted = Object.entries(caByZone).sort(([, a], [, b]) => b - a).slice(0, topN);
    const result: Record<string, number> = {};
    for (const [zone, ca] of sorted) result[zone] = Math.round(ca * 100) / 100;
    return { value: result, breakdown: { zoneCount: sorted.length } };
  }
};

export const advanced2ReseauDefinitions: Record<string, StatDefinition> = {
  classement_agences_par_panier_moyen: classementAgencesParPanierMoyen,
  classement_agences_par_delai_moyen_rdv: classementAgencesParDelaiMoyenRdv,
  taux_croissance_ca_agence_vs_n_1: tauxCroissanceCaAgenceVsN1,
  top_zones_postales_par_ca: topZonesPostalesParCa,
};
