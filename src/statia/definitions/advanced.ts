/**
 * StatIA V2 - Définitions des métriques avancées
 * Nouvelles métriques pour l'analyse CA, clients, productivité, délais
 * 
 * Légende :
 * - ✅ Implémenté avec les données existantes
 * - ⏳ TODO: nécessite des champs API non disponibles (squelette fourni)
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { parseISO, isWithinInterval, getDay, subYears, differenceInDays } from 'date-fns';
import { extractFactureMeta } from '../rules/rules';
import { isFactureStateIncluded, extractProjectUniverses } from '../engine/normalizers';
import { indexProjectsById, indexClientsById } from '../engine/loaders';

// ============================================================================
// HELPERS
// ============================================================================

function parseNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  return 0;
}

function getClientTypeFromClient(client: any): string {
  const rawType = client?.type || client?.typeClient || client?.data?.type || '';
  const v = String(rawType).trim().toLowerCase();
  if (!v) return 'Non défini';
  if (['particulier', 'part'].includes(v)) return 'Particuliers';
  if (['pro', 'professionnel', 'professionnels', 'entreprise'].includes(v)) return 'Professionnels';
  if (['bailleur', 'bailleurs', 'bailleur_social'].includes(v)) return 'Bailleurs';
  if (['syndic', 'copro', 'copropriete'].includes(v)) return 'Syndics';
  if (['assureur', 'assurance', 'assureurs'].includes(v)) return 'Assureurs';
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function getApporteurName(apporteurId: any, clients: any[]): string {
  if (!apporteurId) return 'Direct';
  for (const c of clients) {
    if (String(c.id) === String(apporteurId)) {
      return c.displayName || c.raisonSociale || c.nom || c.name || `Apporteur ${apporteurId}`;
    }
  }
  return `Apporteur ${apporteurId}`;
}

function getDayOfWeekLabel(dayNumber: number): string {
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return days[dayNumber] || 'Inconnu';
}

// ============================================================================
// 1. CA / STRUCTURE CLIENT
// ============================================================================

/**
 * ✅ CA par type de client
 */
export const caParTypeClient: StatDefinition = {
  id: 'ca_par_type_client',
  label: 'CA par type de client',
  description: 'Répartition du CA HT par type de client (pro, particulier, bailleur, etc.)',
  category: 'ca',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['type_client'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, clients } = data;
    
    const projectsById = indexProjectsById(projects);
    const clientsById = indexClientsById(clients);
    
    const result: Record<string, number> = {};
    let totalCA = 0;
    let factureCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(projectId) : null;
      const clientId = facture.clientId || project?.clientId;
      const client = clientId ? clientsById.get(clientId) : null;
      
      const typeClient = getClientTypeFromClient(client);
      const montant = meta.isAvoir ? -Math.abs(meta.montantNetHT) : meta.montantNetHT;
      
      result[typeClient] = (result[typeClient] || 0) + montant;
      totalCA += montant;
      factureCount++;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: factureCount },
      breakdown: { total: Math.round(totalCA * 100) / 100, nbTypes: Object.keys(result).length }
    };
  }
};

/**
 * ✅ CA nouveaux clients
 */
export const caNouveauxClients: StatDefinition = {
  id: 'ca_nouveaux_clients',
  label: 'CA nouveaux clients',
  description: 'CA HT généré par les clients dont le premier dossier date de la période',
  category: 'ca',
  source: ['factures', 'projects', 'clients'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, clients } = data;
    
    // Trouver le premier dossier de chaque client
    const firstProjectDateByClient = new Map<string, Date>();
    for (const project of projects) {
      const clientId = project.clientId || project.data?.clientId;
      if (!clientId) continue;
      
      const dateStr = project.date || project.created_at || project.data?.date;
      if (!dateStr) continue;
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;
      
      const current = firstProjectDateByClient.get(String(clientId));
      if (!current || date < current) {
        firstProjectDateByClient.set(String(clientId), date);
      }
    }
    
    // Identifier les nouveaux clients (premier dossier dans la période)
    const nouveauxClients = new Set<string>();
    for (const [clientId, firstDate] of firstProjectDateByClient) {
      if (firstDate >= params.dateRange.start && firstDate <= params.dateRange.end) {
        nouveauxClients.add(clientId);
      }
    }
    
    // Calculer le CA de ces clients sur la période
    const projectsById = indexProjectsById(projects);
    let totalCA = 0;
    let factureCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(projectId) : null;
      const clientId = String(facture.clientId || project?.clientId || '');
      
      if (!nouveauxClients.has(clientId)) continue;
      
      const montant = meta.isAvoir ? -Math.abs(meta.montantNetHT) : meta.montantNetHT;
      totalCA += montant;
      factureCount++;
    }
    
    return {
      value: Math.round(totalCA * 100) / 100,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: factureCount },
      breakdown: { nbNouveauxClients: nouveauxClients.size, factureCount }
    };
  }
};

/**
 * ✅ CA clients récurrents
 */
export const caClientsRecurrents: StatDefinition = {
  id: 'ca_clients_recurrents',
  label: 'CA clients récurrents',
  description: 'CA HT des clients ayant au moins 2 dossiers sur l\'historique global',
  category: 'ca',
  source: ['factures', 'projects'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    
    // Compter le nombre de dossiers par client
    const dossiersParClient = new Map<string, number>();
    for (const project of projects) {
      const clientId = project.clientId || project.data?.clientId;
      if (!clientId) continue;
      dossiersParClient.set(String(clientId), (dossiersParClient.get(String(clientId)) || 0) + 1);
    }
    
    // Identifier les clients récurrents
    const clientsRecurrents = new Set<string>();
    for (const [clientId, count] of dossiersParClient) {
      if (count >= 2) clientsRecurrents.add(clientId);
    }
    
    // Calculer le CA de ces clients sur la période
    const projectsById = indexProjectsById(projects);
    let totalCA = 0;
    let factureCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(projectId) : null;
      const clientId = String(facture.clientId || project?.clientId || '');
      
      if (!clientsRecurrents.has(clientId)) continue;
      
      const montant = meta.isAvoir ? -Math.abs(meta.montantNetHT) : meta.montantNetHT;
      totalCA += montant;
      factureCount++;
    }
    
    return {
      value: Math.round(totalCA * 100) / 100,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: factureCount },
      breakdown: { nbClientsRecurrents: clientsRecurrents.size, factureCount }
    };
  }
};

/**
 * ✅ Part du CA nouveaux clients
 */
export const tauxCaNouveauxClients: StatDefinition = {
  id: 'taux_ca_nouveaux_clients',
  label: 'Part du CA nouveaux clients',
  description: 'Part du CA HT de la période provenant de nouveaux clients',
  category: 'ca',
  source: ['factures', 'projects'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    // Utiliser les deux métriques précédentes
    const caNouveaux = caNouveauxClients.compute(data, params);
    
    // Calculer le CA total de la période
    const { factures } = data;
    let totalCAPeriode = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const montant = meta.isAvoir ? -Math.abs(meta.montantNetHT) : meta.montantNetHT;
      totalCAPeriode += montant;
    }
    
    const taux = totalCAPeriode > 0 ? ((caNouveaux.value as number) / totalCAPeriode) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: 0 },
      breakdown: { caNouveauxClients: caNouveaux.value, caTotal: totalCAPeriode }
    };
  }
};

// ============================================================================
// 2. CA / TEMPS & RYTHME
// ============================================================================

/**
 * ✅ CA par jour de semaine
 */
export const caParJourSemaine: StatDefinition = {
  id: 'ca_par_jour_semaine',
  label: 'CA par jour de semaine',
  description: 'Répartition du CA HT par jour de semaine',
  category: 'ca',
  source: 'factures',
  dimensions: ['jour_semaine'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    const result: Record<string, number> = {};
    let totalCA = 0;
    let factureCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const dayNum = getDay(date);
      const dayLabel = getDayOfWeekLabel(dayNum);
      
      const montant = meta.isAvoir ? -Math.abs(meta.montantNetHT) : meta.montantNetHT;
      result[dayLabel] = (result[dayLabel] || 0) + montant;
      totalCA += montant;
      factureCount++;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: factureCount },
      breakdown: { total: totalCA }
    };
  }
};

/**
 * ⏳ TODO: CA par tranche horaire
 * Nécessite les heures de début d'intervention (techTimeStart)
 */
export const caParTrancheHoraire: StatDefinition = {
  id: 'ca_par_tranche_horaire',
  label: 'CA par tranche horaire',
  description: 'CA HT ventilé par tranche horaire d\'intervention (matin, après-midi, soirée…)',
  category: 'ca',
  source: ['factures', 'interventions'],
  dimensions: ['tranche_horaire'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    // TODO: Implémenter quand techTimeStart sera disponible de façon fiable
    // Logique: associer facture → interventions → tranche horaire
    return {
      value: {},
      metadata: { computedAt: new Date(), source: 'factures', recordCount: 0 },
      breakdown: { error: 'Métrique non implémentée - nécessite techTimeStart' }
    };
  }
};

/**
 * ✅ Taux de croissance CA vs N-1
 */
export const tauxCroissanceCaVsN1: StatDefinition = {
  id: 'taux_croissance_ca_vs_n_1',
  label: 'Taux de croissance CA vs N-1',
  description: 'Variation du CA HT par rapport à la même période N-1',
  category: 'ca',
  source: 'factures',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    const dateStartN1 = subYears(params.dateRange.start, 1);
    const dateEndN1 = subYears(params.dateRange.end, 1);
    
    let caN = 0;
    let caN1 = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date) continue;
      
      const montant = meta.isAvoir ? -Math.abs(meta.montantNetHT) : meta.montantNetHT;
      
      // Période courante
      if (date >= params.dateRange.start && date <= params.dateRange.end) {
        caN += montant;
      }
      
      // Période N-1
      if (date >= dateStartN1 && date <= dateEndN1) {
        caN1 += montant;
      }
    }
    
    const taux = caN1 > 0 ? ((caN / caN1) - 1) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: 0 },
      breakdown: { caN, caN1, variation: Math.round((caN - caN1) * 100) / 100 }
    };
  }
};

// ============================================================================
// 3. MARGE & RENTABILITÉ
// ============================================================================

/**
 * ⏳ TODO: Marge estimée globale
 * Nécessite prixAchat sur les items de facture
 */
export const margeEstimeeGlobal: StatDefinition = {
  id: 'marge_estimee_global',
  label: 'Marge estimée globale',
  description: 'Marge estimée (CA HT - achats) sur la période',
  category: 'ca',
  source: 'factures',
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    // TODO: Implémenter quand prixAchat sera disponible dans les items factures
    return {
      value: 0,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: 0 },
      breakdown: { error: 'Métrique non implémentée - nécessite prixAchat sur items' }
    };
  }
};

// ============================================================================
// 4. APPORTEURS - RENTABILITÉ & FRÉQUENCE
// ============================================================================

/**
 * ✅ Taux de recouvrement par apporteur
 */
export const tauxRecouvrementParApporteur: StatDefinition = {
  id: 'taux_recouvrement_par_apporteur',
  label: 'Taux de recouvrement par apporteur',
  description: 'Taux de recouvrement calculé par apporteur sur la période',
  category: 'recouvrement',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['apporteur'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, clients } = data;
    const PAID_STATES = ['paid', 'partially_paid', 'closed'];
    
    const projectsById = indexProjectsById(projects);
    
    const statsByApporteur: Record<string, { factureHT: number; encaisseHT: number }> = {};
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!isFactureStateIncluded(facture.state)) continue;
      if (meta.isAvoir) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(projectId) : null;
      const apporteurId = project?.data?.commanditaireId || project?.commanditaireId;
      const apporteurName = getApporteurName(apporteurId, clients);
      
      if (!statsByApporteur[apporteurName]) {
        statsByApporteur[apporteurName] = { factureHT: 0, encaisseHT: 0 };
      }
      
      const totalHT = parseNumber(facture.data?.totalHT ?? facture.totalHT);
      statsByApporteur[apporteurName].factureHT += totalHT;
      
      const state = String(facture.state || '').toLowerCase();
      if (PAID_STATES.includes(state)) {
        statsByApporteur[apporteurName].encaisseHT += totalHT;
      }
    }
    
    const result: Record<string, number> = {};
    for (const [apporteur, stats] of Object.entries(statsByApporteur)) {
      result[apporteur] = stats.factureHT > 0 
        ? Math.round((stats.encaisseHT / stats.factureHT) * 1000) / 10 
        : 0;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: Object.keys(result).length },
      breakdown: { details: statsByApporteur }
    };
  }
};

/**
 * ✅ Panier moyen par apporteur
 */
export const caMoyenParDossierApporteur: StatDefinition = {
  id: 'ca_moyen_par_dossier_apporteur',
  label: 'Panier moyen par apporteur',
  description: 'CA moyen par dossier pour chaque apporteur',
  category: 'apporteur',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['apporteur'],
  aggregation: 'avg',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, clients } = data;
    
    const projectsById = indexProjectsById(projects);
    
    const caByApporteur: Record<string, number> = {};
    const dossiersByApporteur: Record<string, Set<string>> = {};
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(projectId) : null;
      const apporteurId = project?.data?.commanditaireId || project?.commanditaireId;
      const apporteurName = getApporteurName(apporteurId, clients);
      
      const montant = meta.isAvoir ? -Math.abs(meta.montantNetHT) : meta.montantNetHT;
      
      caByApporteur[apporteurName] = (caByApporteur[apporteurName] || 0) + montant;
      
      if (!dossiersByApporteur[apporteurName]) {
        dossiersByApporteur[apporteurName] = new Set();
      }
      if (projectId) dossiersByApporteur[apporteurName].add(String(projectId));
    }
    
    const result: Record<string, number> = {};
    for (const apporteur of Object.keys(caByApporteur)) {
      const nbDossiers = dossiersByApporteur[apporteur]?.size || 1;
      result[apporteur] = Math.round((caByApporteur[apporteur] / nbDossiers) * 100) / 100;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: Object.keys(result).length }
    };
  }
};

/**
 * ✅ Fréquence dossiers par apporteur
 */
export const frequenceDossiersParApporteur: StatDefinition = {
  id: 'frequence_dossiers_par_apporteur',
  label: 'Fréquence dossiers par apporteur',
  description: 'Nombre de dossiers par apporteur sur la période',
  category: 'apporteur',
  source: ['projects', 'clients'],
  dimensions: ['apporteur'],
  aggregation: 'count',
  unit: '',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, clients } = data;
    
    const result: Record<string, number> = {};
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at || project.data?.date;
      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          if (!isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      const apporteurId = project?.data?.commanditaireId || project?.commanditaireId;
      const apporteurName = getApporteurName(apporteurId, clients);
      
      result[apporteurName] = (result[apporteurName] || 0) + 1;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: Object.keys(result).length }
    };
  }
};

// ============================================================================
// 5. DOSSIERS & CLIENTS
// ============================================================================

/**
 * ✅ Nombre de clients actifs
 */
export const nbClientsActifs: StatDefinition = {
  id: 'nb_clients_actifs',
  label: 'Nombre de clients actifs',
  description: 'Clients ayant au moins un dossier dans la période',
  category: 'dossiers',
  source: ['projects', 'clients'],
  aggregation: 'count',
  unit: '',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    const clientsActifs = new Set<string>();
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at || project.data?.date;
      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          if (!isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      const clientId = project.clientId || project.data?.clientId;
      if (clientId) clientsActifs.add(String(clientId));
    }
    
    return {
      value: clientsActifs.size,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: clientsActifs.size }
    };
  }
};

/**
 * ✅ Nombre de nouveaux clients
 */
export const nbNouveauxClients: StatDefinition = {
  id: 'nb_nouveaux_clients',
  label: 'Nombre de nouveaux clients',
  description: 'Clients dont le premier dossier date de la période',
  category: 'dossiers',
  source: ['projects'],
  aggregation: 'count',
  unit: '',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    // Trouver le premier dossier de chaque client
    const firstProjectDateByClient = new Map<string, Date>();
    for (const project of projects) {
      const clientId = project.clientId || project.data?.clientId;
      if (!clientId) continue;
      
      const dateStr = project.date || project.created_at || project.data?.date;
      if (!dateStr) continue;
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;
      
      const current = firstProjectDateByClient.get(String(clientId));
      if (!current || date < current) {
        firstProjectDateByClient.set(String(clientId), date);
      }
    }
    
    // Compter les nouveaux clients (premier dossier dans la période)
    let count = 0;
    for (const [_, firstDate] of firstProjectDateByClient) {
      if (firstDate >= params.dateRange.start && firstDate <= params.dateRange.end) {
        count++;
      }
    }
    
    return {
      value: count,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: count }
    };
  }
};

/**
 * ✅ Taux de retour clients
 */
export const tauxRetourClients: StatDefinition = {
  id: 'taux_retour_clients',
  label: 'Taux de retour clients',
  description: 'Proportion de clients qui reviennent (≥ 2 dossiers)',
  category: 'dossiers',
  source: ['projects'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    // Compter les dossiers par client sur toute la période
    const dossiersParClient = new Map<string, number>();
    const clientsActifsPeriode = new Set<string>();
    
    for (const project of projects) {
      const clientId = project.clientId || project.data?.clientId;
      if (!clientId) continue;
      
      const dateStr = project.date || project.created_at || project.data?.date;
      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          if (isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
            clientsActifsPeriode.add(String(clientId));
          }
        } catch {
          continue;
        }
      }
      
      dossiersParClient.set(String(clientId), (dossiersParClient.get(String(clientId)) || 0) + 1);
    }
    
    // Compter les clients récurrents parmi les actifs de la période
    let clientsRecurrents = 0;
    for (const clientId of clientsActifsPeriode) {
      if ((dossiersParClient.get(clientId) || 0) >= 2) {
        clientsRecurrents++;
      }
    }
    
    const taux = clientsActifsPeriode.size > 0 
      ? (clientsRecurrents / clientsActifsPeriode.size) * 100 
      : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: clientsActifsPeriode.size },
      breakdown: { clientsActifs: clientsActifsPeriode.size, clientsRecurrents }
    };
  }
};

/**
 * ✅ Dossiers par jour de semaine
 */
export const nbDossiersParJourSemaine: StatDefinition = {
  id: 'nb_dossiers_par_jour_semaine',
  label: 'Dossiers par jour de semaine',
  description: 'Volume de dossiers créés par jour de semaine',
  category: 'dossiers',
  source: 'projects',
  dimensions: ['jour_semaine'],
  aggregation: 'count',
  unit: '',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    const result: Record<string, number> = {};
    let count = 0;
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at || project.data?.date;
      if (!dateStr) continue;
      
      try {
        const date = parseISO(dateStr);
        if (!isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
          continue;
        }
        
        const dayNum = getDay(date);
        const dayLabel = getDayOfWeekLabel(dayNum);
        
        result[dayLabel] = (result[dayLabel] || 0) + 1;
        count++;
      } catch {
        continue;
      }
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: count }
    };
  }
};

// ============================================================================
// 6. DÉLAIS & SERVICE
// ============================================================================

/**
 * ✅ Délai moyen de prise en charge
 */
export const delaiMoyenPriseEnChargeIntervention: StatDefinition = {
  id: 'delai_moyen_prise_en_charge_intervention',
  label: 'Délai moyen de prise en charge',
  description: 'Délai moyen entre création du dossier et première intervention',
  category: 'qualite',
  source: ['projects', 'interventions'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, interventions } = data;
    
    // Indexer la première intervention par projet
    const firstInterventionByProject = new Map<string, Date>();
    
    for (const intervention of interventions) {
      const projectId = intervention.projectId || intervention.project_id;
      if (!projectId) continue;
      
      const dateStr = intervention.dateReelle || intervention.date || intervention.data?.date;
      if (!dateStr) continue;
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;
      
      const current = firstInterventionByProject.get(String(projectId));
      if (!current || date < current) {
        firstInterventionByProject.set(String(projectId), date);
      }
    }
    
    // Calculer les délais
    const delais: number[] = [];
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at || project.data?.date;
      if (!dateStr) continue;
      
      const dateCreation = new Date(dateStr);
      if (isNaN(dateCreation.getTime())) continue;
      
      // Filtrer par période
      if (dateCreation < params.dateRange.start || dateCreation > params.dateRange.end) continue;
      
      const projectId = String(project.id);
      const firstIntervention = firstInterventionByProject.get(projectId);
      if (!firstIntervention) continue;
      
      const delaiJours = differenceInDays(firstIntervention, dateCreation);
      if (delaiJours >= 0 && delaiJours <= 365) { // Exclure valeurs aberrantes
        delais.push(delaiJours);
      }
    }
    
    const moyenne = delais.length > 0 
      ? delais.reduce((a, b) => a + b, 0) / delais.length 
      : 0;
    
    return {
      value: Math.round(moyenne * 10) / 10,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: delais.length },
      breakdown: { 
        nbDossiers: delais.length,
        min: delais.length > 0 ? Math.min(...delais) : null,
        max: delais.length > 0 ? Math.max(...delais) : null
      }
    };
  }
};

/**
 * ✅ Taux de dossiers hors délai
 */
export const tauxDossiersHorsDelai: StatDefinition = {
  id: 'taux_dossiers_hors_delai',
  label: 'Taux de dossiers hors délai',
  description: 'Proportion de dossiers dont le délai de prise en charge dépasse un seuil',
  category: 'qualite',
  source: ['projects', 'interventions'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const seuilJours = params.filters?.seuilJours ?? 5; // Seuil par défaut: 5 jours
    
    const { projects, interventions } = data;
    
    // Indexer la première intervention par projet
    const firstInterventionByProject = new Map<string, Date>();
    
    for (const intervention of interventions) {
      const projectId = intervention.projectId || intervention.project_id;
      if (!projectId) continue;
      
      const dateStr = intervention.dateReelle || intervention.date || intervention.data?.date;
      if (!dateStr) continue;
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;
      
      const current = firstInterventionByProject.get(String(projectId));
      if (!current || date < current) {
        firstInterventionByProject.set(String(projectId), date);
      }
    }
    
    // Compter les dossiers hors délai
    let total = 0;
    let horsDelai = 0;
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at || project.data?.date;
      if (!dateStr) continue;
      
      const dateCreation = new Date(dateStr);
      if (isNaN(dateCreation.getTime())) continue;
      
      // Filtrer par période
      if (dateCreation < params.dateRange.start || dateCreation > params.dateRange.end) continue;
      
      const projectId = String(project.id);
      const firstIntervention = firstInterventionByProject.get(projectId);
      if (!firstIntervention) continue;
      
      total++;
      const delaiJours = differenceInDays(firstIntervention, dateCreation);
      if (delaiJours > seuilJours) horsDelai++;
    }
    
    const taux = total > 0 ? (horsDelai / total) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: total },
      breakdown: { total, horsDelai, seuilJours }
    };
  }
};

// ============================================================================
// 7. CA DOSSIERS MULTI-VISITES
// ============================================================================

/**
 * ✅ CA dossiers multi-visites
 */
export const caDossiersMultiVisites: StatDefinition = {
  id: 'ca_dossiers_multi_visites',
  label: 'CA dossiers multi-visites',
  description: 'CA HT des dossiers comportant plusieurs interventions',
  category: 'dossiers',
  source: ['factures', 'interventions', 'projects'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, interventions, projects } = data;
    
    // Compter les interventions par projet
    const interventionsParProjet = new Map<string, number>();
    for (const intervention of interventions) {
      const projectId = intervention.projectId || intervention.project_id;
      if (!projectId) continue;
      interventionsParProjet.set(String(projectId), (interventionsParProjet.get(String(projectId)) || 0) + 1);
    }
    
    // Identifier les projets multi-visites
    const projetsMultiVisites = new Set<string>();
    for (const [projectId, count] of interventionsParProjet) {
      if (count >= 2) projetsMultiVisites.add(projectId);
    }
    
    // Calculer le CA de ces projets
    let totalCA = 0;
    let factureCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = String(facture.projectId || facture.project_id || '');
      if (!projetsMultiVisites.has(projectId)) continue;
      
      const montant = meta.isAvoir ? -Math.abs(meta.montantNetHT) : meta.montantNetHT;
      totalCA += montant;
      factureCount++;
    }
    
    return {
      value: Math.round(totalCA * 100) / 100,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: factureCount },
      breakdown: { nbProjetsMultiVisites: projetsMultiVisites.size }
    };
  }
};

// ============================================================================
// EXPORT REGISTRE
// ============================================================================

export const advancedDefinitions: Record<string, StatDefinition> = {
  // CA / Structure client
  ca_par_type_client: caParTypeClient,
  ca_nouveaux_clients: caNouveauxClients,
  ca_clients_recurrents: caClientsRecurrents,
  taux_ca_nouveaux_clients: tauxCaNouveauxClients,
  
  // CA / Temps & Rythme
  ca_par_jour_semaine: caParJourSemaine,
  ca_par_tranche_horaire: caParTrancheHoraire, // TODO
  taux_croissance_ca_vs_n_1: tauxCroissanceCaVsN1,
  
  // Marge (TODO)
  marge_estimee_global: margeEstimeeGlobal,
  
  // Apporteurs
  taux_recouvrement_par_apporteur: tauxRecouvrementParApporteur,
  ca_moyen_par_dossier_apporteur: caMoyenParDossierApporteur,
  frequence_dossiers_par_apporteur: frequenceDossiersParApporteur,
  
  // Dossiers & Clients
  nb_clients_actifs: nbClientsActifs,
  nb_nouveaux_clients: nbNouveauxClients,
  taux_retour_clients: tauxRetourClients,
  nb_dossiers_par_jour_semaine: nbDossiersParJourSemaine,
  
  // Délais
  delai_moyen_prise_en_charge_intervention: delaiMoyenPriseEnChargeIntervention,
  taux_dossiers_hors_delai: tauxDossiersHorsDelai,
  
  // CA spéciaux
  ca_dossiers_multi_visites: caDossiersMultiVisites,
};
