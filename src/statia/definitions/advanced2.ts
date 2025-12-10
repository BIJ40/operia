/**
 * StatIA Definitions - Pack 2 Advanced Metrics
 * ~40 nouvelles métriques couvrant: Clients/Fidélité, Devis/Commercial, 
 * Factures/Cash-flow, Interventions/Productivité, SAV/Qualité, Univers/Mix, Réseau
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { extractProjectUniverses } from '../engine/normalizers';
import { differenceInDays, parseISO, getDay, format, subYears } from 'date-fns';

// ===========================================================================
// A. CLIENTS & FIDÉLITÉ
// ===========================================================================

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
    // TODO: Nécessite un historique client plus profond pour calculer la CLV
    // CLV simplifiée = CA moyen annuel × nombre d'années projetées (ex: 3 ans)
    const { factures, projects, clients } = data;
    const { dateRange } = params;

    // Grouper le CA par client
    const caByClient: Record<string, number> = {};
    const projectsByClient: Record<string, number> = {};

    for (const project of projects) {
      const clientId = project.clientId?.toString();
      if (!clientId) continue;
      projectsByClient[clientId] = (projectsByClient[clientId] || 0) + 1;
    }

    for (const facture of factures) {
      const project = projects.find(p => p.id === facture.projectId);
      const clientId = project?.clientId?.toString();
      if (!clientId) continue;

      const isAvoir = facture.typeFacture?.toLowerCase() === 'avoir';
      const montant = isAvoir ? -Math.abs(facture.totalHT || 0) : (facture.totalHT || 0);
      caByClient[clientId] = (caByClient[clientId] || 0) + montant;
    }

    // Calculer CLV simplifiée (CA × 3 ans projeté)
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
    const { dateRange } = params;

    // Filtrer les factures par période
    const filteredFactures = factures.filter(f => {
      const factureDate = f.dateReelle || f.date;
      if (!factureDate || !dateRange?.start || !dateRange?.end) return true;
      const d = new Date(factureDate);
      return d >= dateRange.start && d <= dateRange.end;
    });

    // Grouper le CA par client
    const caByClient: Record<string, number> = {};

    for (const facture of filteredFactures) {
      const project = projects.find(p => p.id === facture.projectId);
      const clientId = project?.clientId?.toString();
      if (!clientId) continue;

      const isAvoir = facture.typeFacture?.toLowerCase() === 'avoir';
      const montant = isAvoir ? -Math.abs(facture.totalHT || 0) : (facture.totalHT || 0);
      caByClient[clientId] = (caByClient[clientId] || 0) + montant;
    }

    const clientIds = Object.keys(caByClient);
    if (clientIds.length === 0) {
      return { value: null, breakdown: { clientCount: 0, top20Count: 0 } };
    }

    // Trier par CA décroissant
    const sortedClients = clientIds.sort((a, b) => caByClient[b] - caByClient[a]);
    const top20Count = Math.ceil(sortedClients.length * 0.2);
    const top20Clients = sortedClients.slice(0, top20Count);

    const totalCA = Object.values(caByClient).reduce((a, b) => a + b, 0);
    const top20CA = top20Clients.reduce((sum, id) => sum + caByClient[id], 0);

    const ratio = totalCA > 0 ? (top20CA / totalCA) * 100 : 0;

    return {
      value: Math.round(ratio * 100) / 100,
      breakdown: { clientCount: clientIds.length, top20Count, top20CA, totalCA }
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
      const projectDate = project.dateReelle || project.date;
      if (!projectDate) continue;

      const date = parseISO(projectDate);
      if (date < dateRange.start || date > dateRange.end) continue;

      const clientId = project.clientId?.toString();
      if (!clientId) continue;

      projectsByClient[clientId] = (projectsByClient[clientId] || 0) + 1;
    }

    const clientIds = Object.keys(projectsByClient);
    if (clientIds.length === 0) {
      return { value: 0, breakdown: { clientCount: 0, totalProjects: 0 } };
    }

    const totalProjects = Object.values(projectsByClient).reduce((a, b) => a + b, 0);
    const avgFrequency = totalProjects / clientIds.length;

    return {
      value: Math.round(avgFrequency * 100) / 100,
      breakdown: { clientCount: clientIds.length, totalProjects }
    };
  }
};

const delaiEntreDeuxDossiers: StatDefinition = {
  id: 'delai_entre_deux_dossiers',
  label: 'Délai moyen entre deux dossiers pour un client',
  description: 'Temps moyen entre deux dossiers successifs pour les clients récurrents',
  category: 'dossiers',
  source: ['projects', 'clients'],
  dimensions: ['global'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;

    // Grouper les projets par client avec leurs dates
    const projectDatesByClient: Record<string, Date[]> = {};

    for (const project of projects) {
      const clientId = project.clientId?.toString();
      if (!clientId) continue;

      const projectDate = project.dateReelle || project.date;
      if (!projectDate) continue;

      if (!projectDatesByClient[clientId]) {
        projectDatesByClient[clientId] = [];
      }
      projectDatesByClient[clientId].push(parseISO(projectDate));
    }

    // Calculer les délais pour les clients avec ≥2 dossiers
    const allDelays: number[] = [];

    for (const clientId of Object.keys(projectDatesByClient)) {
      const dates = projectDatesByClient[clientId].sort((a, b) => a.getTime() - b.getTime());
      if (dates.length < 2) continue;

      for (let i = 1; i < dates.length; i++) {
        const delay = differenceInDays(dates[i], dates[i - 1]);
        if (delay > 0) allDelays.push(delay);
      }
    }

    if (allDelays.length === 0) {
      return { value: 0, breakdown: { recurrentClientCount: 0 } };
    }

    const avgDelay = allDelays.reduce((a, b) => a + b, 0) / allDelays.length;
    const recurrentClientCount = Object.values(projectDatesByClient).filter(d => d.length >= 2).length;

    return {
      value: Math.round(avgDelay),
      breakdown: { recurrentClientCount, delayCount: allDelays.length }
    };
  }
};

const tauxClientsInactifs: StatDefinition = {
  id: 'taux_clients_inactifs',
  label: 'Taux de clients inactifs',
  description: 'Proportion de clients n\'ayant pas eu de dossier sur la période par rapport à l\'historique',
  category: 'dossiers',
  source: ['projects', 'clients'],
  dimensions: ['global'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    const { dateRange } = params;

    const allClients = new Set<string>();
    const activeClients = new Set<string>();

    for (const project of projects) {
      const clientId = project.clientId?.toString();
      if (!clientId) continue;

      allClients.add(clientId);

      const projectDate = project.dateReelle || project.date;
      if (projectDate) {
        const date = parseISO(projectDate);
        if (date >= dateRange.start && date <= dateRange.end) {
          activeClients.add(clientId);
        }
      }
    }

    const inactiveCount = allClients.size - activeClients.size;
    const ratio = allClients.size > 0 ? (inactiveCount / allClients.size) * 100 : 0;

    return {
      value: Math.round(ratio * 100) / 100,
      breakdown: { allClients: allClients.size, activeClients: activeClients.size, inactiveCount }
    };
  }
};

// ===========================================================================
// B. DEVIS / COMMERCIAL
// ===========================================================================

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
        const daysSinceEmission = differenceInDays(now, date);
        if (daysSinceEmission > seuilJours) {
          abandonnes++;
        }
      }
    }

    const ratio = totalDevis > 0 ? (abandonnes / totalDevis) * 100 : 0;

    return {
      value: Math.round(ratio * 100) / 100,
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

    if (montants.length === 0) {
      return { value: 0, breakdown: { devisCount: 0 } };
    }

    montants.sort((a, b) => a - b);
    const mid = Math.floor(montants.length / 2);
    const median = montants.length % 2 !== 0
      ? montants[mid]
      : (montants[mid - 1] + montants[mid]) / 2;

    return {
      value: Math.round(median * 100) / 100,
      breakdown: { devisCount: montants.length }
    };
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

    // Grouper devis par project et trouver le premier
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
      if (delay >= 0 && delay <= 60) {
        delays.push(delay);
      }
    }

    if (delays.length === 0) {
      return { value: 0, breakdown: { projectCount: 0 } };
    }

    const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;

    return {
      value: Math.round(avgDelay * 10) / 10,
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
    for (const client of clients) {
      clientTypeMap[client.id] = client.type || client.data?.type || 'Inconnu';
    }

    const projectClientMap: Record<number, number> = {};
    for (const project of projects) {
      if (project.clientId) {
        projectClientMap[project.id] = project.clientId;
      }
    }

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

    return {
      value: countByType,
      breakdown: { totalDevis: Object.values(countByType).reduce((a, b) => a + b, 0) }
    };
  }
};

// ===========================================================================
// C. FACTURES / CASH-FLOW
// ===========================================================================

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
      // Utiliser les paiements si disponibles
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

    return {
      value: encaissementsByMonth,
      breakdown: { monthCount: Object.keys(encaissementsByMonth).length }
    };
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
    for (const project of projects) {
      if (project.clientId) {
        projectClientMap[project.id] = project.clientId;
      }
    }

    const clientNameMap: Record<number, string> = {};
    for (const client of clients) {
      clientNameMap[client.id] = client.raisonSociale || client.nom || `Client ${client.id}`;
    }

    const restantDuByClient: Record<string, { name: string; restant: number }> = {};

    for (const facture of factures) {
      const clientId = projectClientMap[facture.projectId];
      if (!clientId) continue;

      const restant = facture.calcReglementsReste || facture.data?.calcReglementsReste || 0;
      if (restant <= 0) continue;

      const clientKey = clientId.toString();
      if (!restantDuByClient[clientKey]) {
        restantDuByClient[clientKey] = {
          name: clientNameMap[clientId] || `Client ${clientId}`,
          restant: 0
        };
      }
      restantDuByClient[clientKey].restant += restant;
    }

    // Trier et prendre top N
    const sorted = Object.entries(restantDuByClient)
      .sort(([, a], [, b]) => b.restant - a.restant)
      .slice(0, topN);

    const result: Record<string, { name: string; restant: number }> = {};
    for (const [key, value] of sorted) {
      result[key] = value;
    }

    return {
      value: result,
      breakdown: { clientCount: sorted.length }
    };
  }
};

// ===========================================================================
// D. INTERVENTIONS / PRODUCTIVITÉ
// ===========================================================================

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

    let planifiees = 0;
    let realisees = 0;

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;

      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;

      const state = intervention.state?.toLowerCase();
      if (state === 'cancelled' || state === 'refused') continue;

      planifiees++;
      if (['validated', 'done', 'finished', 'completed'].includes(state)) {
        realisees++;
      }
    }

    const ratio = planifiees > 0 ? (realisees / planifiees) * 100 : 0;

    return {
      value: Math.round(ratio * 100) / 100,
      breakdown: { planifiees, realisees }
    };
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
    for (const project of projects) {
      projectUniversMap[project.id] = extractProjectUniverses(project);
    }

    const durationsByUnivers: Record<string, number[]> = {};

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;

      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;

      const state = intervention.state?.toLowerCase();
      if (!['validated', 'done', 'finished'].includes(state)) continue;

      // Calculer durée depuis visites ou créneaux
      let totalDuration = 0;
      const visites = intervention.visites || [];
      for (const visite of visites) {
        const duree = visite.duree || visite.dureeMinutes || 0;
        totalDuration += duree;
      }

      if (totalDuration === 0) continue;

      const universes = projectUniversMap[intervention.projectId] || ['Non catégorisé'];
      const durationPerUniverse = totalDuration / universes.length;

      for (const univers of universes) {
        if (!durationsByUnivers[univers]) {
          durationsByUnivers[univers] = [];
        }
        durationsByUnivers[univers].push(durationPerUniverse);
      }
    }

    const result: Record<string, number> = {};
    for (const [univers, durations] of Object.entries(durationsByUnivers)) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      result[univers] = Math.round((avg / 60) * 100) / 100; // Convertir en heures
    }

    return {
      value: result,
      breakdown: { universCount: Object.keys(result).length }
    };
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
    for (const user of users) {
      userNameMap[user.id] = `${user.firstname || ''} ${user.lastname || ''}`.trim() || `Tech ${user.id}`;
    }

    // Grouper par technicien et par jour
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
      const techKey = techId;

      if (!interventionsByTechAndDay[techKey]) {
        interventionsByTechAndDay[techKey] = new Set();
      }
      interventionsByTechAndDay[techKey].add(dayKey);

      interventionCountByTech[techKey] = (interventionCountByTech[techKey] || 0) + 1;
    }

    const result: Record<string, { name: string; avg: number }> = {};
    for (const techId of Object.keys(interventionCountByTech)) {
      const daysWorked = interventionsByTechAndDay[techId]?.size || 1;
      const totalInterventions = interventionCountByTech[techId];
      const avg = totalInterventions / daysWorked;

      result[techId] = {
        name: userNameMap[parseInt(techId)] || `Tech ${techId}`,
        avg: Math.round(avg * 100) / 100
      };
    }

    return {
      value: result,
      breakdown: { technicianCount: Object.keys(result).length }
    };
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

    let total = 0;
    let annulees = 0;

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;

      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;

      total++;
      const state = intervention.state?.toLowerCase();
      if (state === 'cancelled' || state === 'annulee') {
        annulees++;
      }
    }

    const ratio = total > 0 ? (annulees / total) * 100 : 0;

    return {
      value: Math.round(ratio * 100) / 100,
      breakdown: { total, annulees }
    };
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

      const dayOfWeek = getDay(date);
      const dayName = joursSemaine[dayOfWeek];
      countByDay[dayName] = (countByDay[dayName] || 0) + 1;
    }

    return {
      value: countByDay,
      breakdown: { totalInterventions: Object.values(countByDay).reduce((a, b) => a + b, 0) }
    };
  }
};

// ===========================================================================
// E. SAV / QUALITÉ
// ===========================================================================

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

    // Compter SAV par projet
    const savCountByProject: Record<number, number> = {};

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;

      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;

      // Vérifier si c'est un SAV
      const type2 = intervention.type2?.toLowerCase();
      const isSav = type2 === 'sav' || savOverrides?.get(intervention.projectId)?.is_confirmed_sav === true;

      if (isSav) {
        const projectId = intervention.projectId;
        savCountByProject[projectId] = (savCountByProject[projectId] || 0) + 1;
      }
    }

    const projectsWithSav = Object.keys(savCountByProject).length;
    const projectsWithMultipleSav = Object.values(savCountByProject).filter(c => c >= 2).length;

    const ratio = projectsWithSav > 0 ? (projectsWithMultipleSav / projectsWithSav) * 100 : 0;

    return {
      value: Math.round(ratio * 100) / 100,
      breakdown: { projectsWithSav, projectsWithMultipleSav }
    };
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
    for (const project of projects) {
      projectUniversMap[project.id] = extractProjectUniverses(project);
    }

    const savByUnivers: Record<string, number> = {};

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;

      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;

      const type2 = intervention.type2?.toLowerCase();
      const isSav = type2 === 'sav' || savOverrides?.get(intervention.projectId)?.is_confirmed_sav === true;

      if (!isSav) continue;

      const universes = projectUniversMap[intervention.projectId] || ['Non catégorisé'];
      for (const univers of universes) {
        savByUnivers[univers] = (savByUnivers[univers] || 0) + 1;
      }
    }

    // Trier et prendre top N
    const sorted = Object.entries(savByUnivers)
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN);

    const result: Record<string, number> = {};
    for (const [univers, count] of sorted) {
      result[univers] = count;
    }

    return {
      value: result,
      breakdown: { universCount: sorted.length }
    };
  }
};

// ===========================================================================
// F. UNIVERS / MIX PRODUIT
// ===========================================================================

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
    for (const project of projects) {
      projectUniversMap[project.id] = extractProjectUniverses(project);
    }

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

      for (const univers of universes) {
        caByUnivers[univers] = (caByUnivers[univers] || 0) + montantPerUniverse;
      }
    }

    // Convertir en pourcentages
    const result: Record<string, number> = {};
    for (const [univers, ca] of Object.entries(caByUnivers)) {
      result[univers] = totalCA > 0 ? Math.round((ca / totalCA) * 10000) / 100 : 0;
    }

    return {
      value: result,
      breakdown: { totalCA, universCount: Object.keys(result).length }
    };
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
    for (const project of projects) {
      projectUniversMap[project.id] = extractProjectUniverses(project);
    }

    // Période N-1
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
        if (isCurrentPeriod) {
          caByUniversN[univers] = (caByUniversN[univers] || 0) + montantPerUniverse;
        }
        if (isN1Period) {
          caByUniversN1[univers] = (caByUniversN1[univers] || 0) + montantPerUniverse;
        }
      }
    }

    // Calculer croissance
    const result: Record<string, number> = {};
    const allUnivers = new Set([...Object.keys(caByUniversN), ...Object.keys(caByUniversN1)]);

    for (const univers of allUnivers) {
      const caN = caByUniversN[univers] || 0;
      const caN1 = caByUniversN1[univers] || 0;
      
      if (caN1 > 0) {
        result[univers] = Math.round(((caN - caN1) / caN1) * 10000) / 100;
      } else if (caN > 0) {
        result[univers] = 100; // Nouveau univers
      } else {
        result[univers] = 0;
      }
    }

    return {
      value: result,
      breakdown: { universCount: allUnivers.size }
    };
  }
};

// ===========================================================================
// A-BIS. CLIENTS & FIDÉLITÉ (compléments)
// ===========================================================================

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

    // Trouver la dernière date de dossier par client
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
    if (clientIds.length === 0) {
      return { value: 0, breakdown: { clientCount: 0, perdusCount: 0 } };
    }

    let perdusCount = 0;
    for (const clientId of clientIds) {
      const lastDate = lastProjectDateByClient[clientId];
      const daysSinceLastProject = differenceInDays(now, lastDate);
      if (daysSinceLastProject > seuilJours) {
        perdusCount++;
      }
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

    // Grouper tous les projets par client avec dates triées
    const projectDatesByClient: Record<string, Date[]> = {};

    for (const project of projects) {
      const clientId = project.clientId?.toString();
      if (!clientId) continue;

      const projectDate = project.dateReelle || project.date;
      if (!projectDate) continue;

      if (!projectDatesByClient[clientId]) {
        projectDatesByClient[clientId] = [];
      }
      projectDatesByClient[clientId].push(parseISO(projectDate));
    }

    let clientsInactifsBefore = 0;
    let clientsRecuperes = 0;

    for (const clientId of Object.keys(projectDatesByClient)) {
      const dates = projectDatesByClient[clientId].sort((a, b) => a.getTime() - b.getTime());
      
      // Chercher si client était inactif avant la période
      const datesBeforePeriod = dates.filter(d => d < dateRange.start);
      const datesInPeriod = dates.filter(d => d >= dateRange.start && d <= dateRange.end);

      if (datesBeforePeriod.length === 0) continue; // Nouveau client

      const lastDateBefore = datesBeforePeriod[datesBeforePeriod.length - 1];
      const daysSinceLastBefore = differenceInDays(dateRange.start, lastDateBefore);

      if (daysSinceLastBefore > seuilJours) {
        clientsInactifsBefore++;
        if (datesInPeriod.length > 0) {
          clientsRecuperes++;
        }
      }
    }

    const ratio = clientsInactifsBefore > 0 ? (clientsRecuperes / clientsInactifsBefore) * 100 : 0;

    return {
      value: Math.round(ratio * 100) / 100,
      breakdown: { clientsInactifsBefore, clientsRecuperes, seuilJours }
    };
  }
};

// ===========================================================================
// B-BIS. DEVIS / COMMERCIAL (compléments)
// ===========================================================================

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
    for (const project of projects) {
      projectUniversMap[project.id] = extractProjectUniverses(project);
    }

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
      if (delay < 0 || delay > 180) continue; // Ignorer délais aberrants

      const universes = projectUniversMap[d.projectId] || ['Non catégorisé'];
      for (const univers of universes) {
        if (!delaysByUnivers[univers]) {
          delaysByUnivers[univers] = [];
        }
        delaysByUnivers[univers].push(delay);
      }
    }

    const result: Record<string, number> = {};
    for (const [univers, delays] of Object.entries(delaysByUnivers)) {
      result[univers] = Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10;
    }

    return {
      value: result,
      breakdown: { universCount: Object.keys(result).length }
    };
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

    // Mapper projet -> premier technicien intervenu
    const projectTechMap: Record<number, number> = {};
    for (const intervention of interventions) {
      const projectId = intervention.projectId;
      if (!projectId || projectTechMap[projectId]) continue;
      if (intervention.userId) {
        projectTechMap[projectId] = intervention.userId;
      }
    }

    const userNameMap: Record<number, string> = {};
    for (const user of users) {
      userNameMap[user.id] = `${user.firstname || ''} ${user.lastname || ''}`.trim() || `Tech ${user.id}`;
    }

    const devisByTech: Record<string, { total: number; signes: number }> = {};

    for (const d of devis) {
      const devisDate = d.dateReelle || d.date;
      if (!devisDate) continue;

      const date = parseISO(devisDate);
      if (date < dateRange.start || date > dateRange.end) continue;

      const techId = projectTechMap[d.projectId]?.toString();
      if (!techId) continue;

      if (!devisByTech[techId]) {
        devisByTech[techId] = { total: 0, signes: 0 };
      }

      devisByTech[techId].total++;
      const state = d.state?.toLowerCase();
      if (['validated', 'signed', 'order', 'accepted'].includes(state)) {
        devisByTech[techId].signes++;
      }
    }

    const result: Record<string, { name: string; taux: number }> = {};
    for (const [techId, stats] of Object.entries(devisByTech)) {
      result[techId] = {
        name: userNameMap[parseInt(techId)] || `Tech ${techId}`,
        taux: stats.total > 0 ? Math.round((stats.signes / stats.total) * 10000) / 100 : 0
      };
    }

    return {
      value: result,
      breakdown: { technicianCount: Object.keys(result).length }
    };
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
    for (const project of projects) {
      projectUniversMap[project.id] = extractProjectUniverses(project);
    }

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
        if (!statsByUnivers[univers]) {
          statsByUnivers[univers] = { total: 0, signes: 0 };
        }
        statsByUnivers[univers].total++;
        if (isSigne) statsByUnivers[univers].signes++;
      }
    }

    // Calculer taux et trier
    const tauxParUnivers = Object.entries(statsByUnivers)
      .map(([univers, stats]) => ({
        univers,
        taux: stats.total > 0 ? (stats.signes / stats.total) * 100 : 0
      }))
      .sort((a, b) => b.taux - a.taux)
      .slice(0, topN);

    const result: Record<string, number> = {};
    for (const { univers, taux } of tauxParUnivers) {
      result[univers] = Math.round(taux * 100) / 100;
    }

    return {
      value: result,
      breakdown: { universCount: tauxParUnivers.length }
    };
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
    for (const project of projects) {
      const apporteurId = project.data?.commanditaireId;
      if (apporteurId) {
        projectApporteurMap[project.id] = apporteurId;
      }
    }

    const clientNameMap: Record<number, string> = {};
    for (const client of clients) {
      clientNameMap[client.id] = client.raisonSociale || client.nom || `Apporteur ${client.id}`;
    }

    const countByApporteur: Record<string, { name: string; count: number }> = {};

    for (const d of devis) {
      const devisDate = d.dateReelle || d.date;
      if (!devisDate) continue;

      const date = parseISO(devisDate);
      if (date < dateRange.start || date > dateRange.end) continue;

      const apporteurId = projectApporteurMap[d.projectId];
      if (!apporteurId) continue;

      const key = apporteurId.toString();
      if (!countByApporteur[key]) {
        countByApporteur[key] = {
          name: clientNameMap[apporteurId] || `Apporteur ${apporteurId}`,
          count: 0
        };
      }
      countByApporteur[key].count++;
    }

    // Trier et prendre topN
    const sorted = Object.entries(countByApporteur)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, topN);

    const result: Record<string, { name: string; count: number }> = {};
    for (const [key, value] of sorted) {
      result[key] = value;
    }

    return {
      value: result,
      breakdown: { apporteurCount: sorted.length }
    };
  }
};

// ===========================================================================
// C-BIS. FACTURES / CASH-FLOW (compléments)
// ===========================================================================

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

      const isAvoir = facture.typeFacture?.toLowerCase() === 'avoir';
      if (isAvoir) continue;

      const projectId = facture.projectId;
      if (!projectId) continue;

      facturesByProject[projectId] = (facturesByProject[projectId] || 0) + 1;
    }

    const dossiersAvecMultiFactures = Object.values(facturesByProject).filter(c => c >= 2).length;
    const totalDossiers = Object.keys(facturesByProject).length;

    return {
      value: dossiersAvecMultiFactures,
      breakdown: { totalDossiers, dossiersAvecMultiFactures }
    };
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

      // Factures avec échéance dans les 30 jours ou factures impayées
      const echeance = facture.dateEcheance || facture.data?.dateEcheance;
      if (echeance) {
        const dateEcheance = parseISO(echeance);
        if (dateEcheance <= in30Days) {
          projection += restant;
          factureCount++;
        }
      } else {
        // Sans échéance, on considère toutes les factures en cours
        projection += restant * 0.5; // 50% de probabilité
        factureCount++;
      }
    }

    return {
      value: Math.round(projection * 100) / 100,
      breakdown: { factureCount }
    };
  }
};

// ===========================================================================
// D-BIS. INTERVENTIONS / PRODUCTIVITÉ (compléments)
// ===========================================================================

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

    let total = 0;
    let urgentes = 0;

    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;

      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;

      const state = intervention.state?.toLowerCase();
      if (state === 'cancelled' || state === 'refused') continue;

      total++;
      // Chercher un flag urgent dans les données
      const isUrgent = intervention.urgent || 
                       intervention.data?.urgent || 
                       intervention.type?.toLowerCase().includes('urgent') ||
                       intervention.type2?.toLowerCase().includes('urgent');
      if (isUrgent) urgentes++;
    }

    const ratio = total > 0 ? (urgentes / total) * 100 : 0;

    return {
      value: Math.round(ratio * 100) / 100,
      breakdown: { total, urgentes }
    };
  }
};

// ===========================================================================
// E-BIS. SAV / QUALITÉ (compléments)
// ===========================================================================

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
    const { interventions, projects } = data;
    const { dateRange, savOverrides } = params;

    // Trouver les dates SAV par projet
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
        if (date < savDatesByProject[projectId].first) {
          savDatesByProject[projectId].first = date;
        }
        if (date > savDatesByProject[projectId].last) {
          savDatesByProject[projectId].last = date;
        }
      }
    }

    const delays: number[] = [];
    for (const { first, last } of Object.values(savDatesByProject)) {
      const delay = differenceInDays(last, first);
      if (delay >= 0) delays.push(delay);
    }

    if (delays.length === 0) {
      return { value: 0, breakdown: { savProjectCount: 0 } };
    }

    const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;

    return {
      value: Math.round(avgDelay * 10) / 10,
      breakdown: { savProjectCount: delays.length }
    };
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
    for (const project of projects) {
      if (project.clientId) {
        projectClientMap[project.id] = project.clientId;
      }
    }

    const clientTypeMap: Record<number, string> = {};
    for (const client of clients) {
      clientTypeMap[client.id] = client.type || client.data?.type || 'Inconnu';
    }

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

      if (!statsByType[clientType]) {
        statsByType[clientType] = { total: 0, sav: 0 };
      }

      statsByType[clientType].total++;

      const type2 = intervention.type2?.toLowerCase();
      const isSav = type2 === 'sav' || savOverrides?.get(intervention.projectId)?.is_confirmed_sav === true;
      if (isSav) statsByType[clientType].sav++;
    }

    const result: Record<string, number> = {};
    for (const [type, stats] of Object.entries(statsByType)) {
      result[type] = stats.total > 0 ? Math.round((stats.sav / stats.total) * 10000) / 100 : 0;
    }

    return {
      value: result,
      breakdown: { typeCount: Object.keys(result).length }
    };
  }
};

// ===========================================================================
// F-BIS. UNIVERS / MIX PRODUIT (compléments)
// ===========================================================================

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
    for (const project of projects) {
      projectUniversMap[project.id] = extractProjectUniverses(project);
    }

    // CA par univers
    const caByUnivers: Record<string, number> = {};
    for (const facture of factures) {
      const factureDate = facture.dateReelle || facture.date;
      if (!factureDate) continue;

      const date = parseISO(factureDate);
      if (date < dateRange.start || date > dateRange.end) continue;

      const isAvoir = facture.typeFacture?.toLowerCase() === 'avoir';
      const montant = isAvoir ? -Math.abs(facture.totalHT || 0) : (facture.totalHT || 0);

      const universes = projectUniversMap[facture.projectId] || ['Non catégorisé'];
      const montantPerUniverse = montant / universes.length;

      for (const univers of universes) {
        caByUnivers[univers] = (caByUnivers[univers] || 0) + montantPerUniverse;
      }
    }

    // Heures par univers
    const heuresByUnivers: Record<string, number> = {};
    for (const intervention of interventions) {
      const interventionDate = intervention.dateReelle || intervention.date;
      if (!interventionDate) continue;

      const date = parseISO(interventionDate);
      if (date < dateRange.start || date > dateRange.end) continue;

      const state = intervention.state?.toLowerCase();
      if (!['validated', 'done', 'finished'].includes(state)) continue;

      let totalMinutes = 0;
      const visites = intervention.visites || [];
      for (const visite of visites) {
        totalMinutes += visite.duree || visite.dureeMinutes || 0;
      }

      if (totalMinutes === 0) continue;

      const universes = projectUniversMap[intervention.projectId] || ['Non catégorisé'];
      const minutesPerUniverse = totalMinutes / universes.length;

      for (const univers of universes) {
        heuresByUnivers[univers] = (heuresByUnivers[univers] || 0) + minutesPerUniverse / 60;
      }
    }

    // Calculer rentabilité
    const result: Record<string, number> = {};
    const allUnivers = new Set([...Object.keys(caByUnivers), ...Object.keys(heuresByUnivers)]);

    for (const univers of allUnivers) {
      const ca = caByUnivers[univers] || 0;
      const heures = heuresByUnivers[univers] || 0;
      result[univers] = heures > 0 ? Math.round((ca / heures) * 100) / 100 : 0;
    }

    return {
      value: result,
      breakdown: { universCount: allUnivers.size }
    };
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

      // Chercher date de clôture
      const closedDate = project.dateCloture || project.data?.dateCloture;
      if (!closedDate) continue;

      const closed = parseISO(closedDate);
      const cycle = differenceInDays(closed, created);
      if (cycle < 0 || cycle > 365) continue; // Ignorer cycles aberrants

      const universes = extractProjectUniverses(project);
      for (const univers of universes) {
        if (!cyclesByUnivers[univers]) {
          cyclesByUnivers[univers] = [];
        }
        cyclesByUnivers[univers].push(cycle);
      }
    }

    const result: Record<string, number> = {};
    for (const [univers, cycles] of Object.entries(cyclesByUnivers)) {
      result[univers] = Math.round((cycles.reduce((a, b) => a + b, 0) / cycles.length) * 10) / 10;
    }

    return {
      value: result,
      breakdown: { universCount: Object.keys(result).length }
    };
  }
};

// ===========================================================================
// G. RÉSEAU / MULTI-AGENCES
// ===========================================================================

const classementAgencesParPanierMoyen: StatDefinition = {
  id: 'classement_agences_par_panier_moyen',
  label: 'Classement agences par panier moyen',
  description: 'Classement des agences en fonction du panier moyen par dossier',
  category: 'reseau',
  source: ['factures', 'projects'],
  dimensions: ['agence'],
  aggregation: 'avg',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    // TODO: Nécessite accès multi-agences pour franchiseur
    // Cette métrique est un squelette pour les rôles N3+
    return {
      value: {},
      breakdown: { error: 'Métrique réseau - nécessite contexte multi-agences' }
    };
  }
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
  compute: (data: LoadedData, params: StatParams): StatResult => {
    // TODO: Nécessite accès multi-agences pour franchiseur
    return {
      value: {},
      breakdown: { error: 'Métrique réseau - nécessite contexte multi-agences' }
    };
  }
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
  compute: (data: LoadedData, params: StatParams): StatResult => {
    // TODO: Nécessite accès multi-agences pour franchiseur
    return {
      value: {},
      breakdown: { error: 'Métrique réseau - nécessite contexte multi-agences' }
    };
  }
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

    // Mapper les clients à leurs codes postaux
    const clientCpMap: Record<number, string> = {};
    for (const client of clients) {
      const cp = client.codePostal || client.data?.codePostal || client.address?.codePostal;
      if (cp) {
        clientCpMap[client.id] = cp.toString().substring(0, 2); // Département
      }
    }

    const projectClientMap: Record<number, number> = {};
    for (const project of projects) {
      if (project.clientId) {
        projectClientMap[project.id] = project.clientId;
      }
    }

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

    // Trier et prendre top N
    const sorted = Object.entries(caByZone)
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN);

    const result: Record<string, number> = {};
    for (const [zone, ca] of sorted) {
      result[zone] = Math.round(ca * 100) / 100;
    }

    return {
      value: result,
      breakdown: { zoneCount: sorted.length }
    };
  }
};

// ===========================================================================
// EXPORT
// ===========================================================================

export const advancedDefinitions2: Record<string, StatDefinition> = {
  // A. Clients & Fidélité
  valeur_vie_client: valeurVieClient,
  ca_clients_top_20: caClientsTop20,
  frequence_achat_client: frequenceAchatClient,
  delai_entre_deux_dossiers: delaiEntreDeuxDossiers,
  taux_clients_inactifs: tauxClientsInactifs,
  taux_clients_perdus: tauxClientsPerdus,
  taux_clients_recuperes: tauxClientsRecuperes,

  // B. Devis / Commercial
  taux_devis_abandonnes: tauxDevisAbandonnes,
  montant_devis_median: montantDevisMedian,
  delai_emission_devis: delaiEmissionDevis,
  devis_par_type_client: devisParTypeClient,
  delai_acceptation_devis_par_univers: delaiAcceptationDevisParUnivers,
  taux_conversion_devis_par_technicien: tauxConversionDevisParTechnicien,
  top_univers_par_taux_acceptation: topUniversParTauxAcceptation,
  top_apporteurs_par_volume_devis: topApporteursParVolumeDevis,

  // C. Factures / Cash-flow
  encaissements_par_mois: encaissementsParMois,
  top_clients_par_restant_du: topClientsParRestantDu,
  volume_factures_partielles: volumeFacturesPartielles,
  projection_tresorerie_30j: projectionTresorerie30j,

  // D. Interventions / Productivité
  ratio_interventions_faites_vs_planifiees: ratioInterventionsFaitesVsPlanifiees,
  duree_moyenne_par_univers: dureeMoyenneParUnivers,
  nb_interventions_jour_par_technicien: nbInterventionsJourParTechnicien,
  taux_annulations_interventions: tauxAnnulationsInterventions,
  charge_travail_par_jour_semaine: chargeTravailParJourSemaine,
  taux_interventions_urgentes: tauxInterventionsUrgentes,

  // E. SAV / Qualité
  taux_repetition_sav: tauxRepetitionSav,
  top_univers_generant_sav: topUniversGenerantSav,
  delai_moyen_resolution_sav: delaiMoyenResolutionSav,
  taux_sav_par_type_client: tauxSavParTypeClient,

  // F. Univers / Mix Produit (définitions principales dans univers.ts)
  // Note: mix_ca_global_par_univers et rentabilite_par_univers sont définis dans univers.ts
  croissance_par_univers_vs_n_1: croissanceParUniversVsN1,
  cycle_moyen_dossier_par_univers: cycleMoyenDossierParUnivers,

  // G. Réseau / Multi-agences
  classement_agences_par_panier_moyen: classementAgencesParPanierMoyen,
  classement_agences_par_delai_moyen_rdv: classementAgencesParDelaiMoyenRdv,
  taux_croissance_ca_agence_vs_n_1: tauxCroissanceCaAgenceVsN1,
  top_zones_postales_par_ca: topZonesPostalesParCa,
};
