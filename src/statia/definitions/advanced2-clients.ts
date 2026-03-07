/**
 * StatIA Definitions - Advanced Pack 2: Clients & Fidélité
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { extractFactureMeta, isFactureIncludedForStat } from '../shared/factureMeta';
import { differenceInDays, parseISO } from 'date-fns';

const valeurVieClient: StatDefinition = {
  id: 'valeur_vie_client',
  label: 'Valeur vie client (CLV simplifiée)',
  description: 'Estimation de la valeur vie client basée sur l\'historique de CA et la fréquence d\'achat',
  category: 'dossiers',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['global'],
  aggregation: 'avg',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    const caByClient: Record<string, number> = {};

    for (const project of projects) {
      const clientId = project.clientId?.toString();
      if (!clientId) continue;
    }

    for (const facture of factures) {
      const project = projects.find(p => p.id === facture.projectId);
      const clientId = project?.clientId?.toString();
      if (!clientId) continue;
      const isAvoir = facture.typeFacture?.toLowerCase() === 'avoir';
      const montant = isAvoir ? -Math.abs(facture.totalHT || 0) : (facture.totalHT || 0);
      caByClient[clientId] = (caByClient[clientId] || 0) + montant;
    }

    const clientIds = Object.keys(caByClient);
    if (clientIds.length === 0) {
      return { value: 0, breakdown: { clientCount: 0 } };
    }

    const totalCLV = clientIds.reduce((sum, id) => sum + (caByClient[id] * 3), 0);
    const avgCLV = totalCLV / clientIds.length;

    return {
      value: Math.round(avgCLV * 100) / 100,
      breakdown: { clientCount: clientIds.length, totalCLV }
    };
  }
};

const caClientsTop20: StatDefinition = {
  id: 'ca_clients_top_20',
  label: 'CA des 20% meilleurs clients',
  description: 'Part du CA réalisée avec les 20% de clients les plus contributeurs',
  category: 'ca',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['global'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    const caByClient: Record<string, number> = {};
    let recordCount = 0;

    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!isFactureIncludedForStat(meta, params)) continue;
      const project = projects.find(p => p.id === facture.projectId);
      const clientId = project?.clientId?.toString();
      if (!clientId) continue;
      caByClient[clientId] = (caByClient[clientId] || 0) + meta.montantNetHT;
      recordCount++;
    }

    const clientIds = Object.keys(caByClient);
    if (clientIds.length === 0) {
      return { value: 0, breakdown: { clientCount: 0, top20Count: 0, top20CA: 0, totalCA: 0 }, metadata: { computedAt: new Date(), source: 'factures', recordCount: 0 } };
    }

    const sortedClients = clientIds.sort((a, b) => caByClient[b] - caByClient[a]);
    const top20Count = Math.ceil(sortedClients.length * 0.2);
    const top20Clients = sortedClients.slice(0, top20Count);
    const totalCA = Object.values(caByClient).reduce((a, b) => a + b, 0);
    const top20CA = top20Clients.reduce((sum, id) => sum + caByClient[id], 0);
    const ratio = totalCA > 0 ? (top20CA / totalCA) * 100 : 0;

    return {
      value: Math.round(ratio * 100) / 100,
      breakdown: { clientCount: clientIds.length, top20Count, top20CA, totalCA },
      metadata: { computedAt: new Date(), source: 'factures', recordCount }
    };
  }
};

const frequenceAchatClient: StatDefinition = {
  id: 'frequence_achat_client',
  label: 'Fréquence d\'achat client',
  description: 'Nombre moyen de dossiers par client sur la période',
  category: 'dossiers',
  source: ['projects', 'clients'],
  dimensions: ['global'],
  aggregation: 'avg',
  unit: 'dossiers/client',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    const { dateRange } = params;
    const projectsByClient: Record<string, number> = {};

    for (const project of projects) {
      const clientId = project.clientId?.toString();
      if (!clientId) continue;
      const projectDate = project.dateReelle || project.date;
      if (!projectDate) continue;
      const date = parseISO(projectDate);
      if (date < dateRange.start || date > dateRange.end) continue;
      projectsByClient[clientId] = (projectsByClient[clientId] || 0) + 1;
    }

    const clientIds = Object.keys(projectsByClient);
    if (clientIds.length === 0) {
      return { value: 0, breakdown: { clientCount: 0 } };
    }

    const totalDossiers = Object.values(projectsByClient).reduce((a, b) => a + b, 0);
    const avgFrequence = totalDossiers / clientIds.length;

    return {
      value: Math.round(avgFrequence * 100) / 100,
      breakdown: { clientCount: clientIds.length, totalDossiers }
    };
  }
};

const delaiEntreDeuxDossiers: StatDefinition = {
  id: 'delai_entre_deux_dossiers',
  label: 'Délai moyen entre deux dossiers pour un client',
  description: 'Intervalle moyen en jours entre deux dossiers d\'un même client',
  category: 'dossiers',
  source: ['projects', 'clients'],
  dimensions: ['global'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    const projectDatesByClient: Record<string, Date[]> = {};

    for (const project of projects) {
      const clientId = project.clientId?.toString();
      if (!clientId) continue;
      const projectDate = project.dateReelle || project.date;
      if (!projectDate) continue;
      if (!projectDatesByClient[clientId]) projectDatesByClient[clientId] = [];
      projectDatesByClient[clientId].push(parseISO(projectDate));
    }

    const allDelays: number[] = [];
    for (const dates of Object.values(projectDatesByClient)) {
      if (dates.length < 2) continue;
      dates.sort((a, b) => a.getTime() - b.getTime());
      for (let i = 1; i < dates.length; i++) {
        const delay = differenceInDays(dates[i], dates[i - 1]);
        if (delay > 0 && delay <= 730) allDelays.push(delay);
      }
    }

    if (allDelays.length === 0) {
      return { value: 0, breakdown: { clientsAvecPlusieurs: 0 } };
    }

    const avgDelay = allDelays.reduce((a, b) => a + b, 0) / allDelays.length;
    return {
      value: Math.round(avgDelay * 10) / 10,
      breakdown: { clientsAvecPlusieurs: Object.values(projectDatesByClient).filter(d => d.length >= 2).length, totalIntervals: allDelays.length }
    };
  }
};

const tauxClientsInactifs: StatDefinition = {
  id: 'taux_clients_inactifs',
  label: 'Taux de clients inactifs',
  description: 'Proportion de clients sans dossier depuis plus de X jours',
  category: 'dossiers',
  source: ['projects', 'clients'],
  dimensions: ['global'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, clients } = data;
    const { filters } = params;
    const seuilJours = filters?.seuilJours || 180;
    const now = new Date();
    const lastProjectByClient: Record<string, Date> = {};

    for (const project of projects) {
      const clientId = project.clientId?.toString();
      if (!clientId) continue;
      const projectDate = project.dateReelle || project.date;
      if (!projectDate) continue;
      const date = parseISO(projectDate);
      if (!lastProjectByClient[clientId] || date > lastProjectByClient[clientId]) {
        lastProjectByClient[clientId] = date;
      }
    }

    const totalClients = clients.length;
    if (totalClients === 0) return { value: 0, breakdown: { totalClients: 0, inactifs: 0 } };

    let inactifs = 0;
    for (const client of clients) {
      const lastDate = lastProjectByClient[client.id?.toString()];
      if (!lastDate || differenceInDays(now, lastDate) > seuilJours) inactifs++;
    }

    const ratio = (inactifs / totalClients) * 100;
    return {
      value: Math.round(ratio * 100) / 100,
      breakdown: { totalClients, inactifs, seuilJours }
    };
  }
};

const tauxClientsPerdus: StatDefinition = {
  id: 'taux_clients_perdus',
  label: 'Taux de clients potentiellement perdus',
  description: 'Proportion de clients sans dossier depuis plus longtemps qu\'un seuil d\'inactivité',
  category: 'dossiers',
  source: ['projects', 'clients'],
  dimensions: ['global'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    const { filters } = params;
    const seuilJours = filters?.seuilJours || 365;
    const now = new Date();
    const lastProjectDateByClient: Record<string, Date> = {};

    for (const project of projects) {
      const clientId = project.clientId?.toString();
      if (!clientId) continue;
      const projectDate = project.dateReelle || project.date;
      if (!projectDate) continue;
      const date = parseISO(projectDate);
      if (!lastProjectDateByClient[clientId] || date > lastProjectDateByClient[clientId]) {
        lastProjectDateByClient[clientId] = date;
      }
    }

    const clientIds = Object.keys(lastProjectDateByClient);
    if (clientIds.length === 0) return { value: 0, breakdown: { clientCount: 0, perdusCount: 0 } };

    let perdusCount = 0;
    for (const clientId of clientIds) {
      if (differenceInDays(now, lastProjectDateByClient[clientId]) > seuilJours) perdusCount++;
    }

    const ratio = (perdusCount / clientIds.length) * 100;
    return {
      value: Math.round(ratio * 100) / 100,
      breakdown: { clientCount: clientIds.length, perdusCount, seuilJours }
    };
  }
};

const tauxClientsRecuperes: StatDefinition = {
  id: 'taux_clients_recuperes',
  label: 'Taux de clients récupérés',
  description: 'Clients revenus après une période d\'inactivité prolongée',
  category: 'dossiers',
  source: ['projects', 'clients'],
  dimensions: ['global'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    const { dateRange, filters } = params;
    const seuilJours = filters?.seuilJours || 365;
    const projectDatesByClient: Record<string, Date[]> = {};

    for (const project of projects) {
      const clientId = project.clientId?.toString();
      if (!clientId) continue;
      const projectDate = project.dateReelle || project.date;
      if (!projectDate) continue;
      if (!projectDatesByClient[clientId]) projectDatesByClient[clientId] = [];
      projectDatesByClient[clientId].push(parseISO(projectDate));
    }

    let clientsInactifsBefore = 0;
    let clientsRecuperes = 0;

    for (const clientId of Object.keys(projectDatesByClient)) {
      const dates = projectDatesByClient[clientId].sort((a, b) => a.getTime() - b.getTime());
      const datesBeforePeriod = dates.filter(d => d < dateRange.start);
      const datesInPeriod = dates.filter(d => d >= dateRange.start && d <= dateRange.end);
      if (datesBeforePeriod.length === 0) continue;
      const lastDateBefore = datesBeforePeriod[datesBeforePeriod.length - 1];
      if (differenceInDays(dateRange.start, lastDateBefore) > seuilJours) {
        clientsInactifsBefore++;
        if (datesInPeriod.length > 0) clientsRecuperes++;
      }
    }

    const ratio = clientsInactifsBefore > 0 ? (clientsRecuperes / clientsInactifsBefore) * 100 : 0;
    return {
      value: Math.round(ratio * 100) / 100,
      breakdown: { clientsInactifsBefore, clientsRecuperes, seuilJours }
    };
  }
};

export const advanced2ClientsDefinitions: Record<string, StatDefinition> = {
  valeur_vie_client: valeurVieClient,
  ca_clients_top_20: caClientsTop20,
  frequence_achat_client: frequenceAchatClient,
  delai_entre_deux_dossiers: delaiEntreDeuxDossiers,
  taux_clients_inactifs: tauxClientsInactifs,
  taux_clients_perdus: tauxClientsPerdus,
  taux_clients_recuperes: tauxClientsRecuperes,
};
