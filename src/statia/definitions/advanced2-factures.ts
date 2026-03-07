/**
 * StatIA Definitions - Advanced Pack 2: Factures / Cash-flow
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { parseISO, format } from 'date-fns';

const encaissementsParMois: StatDefinition = {
  id: 'encaissements_par_mois',
  label: 'Encaissements par mois',
  description: 'Montants encaissés par mois sur la période',
  category: 'recouvrement',
  source: 'factures',
  dimensions: ['mois'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    const { dateRange } = params;
    const encaissementsByMonth: Record<string, number> = {};

    for (const facture of factures) {
      const payments = facture.payments || facture.data?.payments || [];
      for (const payment of payments) {
        const paymentDate = payment.date || payment.dateReglement;
        if (!paymentDate) continue;
        const date = parseISO(paymentDate);
        if (date < dateRange.start || date > dateRange.end) continue;
        const monthKey = format(date, 'yyyy-MM');
        const montant = payment.montant || payment.amount || 0;
        encaissementsByMonth[monthKey] = (encaissementsByMonth[monthKey] || 0) + montant;
      }
    }

    return { value: encaissementsByMonth, breakdown: { monthCount: Object.keys(encaissementsByMonth).length } };
  }
};

const topClientsParRestantDu: StatDefinition = {
  id: 'top_clients_par_restant_du',
  label: 'Top clients par restant dû',
  description: 'Classement des clients selon le montant restant à encaisser',
  category: 'recouvrement',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['global'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, clients } = data;
    const { filters } = params;
    const topN = filters?.topN || 10;
    const projectClientMap: Record<number, number> = {};
    for (const project of projects) { if (project.clientId) projectClientMap[project.id] = project.clientId; }
    const clientNameMap: Record<number, string> = {};
    for (const client of clients) clientNameMap[client.id] = client.raisonSociale || client.nom || `Client ${client.id}`;
    const restantDuByClient: Record<string, { name: string; restant: number }> = {};

    for (const facture of factures) {
      const clientId = projectClientMap[facture.projectId];
      if (!clientId) continue;
      const restant = facture.calcReglementsReste || facture.data?.calcReglementsReste || 0;
      if (restant <= 0) continue;
      const clientKey = clientId.toString();
      if (!restantDuByClient[clientKey]) restantDuByClient[clientKey] = { name: clientNameMap[clientId] || `Client ${clientId}`, restant: 0 };
      restantDuByClient[clientKey].restant += restant;
    }

    const sorted = Object.entries(restantDuByClient).sort(([, a], [, b]) => b.restant - a.restant).slice(0, topN);
    const result: Record<string, { name: string; restant: number }> = {};
    for (const [key, value] of sorted) result[key] = value;
    return { value: result, breakdown: { clientCount: sorted.length } };
  }
};

const volumeFacturesPartielles: StatDefinition = {
  id: 'volume_factures_partielles',
  label: 'Volume de factures partielles',
  description: 'Nombre de dossiers avec facturation en plusieurs fois',
  category: 'recouvrement',
  source: ['factures', 'projects'],
  dimensions: ['global'],
  aggregation: 'count',
  unit: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    const { dateRange } = params;
    const facturesByProject: Record<number, number> = {};

    for (const facture of factures) {
      const factureDate = facture.dateReelle || facture.date;
      if (!factureDate) continue;
      const date = parseISO(factureDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      if (facture.typeFacture?.toLowerCase() === 'avoir') continue;
      if (facture.projectId) facturesByProject[facture.projectId] = (facturesByProject[facture.projectId] || 0) + 1;
    }

    const dossiersAvecMultiFactures = Object.values(facturesByProject).filter(c => c >= 2).length;
    return { value: dossiersAvecMultiFactures, breakdown: { totalDossiers: Object.keys(facturesByProject).length, dossiersAvecMultiFactures } };
  }
};

const projectionTresorerie30j: StatDefinition = {
  id: 'projection_tresorerie_30j',
  label: 'Projection trésorerie à 30 jours',
  description: 'Projection simplifiée des encaissements à 30 jours',
  category: 'recouvrement',
  source: 'factures',
  dimensions: ['global'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let projection = 0;
    let factureCount = 0;

    for (const facture of factures) {
      const restant = facture.calcReglementsReste || facture.data?.calcReglementsReste || 0;
      if (restant <= 0) continue;
      const echeance = facture.dateEcheance || facture.data?.dateEcheance;
      if (echeance) {
        const dateEcheance = parseISO(echeance);
        if (dateEcheance <= in30Days) { projection += restant; factureCount++; }
      } else {
        projection += restant * 0.5;
        factureCount++;
      }
    }

    return { value: Math.round(projection * 100) / 100, breakdown: { factureCount } };
  }
};

export const advanced2FacturesDefinitions: Record<string, StatDefinition> = {
  encaissements_par_mois: encaissementsParMois,
  top_clients_par_restant_du: topClientsParRestantDu,
  volume_factures_partielles: volumeFacturesPartielles,
  projection_tresorerie_30j: projectionTresorerie30j,
};
