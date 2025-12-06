/**
 * StatIA - Définitions des métriques Clients
 * Métriques liées aux clients : CLV, churn, inactivité, récupération
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { indexProjectsById } from '../engine/loaders';

// ============= HELPERS =============

function extractClientId(item: any): string | null {
  const id = item.clientId || item.client_id || item.data?.clientId;
  return id ? String(id) : null;
}

function parseDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ============= METRIC: Valeur Vie Client (CLV) =============

export const valeurVieClient: StatDefinition = {
  id: 'valeur_vie_client',
  label: 'Valeur Vie Client (CLV)',
  description: 'Estimation de la valeur vie client basée sur l\'historique de CA',
  category: 'ca',
  source: ['factures', 'clients'],
  dimensions: ['client'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, clients } = data;
    
    // Index clients pour le nom
    const clientsById = new Map<string, { name: string }>();
    for (const c of clients || []) {
      const name = c.data?.raisonSociale || c.data?.nom || c.name || c.nom || `Client ${c.id}`;
      clientsById.set(String(c.id), { name });
    }
    
    // Calculer CA par client
    const caByClient: Record<string, number> = {};
    let facturesTraitees = 0;
    
    for (const f of factures || []) {
      const clientId = extractClientId(f);
      if (!clientId) continue;
      
      const montant = f.data?.totalHT ?? f.totalHT ?? 0;
      const montantNum = typeof montant === 'string' ? parseFloat(montant) || 0 : Number(montant) || 0;
      
      caByClient[clientId] = (caByClient[clientId] || 0) + montantNum;
      facturesTraitees++;
    }
    
    // Formater le résultat avec noms clients
    const result: Record<string, { name: string; clv: number }> = {};
    for (const [clientId, ca] of Object.entries(caByClient)) {
      const clientInfo = clientsById.get(clientId);
      result[clientId] = {
        name: clientInfo?.name || `Client ${clientId}`,
        clv: Math.round(ca * 100) / 100
      };
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: facturesTraitees },
      breakdown: { nbClients: Object.keys(result).length }
    };
  }
};

// ============= METRIC: Taux Clients Inactifs =============

export const tauxClientsInactifs: StatDefinition = {
  id: 'taux_clients_inactifs',
  label: 'Taux Clients Inactifs',
  description: 'Proportion de clients n\'ayant pas eu de dossier sur la période',
  category: 'ca',
  source: 'projects',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    // Clients historiques (tous les clients avec au moins un projet)
    const clientsHistoriques = new Set<string>();
    // Clients actifs (projet créé sur la période)
    const clientsActifs = new Set<string>();
    
    for (const p of projects || []) {
      const clientId = extractClientId(p);
      if (!clientId) continue;
      
      clientsHistoriques.add(clientId);
      
      // Vérifier si le projet est dans la période
      const dateStr = p.date || p.created_at || p.createdAt;
      const date = parseDate(dateStr);
      
      if (date && params.dateRange) {
        if (date >= params.dateRange.start && date <= params.dateRange.end) {
          clientsActifs.add(clientId);
        }
      }
    }
    
    const nbHistoriques = clientsHistoriques.size;
    const nbInactifs = nbHistoriques - clientsActifs.size;
    const taux = nbHistoriques > 0 ? (nbInactifs / nbHistoriques) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: nbHistoriques },
      breakdown: { nbHistoriques, nbActifs: clientsActifs.size, nbInactifs }
    };
  }
};

// ============= METRIC: Taux Clients Perdus =============

export const tauxClientsPerdus: StatDefinition = {
  id: 'taux_clients_perdus',
  label: 'Taux Clients Perdus',
  description: 'Proportion de clients sans dossier depuis plus de 24 mois',
  category: 'ca',
  source: 'projects',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    // Seuil d'inactivité en jours (24 mois = 730 jours)
    const seuilJours = params.filters?.seuilJours ?? 730;
    const now = new Date();
    
    // Dernière date de dossier par client
    const dernierDossierParClient = new Map<string, Date>();
    
    for (const p of projects || []) {
      const clientId = extractClientId(p);
      if (!clientId) continue;
      
      const dateStr = p.date || p.created_at || p.createdAt;
      const date = parseDate(dateStr);
      if (!date) continue;
      
      const existing = dernierDossierParClient.get(clientId);
      if (!existing || date > existing) {
        dernierDossierParClient.set(clientId, date);
      }
    }
    
    let nbPerdus = 0;
    const nbTotal = dernierDossierParClient.size;
    
    for (const [clientId, lastDate] of dernierDossierParClient) {
      const joursSansDossier = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (joursSansDossier > seuilJours) {
        nbPerdus++;
      }
    }
    
    const taux = nbTotal > 0 ? (nbPerdus / nbTotal) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: nbTotal },
      breakdown: { nbTotal, nbPerdus, seuilJours }
    };
  }
};

// ============= METRIC: Taux Clients Récupérés =============

export const tauxClientsRecuperes: StatDefinition = {
  id: 'taux_clients_recuperes',
  label: 'Taux Clients Récupérés',
  description: 'Clients revenus après une période d\'inactivité prolongée',
  category: 'ca',
  source: 'projects',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    const seuilJours = params.filters?.seuilJours ?? 730;
    const periodStart = params.dateRange?.start || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    
    // Historique des dossiers par client
    const dossiersParClient = new Map<string, Date[]>();
    
    for (const p of projects || []) {
      const clientId = extractClientId(p);
      if (!clientId) continue;
      
      const dateStr = p.date || p.created_at || p.createdAt;
      const date = parseDate(dateStr);
      if (!date) continue;
      
      if (!dossiersParClient.has(clientId)) {
        dossiersParClient.set(clientId, []);
      }
      dossiersParClient.get(clientId)!.push(date);
    }
    
    let clientsPerdusDebut = 0;
    let clientsRecuperes = 0;
    
    for (const [clientId, dates] of dossiersParClient) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      
      // Trouver le dernier dossier avant la période
      const dossiersAvant = dates.filter(d => d < periodStart);
      const dossiersPendant = dates.filter(d => params.dateRange && d >= params.dateRange.start && d <= params.dateRange.end);
      
      if (dossiersAvant.length > 0) {
        const dernierAvant = dossiersAvant[dossiersAvant.length - 1];
        const joursInactif = (periodStart.getTime() - dernierAvant.getTime()) / (1000 * 60 * 60 * 24);
        
        if (joursInactif > seuilJours) {
          // Ce client était "perdu" au début de la période
          clientsPerdusDebut++;
          
          // A-t-il un dossier pendant la période ?
          if (dossiersPendant.length > 0) {
            clientsRecuperes++;
          }
        }
      }
    }
    
    const taux = clientsPerdusDebut > 0 ? (clientsRecuperes / clientsPerdusDebut) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: dossiersParClient.size },
      breakdown: { clientsPerdusDebut, clientsRecuperes, seuilJours }
    };
  }
};

// ============= EXPORT =============

export const clientsDefinitions: Record<string, StatDefinition> = {
  valeur_vie_client: valeurVieClient,
  taux_clients_inactifs: tauxClientsInactifs,
  taux_clients_perdus: tauxClientsPerdus,
  taux_clients_recuperes: tauxClientsRecuperes,
};
