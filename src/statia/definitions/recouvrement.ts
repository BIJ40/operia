/**
 * StatIA V1 - Définitions des métriques Recouvrement
 * Réutilise les formules existantes de recouvrementCalculations
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { extractFactureMeta } from '../rules/rules';
import { isFactureStateIncluded } from '../engine/normalizers';

/**
 * Taux de Recouvrement Global (en flux sur la période)
 * Numérateur = encaissements HT sur la période
 * Dénominateur = facturations HT sur la période
 */
export const tauxRecouvrementGlobal: StatDefinition = {
  id: 'taux_recouvrement_global',
  label: 'Taux de Recouvrement',
  description: 'Pourcentage du CA encaissé HT par rapport au CA facturé HT sur la période',
  category: 'recouvrement',
  source: 'factures',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    // États considérés comme "encaissés"
    const PAID_STATES = ['paid', 'partially_paid', 'closed'];
    
    let caFactureHT = 0;
    let montantEncaisseHT = 0;
    let factureCount = 0;
    let encaisseCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      // Exclure les avoirs
      if (meta.isAvoir) continue;
      
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const dateFacture = meta.date ? new Date(meta.date) : null;
      if (!dateFacture || dateFacture < params.dateRange.start || dateFacture > params.dateRange.end) continue;
      
      const totalHT = facture.data?.totalHT ?? facture.totalHT ?? 0;
      
      // CA facturé HT sur la période
      caFactureHT += Number(totalHT) || 0;
      factureCount++;
      
      // Montant encaissé HT : factures payées sur la période
      const state = String(facture.state || '').toLowerCase();
      if (PAID_STATES.includes(state)) {
        montantEncaisseHT += Number(totalHT) || 0;
        encaisseCount++;
      }
    }
    
    const taux = caFactureHT > 0 ? (montantEncaisseHT / caFactureHT) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: factureCount,
      },
      breakdown: {
        caFactureHT: Math.round(caFactureHT * 100) / 100,
        montantEncaisseHT: Math.round(montantEncaisseHT * 100) / 100,
        ecart: Math.round((caFactureHT - montantEncaisseHT) * 100) / 100,
        nbFactures: factureCount,
        nbEncaissees: encaisseCount,
      }
    };
  }
};

/**
 * Montant Encaissé Global (HT)
 * Somme des factures payées/soldées sur la période
 */
export const montantEncaisse: StatDefinition = {
  id: 'montant_encaisse',
  label: 'Montant Encaissé (HT)',
  description: 'Total des encaissements HT reçus sur la période',
  category: 'recouvrement',
  source: 'factures',
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    // États considérés comme "encaissés"
    const PAID_STATES = ['paid', 'partially_paid', 'closed'];
    
    let totalEncaisseHT = 0;
    let factureCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      // Exclure les avoirs
      if (meta.isAvoir) continue;
      
      if (!isFactureStateIncluded(facture.state)) continue;
      
      // Date d'encaissement = dateReelle ou date de la facture payée
      const dateEncaissement = meta.date ? new Date(meta.date) : null;
      if (!dateEncaissement || dateEncaissement < params.dateRange.start || dateEncaissement > params.dateRange.end) continue;
      
      // Vérifier si la facture est encaissée
      const state = String(facture.state || '').toLowerCase();
      if (!PAID_STATES.includes(state)) continue;
      
      const totalHT = facture.data?.totalHT ?? facture.totalHT ?? 0;
      
      totalEncaisseHT += Number(totalHT) || 0;
      factureCount++;
    }
    
    return {
      value: Math.round(totalEncaisseHT * 100) / 100,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: factureCount,
      },
      breakdown: {
        nbFacturesEncaissees: factureCount,
      }
    };
  }
};

/**
 * Montant Restant à Encaisser
 */
export const montantRestant: StatDefinition = {
  id: 'montant_restant',
  label: 'Reste à Encaisser',
  description: 'Montant total restant à encaisser',
  category: 'recouvrement',
  source: 'factures',
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    let totalRestant = 0;
    let factureCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      if (meta.isAvoir) continue;
      
      const reste = facture.data?.calcReglementsReste ?? facture.calcReglementsReste ?? 0;
      
      if (reste > 0) {
        totalRestant += reste;
        factureCount++;
      }
    }
    
    return {
      value: totalRestant,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: factureCount,
      }
    };
  }
};

/**
 * Nombre de Factures Impayées
 */
export const facturesImpayees: StatDefinition = {
  id: 'factures_impayees',
  label: 'Factures Impayées',
  description: 'Nombre de factures avec un reste à encaisser',
  category: 'recouvrement',
  source: 'factures',
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    let count = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      if (meta.isAvoir) continue;
      
      const reste = facture.data?.calcReglementsReste ?? facture.calcReglementsReste ?? 0;
      
      if (reste > 0) {
        count++;
      }
    }
    
    return {
      value: count,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: count,
      }
    };
  }
};

/**
 * Encours par Apporteur
 * Montant restant à encaisser ventilé par apporteur
 */
export const encoursParApporteur: StatDefinition = {
  id: 'encours_par_apporteur',
  label: 'Encours par Apporteur',
  description: 'Montant restant à encaisser ventilé par apporteur',
  category: 'recouvrement',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['apporteur'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, clients } = data;
    
    // Indexer les projets et clients
    const projectsById = new Map<string, any>();
    for (const p of projects) {
      projectsById.set(String(p.id), p);
    }
    
    const clientsById = new Map<string, string>();
    for (const c of clients) {
      const nom = c.displayName || c.raisonSociale || c.nom || c.name || `Client ${c.id}`;
      clientsById.set(String(c.id), nom);
    }
    
    const result: Record<string, number> = {};
    let totalRestant = 0;
    let factureCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      if (meta.isAvoir) continue;
      
      const reste = facture.data?.calcReglementsReste ?? facture.calcReglementsReste ?? 0;
      
      if (reste <= 0) continue;
      
      // Récupérer le projet et l'apporteur
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(String(projectId)) : null;
      const apporteurId = project?.data?.commanditaireId || project?.commanditaireId;
      
      if (!apporteurId) continue;
      
      const nomApporteur = clientsById.get(String(apporteurId)) || `Apporteur ${apporteurId}`;
      
      result[nomApporteur] = (result[nomApporteur] || 0) + reste;
      totalRestant += reste;
      factureCount++;
    }
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: factureCount,
      },
      breakdown: {
        total: totalRestant,
        apporteurCount: Object.keys(result).length,
      }
    };
  }
};

/**
 * Délai de Paiement Dossier (Global)
 * Délai moyen entre facturation et clôture du dossier
 * Utilise la même logique centralisée que delai_paiement_apporteur
 */
export const delaiPaiementDossier: StatDefinition = {
  id: 'delai_paiement_dossier',
  label: 'Délai de Paiement',
  description: 'Délai moyen en jours entre facturation et clôture du dossier',
  category: 'recouvrement',
  source: ['projects', 'clients'],
  aggregation: 'avg',
  unit: 'jours',
  dimensions: ['apporteur', 'univers'],
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, clients } = data;
    
    // Utiliser la fonction centralisée de calcul délai paiement apporteur
    const { calculateDelaiPaiementApporteur } = require('../shared/delaiPaiementApporteur');
    
    const result = calculateDelaiPaiementApporteur(projects, clients, {
      dateStart: params.dateRange.start,
      dateEnd: params.dateRange.end,
      maxDelaiJours: 365,
      debug: false
    });
    
    // Retourner les valeurs globales (pas par apporteur)
    return {
      value: result.globalAverageDays ?? 0,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: result.debugStats?.totalProjectsAnalyzed || 0,
      },
      breakdown: {
        moyenne: result.globalAverageDays,
        mediane: result.globalMedianDays,
        nbDossiersValides: result.debugStats?.projectsWithValidDelay || 0,
        nbApporteurs: result.apporteurs.length,
      }
    };
  }
};

export const recouvrementDefinitions = {
  taux_recouvrement_global: tauxRecouvrementGlobal,
  montant_encaisse: montantEncaisse,
  montant_restant: montantRestant,
  factures_impayees: facturesImpayees,
  encours_par_apporteur: encoursParApporteur,
  delai_paiement_dossier: delaiPaiementDossier,
};
