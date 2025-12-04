/**
 * StatIA V1 - Définitions des métriques Devis
 * Réutilise les formules existantes de devisCalculations
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { isDevisValidated, normalizeDate } from '../engine/normalizers';
import { STATIA_RULES } from '../domain/rules';

/**
 * Taux de Transformation Devis (en nombre)
 * Conforme STATIA_RULES: count(devis_facturés) / count(devis_émis)
 */
export const tauxTransformationDevisNombre: StatDefinition = {
  id: 'taux_transformation_devis_nombre',
  label: 'Taux Transformation Devis (Nombre)',
  description: 'Pourcentage de devis transformés en factures (en nombre)',
  category: 'devis',
  source: 'devis',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;
    
    let totalDevis = 0;
    let devisTransformes = 0;
    
    for (const d of devis) {
      const dateStr = d.dateReelle || d.date || d.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      // Exclure les devis annulés
      const state = (d.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'refused') continue;
      
      totalDevis++;
      
      if (isDevisValidated(d)) {
        devisTransformes++;
      }
    }
    
    const taux = totalDevis > 0 ? (devisTransformes / totalDevis) * 100 : 0;
    
    return {
      value: taux,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: totalDevis,
      },
      breakdown: {
        totalDevis,
        devisTransformes,
        devisNonTransformes: totalDevis - devisTransformes,
      }
    };
  }
};

/**
 * Taux de Transformation Devis (en montant)
 * Conforme STATIA_RULES: sum(HT_facturé) / sum(HT_devisé)
 */
export const tauxTransformationDevisMontant: StatDefinition = {
  id: 'taux_transformation_devis_montant',
  label: 'Taux Transformation Devis (Montant)',
  description: 'Pourcentage de devis transformés en factures (en montant HT)',
  category: 'devis',
  source: 'devis',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;
    
    let totalMontantDevise = 0;
    let totalMontantTransforme = 0;
    
    for (const d of devis) {
      const dateStr = d.dateReelle || d.date || d.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      // Exclure les devis annulés
      const state = (d.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'refused') continue;
      
      const montantHT = d.data?.totalHT ?? d.totalHT ?? 0;
      totalMontantDevise += montantHT;
      
      if (isDevisValidated(d)) {
        totalMontantTransforme += montantHT;
      }
    }
    
    const taux = totalMontantDevise > 0 ? (totalMontantTransforme / totalMontantDevise) * 100 : 0;
    
    return {
      value: taux,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: devis.length,
      },
      breakdown: {
        totalMontantDevise,
        totalMontantTransforme,
        montantNonTransforme: totalMontantDevise - totalMontantTransforme,
      }
    };
  }
};

/**
 * Nombre de Devis émis
 */
export const nombreDevis: StatDefinition = {
  id: 'nombre_devis',
  label: 'Nombre de Devis',
  description: 'Nombre total de devis émis (hors annulés)',
  category: 'devis',
  source: 'devis',
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;
    
    let count = 0;
    
    for (const d of devis) {
      const dateStr = d.dateReelle || d.date || d.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const state = (d.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'refused') continue;
      
      count++;
    }
    
    return {
      value: count,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: count,
      }
    };
  }
};

/**
 * Montant total des Devis émis
 */
export const montantDevis: StatDefinition = {
  id: 'montant_devis',
  label: 'Montant Devis HT',
  description: 'Montant total HT des devis émis',
  category: 'devis',
  source: 'devis',
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;
    
    let totalHT = 0;
    let count = 0;
    
    for (const d of devis) {
      const dateStr = d.dateReelle || d.date || d.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const state = (d.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'refused') continue;
      
      const montant = d.data?.totalHT ?? d.totalHT ?? 0;
      totalHT += montant;
      count++;
    }
    
    return {
      value: totalHT,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: count,
      }
    };
  }
};

export const devisDefinitions = {
  taux_transformation_devis_nombre: tauxTransformationDevisNombre,
  taux_transformation_devis_montant: tauxTransformationDevisMontant,
  nombre_devis: nombreDevis,
  montant_devis: montantDevis,
};
