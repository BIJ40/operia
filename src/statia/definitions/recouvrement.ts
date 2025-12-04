/**
 * StatIA V1 - Définitions des métriques Recouvrement
 * Réutilise les formules existantes de recouvrementCalculations
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { extractFactureMeta } from '../rules/rules';
import { isFactureStateIncluded } from '../engine/normalizers';

/**
 * Taux de Recouvrement Global
 */
export const tauxRecouvrementGlobal: StatDefinition = {
  id: 'taux_recouvrement_global',
  label: 'Taux de Recouvrement',
  description: 'Pourcentage du CA encaissé par rapport au CA facturé',
  category: 'recouvrement',
  source: 'factures',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    let totalFactureTTC = 0;
    let totalEncaisseTTC = 0;
    let factureCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      // Exclure les avoirs du calcul du recouvrement
      if (meta.isAvoir) continue;
      
      const totalTTC = facture.data?.totalTTC ?? facture.totalTTC ?? 0;
      const reste = facture.data?.calcReglementsReste ?? facture.calcReglementsReste ?? 0;
      const encaisse = totalTTC - reste;
      
      totalFactureTTC += totalTTC;
      totalEncaisseTTC += Math.max(0, encaisse);
      factureCount++;
    }
    
    const taux = totalFactureTTC > 0 ? (totalEncaisseTTC / totalFactureTTC) * 100 : 0;
    
    return {
      value: taux,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: factureCount,
      },
      breakdown: {
        totalFactureTTC,
        totalEncaisseTTC,
        totalResteTTC: totalFactureTTC - totalEncaisseTTC,
      }
    };
  }
};

/**
 * Montant Encaissé
 */
export const montantEncaisse: StatDefinition = {
  id: 'montant_encaisse',
  label: 'Montant Encaissé',
  description: 'Total des encaissements reçus',
  category: 'recouvrement',
  source: 'factures',
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    let totalEncaisse = 0;
    let factureCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      if (meta.isAvoir) continue;
      
      const totalTTC = facture.data?.totalTTC ?? facture.totalTTC ?? 0;
      const reste = facture.data?.calcReglementsReste ?? facture.calcReglementsReste ?? 0;
      const encaisse = Math.max(0, totalTTC - reste);
      
      totalEncaisse += encaisse;
      if (encaisse > 0) factureCount++;
    }
    
    return {
      value: totalEncaisse,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: factureCount,
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

export const recouvrementDefinitions = {
  taux_recouvrement_global: tauxRecouvrementGlobal,
  montant_encaisse: montantEncaisse,
  montant_restant: montantRestant,
  factures_impayees: facturesImpayees,
};
