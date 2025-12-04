/**
 * StatIA V1 - Définitions des métriques CA
 * Réutilise les formules existantes Classe A de dashboardCalculations
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { 
  calculateNetAmount, 
  normalizeDate, 
  extractMonthKey,
  isFactureStateIncluded 
} from '../engine/normalizers';
import { extractFactureMeta } from '../rules/rules';

/**
 * CA Global HT
 * Source: extractFactureMeta() conforme STATIA_RULES
 */
export const caGlobalHt: StatDefinition = {
  id: 'ca_global_ht',
  label: 'CA Global HT',
  description: 'Chiffre d\'affaires total HT (factures - avoirs)',
  category: 'ca',
  source: 'factures',
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    let totalCA = 0;
    let factureCount = 0;
    let avoirCount = 0;
    let factureTotal = 0;
    let avoirTotal = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      // Extraire le state depuis plusieurs sources possibles
      const factureState = facture.state || facture.status || facture.statut 
        || facture.data?.state || facture.data?.status || facture.paymentStatus || '';
      
      // Filtrer par état (exclure brouillons, annulées, pro-forma)
      if (!isFactureStateIncluded(factureState)) continue;
      
      // Filtrer par date
      if (meta.date) {
        const date = new Date(meta.date);
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      } else {
        // Si pas de date, exclure la facture
        continue;
      }
      
      // Appliquer le montant net (avoirs = négatifs)
      totalCA += meta.montantNetHT;
      
      if (meta.isAvoir) {
        avoirCount++;
        avoirTotal += Math.abs(meta.montantNetHT);
      } else {
        factureCount++;
        factureTotal += meta.montantNetHT;
      }
    }
    
    return {
      value: totalCA,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: factureCount + avoirCount,
      },
      breakdown: {
        factureCount,
        avoirCount,
        factureTotal,
        avoirTotal,
      }
    };
  }
};

/**
 * CA par Mois
 * Groupé par mois avec détail mensuel
 */
export const caParMois: StatDefinition = {
  id: 'ca_par_mois',
  label: 'CA par Mois',
  description: 'Chiffre d\'affaires HT ventilé par mois',
  category: 'ca',
  source: 'factures',
  dimensions: ['mois'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    const byMonth: Record<string, number> = {};
    let totalCA = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      // Extraire le state depuis plusieurs sources possibles
      const factureState = facture.state || facture.status || facture.statut 
        || facture.data?.state || facture.data?.status || facture.paymentStatus || '';
      
      if (!isFactureStateIncluded(factureState)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const monthKey = extractMonthKey(date);
      byMonth[monthKey] = (byMonth[monthKey] || 0) + meta.montantNetHT;
      totalCA += meta.montantNetHT;
    }
    
    return {
      value: byMonth,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: factures.length,
      },
      breakdown: {
        total: totalCA,
        monthCount: Object.keys(byMonth).length,
      }
    };
  }
};

/**
 * Dû Client (reste à encaisser)
 */
export const duClient: StatDefinition = {
  id: 'du_client',
  label: 'Dû Client',
  description: 'Montant total restant à encaisser',
  category: 'ca',
  source: 'factures',
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    let totalDu = 0;
    let factureCount = 0;
    
    for (const facture of factures) {
      // Utiliser calcReglementsReste selon STATIA_RULES
      const reste = facture.data?.calcReglementsReste ?? facture.calcReglementsReste ?? 0;
      
      const meta = extractFactureMeta(facture);
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      if (reste > 0) {
        totalDu += reste;
        factureCount++;
      }
    }
    
    return {
      value: totalDu,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: factureCount,
      }
    };
  }
};

/**
 * Panier Moyen
 */
export const panierMoyen: StatDefinition = {
  id: 'panier_moyen',
  label: 'Panier Moyen',
  description: 'Montant moyen par facture (hors avoirs)',
  category: 'ca',
  source: 'factures',
  aggregation: 'avg',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    let totalCA = 0;
    let factureCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      // Exclure les avoirs du calcul du panier moyen
      if (meta.isAvoir) continue;
      
      // Extraire le state depuis plusieurs sources possibles
      const factureState = facture.state || facture.status || facture.statut 
        || facture.data?.state || facture.data?.status || facture.paymentStatus || '';
      
      if (!isFactureStateIncluded(factureState)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      totalCA += meta.montantNetHT;
      factureCount++;
    }
    
    const average = factureCount > 0 ? totalCA / factureCount : 0;
    
    return {
      value: average,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: factureCount,
      },
      breakdown: {
        totalCA,
        factureCount,
      }
    };
  }
};

/**
 * CA Mensuel (alias de ca_par_mois pour le Builder)
 * Groupé par mois avec détail mensuel
 */
export const caMensuel: StatDefinition = {
  id: 'ca_mensuel',
  label: 'CA Mensuel',
  description: 'Chiffre d\'affaires HT ventilé par mois',
  category: 'ca',
  source: 'factures',
  dimensions: ['mois'],
  aggregation: 'sum',
  unit: '€',
  compute: caParMois.compute,
};

export const caDefinitions = {
  ca_global_ht: caGlobalHt,
  ca_par_mois: caParMois,
  ca_mensuel: caMensuel,
  du_client: duClient,
  panier_moyen: panierMoyen,
};
