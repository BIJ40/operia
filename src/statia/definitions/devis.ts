/**
 * StatIA V1 - Définitions des métriques Devis
 * Aligné sur la logique legacy de dashboardCalculations
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { logDebug } from '@/lib/logger';
// Note: isDevisValidated n'est plus utilisé, logique inline pour clarté

/**
 * Taux de Transformation Devis (en nombre)
 * Aligné sur la logique legacy : envoyés = sent/accepted/invoice, acceptés = accepted/invoice
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
    
    let devisEnvoyes = 0;
    let devisAcceptes = 0;
    
    for (const d of devis) {
      const dateStr = d.dateReelle || d.date || d.dateCreation || d.data?.dateReelle || d.data?.date || d.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      // Récupérer l'état du devis
      const state = (d.state || d.statut || d.data?.state || d.data?.statut || '').toString().toLowerCase();
      
      // Devis envoyés = sent, accepted, invoice (ceux qui ont été présentés au client)
      if (state === 'sent' || state === 'accepted' || state === 'invoice') {
        devisEnvoyes++;
        
        // Devis acceptés = accepted ou invoice (facturé)
        if (state === 'accepted' || state === 'invoice') {
          devisAcceptes++;
        }
      }
    }
    
    const taux = devisEnvoyes > 0 ? (devisAcceptes / devisEnvoyes) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10, // Arrondir à 1 décimale
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: devisEnvoyes,
      },
      breakdown: {
        totalDevis: devisEnvoyes,
        devisTransformes: devisAcceptes,
        devisNonTransformes: devisEnvoyes - devisAcceptes,
      }
    };
  }
};

/**
 * Taux de Transformation Devis (en montant)
 * Aligné sur la logique legacy : envoyés = sent/accepted/invoice, acceptés = accepted/invoice
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
    
    let totalMontantEnvoye = 0;
    let totalMontantAccepte = 0;
    
    for (const d of devis) {
      const dateStr = d.dateReelle || d.date || d.dateCreation || d.data?.dateReelle || d.data?.date || d.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      // Récupérer l'état du devis
      const state = (d.state || d.statut || d.data?.state || d.data?.statut || '').toString().toLowerCase();
      const montantHT = d.data?.totalHT ?? d.totalHT ?? 0;
      
      // Devis envoyés = sent, accepted, invoice
      if (state === 'sent' || state === 'accepted' || state === 'invoice') {
        totalMontantEnvoye += montantHT;
        
        // Devis acceptés = accepted ou invoice
        if (state === 'accepted' || state === 'invoice') {
          totalMontantAccepte += montantHT;
        }
      }
    }
    
    const taux = totalMontantEnvoye > 0 ? (totalMontantAccepte / totalMontantEnvoye) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: devis.length,
      },
      breakdown: {
        totalMontantDevise: totalMontantEnvoye,
        totalMontantTransforme: totalMontantAccepte,
        montantNonTransforme: totalMontantEnvoye - totalMontantAccepte,
      }
    };
  }
};

/**
 * Nombre de Devis émis (envoyés au client)
 */
export const nombreDevis: StatDefinition = {
  id: 'nombre_devis',
  label: 'Nombre de Devis',
  description: 'Nombre total de devis envoyés (sent/accepted/invoice)',
  category: 'devis',
  source: 'devis',
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;
    
    let count = 0;
    
    for (const d of devis) {
      const dateStr = d.dateReelle || d.date || d.dateCreation || d.data?.dateReelle || d.data?.date || d.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      // Compter uniquement les devis envoyés (sent, accepted, invoice)
      const state = (d.state || d.statut || d.data?.state || d.data?.statut || '').toString().toLowerCase();
      if (state === 'sent' || state === 'accepted' || state === 'invoice') {
        count++;
      }
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
 * Montant total des Devis émis (TOUS les devis de la période)
 * Somme de tous les HT des devis, sans filtrage par état
 */
export const montantDevis: StatDefinition = {
  id: 'montant_devis',
  label: 'Montant Devis HT',
  description: 'Montant total HT de tous les devis émis sur la période',
  category: 'devis',
  source: 'devis',
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis } = data;
    
    logDebug('STATIA', 'montantDevis - START', {
      nbDevisTotal: devis.length,
      dateRange: params.dateRange ? { 
        start: params.dateRange.start.toISOString(), 
        end: params.dateRange.end.toISOString() 
      } : 'none',
      sampleDevis: devis.slice(0, 3).map(d => ({
        id: d.id,
        state: d.state || d.statut || d.data?.state,
        totalHT: d.data?.totalHT ?? d.totalHT,
        date: d.dateReelle || d.date || d.data?.dateReelle || d.data?.date,
      }))
    });
    
    let totalHT = 0;
    let count = 0;
    let skippedByDate = 0;
    let skippedByState = 0;
    
    for (const d of devis) {
      // Filtre par date
      const dateStr = d.dateReelle || d.date || d.dateCreation || d.data?.dateReelle || d.data?.date || d.created_at;
      if (dateStr && params.dateRange) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          skippedByDate++;
          continue;
        }
        if (date < params.dateRange.start || date > params.dateRange.end) {
          skippedByDate++;
          continue;
        }
      }
      
      // Exclure uniquement les brouillons et annulés
      const state = (d.state || d.statut || d.data?.state || d.data?.statut || '').toString().toLowerCase();
      if (state === 'draft' || state === 'brouillon' || state === 'cancelled' || state === 'annule') {
        skippedByState++;
        continue;
      }
      
      // Sommer le montant HT
      const montant = d.data?.totalHT ?? d.totalHT ?? 0;
      totalHT += montant;
      count++;
    }
    
    logDebug('STATIA', 'montantDevis - RESULT', {
      totalHT,
      count,
      skippedByDate,
      skippedByState,
    });
    
    return {
      value: totalHT,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: count,
      },
      breakdown: {
        nbDevis: count,
        totalHT: totalHT,
      }
    };
  }
};

/**
 * Délai Premier Devis
 * Délai entre intervention initiale du dossier et premier devis émis
 */
export const delaiPremierDevis: StatDefinition = {
  id: 'delai_premier_devis',
  label: 'Délai Premier Devis',
  description: 'Délai moyen entre intervention initiale et premier devis (en jours)',
  category: 'devis',
  source: ['interventions', 'devis'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, devis } = data;
    
    console.log('[StatIA] DELAI_PREMIER_DEVIS - START', { 
      nbInterventions: interventions.length,
      nbDevis: devis.length 
    });
    
    // 1. Trouver intervention initiale par dossier (min date réalisée)
    const interventionInitialeParDossier = new Map<string | number, { date: Date, intervention: any }>();
    
    for (const intervention of interventions) {
      const projectId = intervention.projectId || intervention.project_id;
      if (!projectId) continue;
      
      // Vérifier état réalisé
      const state = (intervention.state || intervention.statut || intervention.data?.state || '').toLowerCase();
      const isRealise = ['done', 'finished', 'validated', 'completed', 'réalisée', 'terminée'].includes(state);
      if (!isRealise) continue;
      
      const dateStr = intervention.dateReelle || intervention.date || intervention.data?.dateReelle;
      if (!dateStr) continue;
      
      let date: Date;
      try {
        date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;
      } catch {
        continue;
      }
      
      // Filtrer par période
      if (date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const existing = interventionInitialeParDossier.get(projectId);
      if (!existing || date < existing.date) {
        interventionInitialeParDossier.set(projectId, { date, intervention });
      }
    }
    
    console.log('[StatIA] DELAI_PREMIER_DEVIS - Dossiers avec intervention initiale:', interventionInitialeParDossier.size);
    
    // 2. Trouver premier devis par dossier (exclure brouillons/annulés)
    const premierDevisParDossier = new Map<string | number, { date: Date, devis: any }>();
    
    for (const d of devis) {
      const projectId = d.projectId || d.project_id;
      if (!projectId) continue;
      
      // Exclure brouillons et annulés
      const state = (d.state || d.statut || d.data?.state || d.data?.statut || '').toLowerCase();
      if (state === 'draft' || state === 'brouillon' || state === 'cancelled' || state === 'annule') {
        continue;
      }
      
      const dateStr = d.dateReelle || d.date || d.dateCreation || d.data?.dateReelle || d.data?.date;
      if (!dateStr) continue;
      
      let date: Date;
      try {
        date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;
      } catch {
        continue;
      }
      
      const existing = premierDevisParDossier.get(projectId);
      if (!existing || date < existing.date) {
        premierDevisParDossier.set(projectId, { date, devis: d });
      }
    }
    
    console.log('[StatIA] DELAI_PREMIER_DEVIS - Dossiers avec devis:', premierDevisParDossier.size);
    
    // 3. Calculer délais pour les dossiers ayant les deux
    const delais: number[] = [];
    
    for (const [projectId, interventionData] of interventionInitialeParDossier) {
      const devisData = premierDevisParDossier.get(projectId);
      if (!devisData) continue;
      
      // Délai en jours
      const diffMs = devisData.date.getTime() - interventionData.date.getTime();
      const delaiJours = diffMs / (1000 * 60 * 60 * 24);
      
      // Ignorer délais négatifs (devis avant intervention)
      if (delaiJours >= 0) {
        delais.push(delaiJours);
      }
    }
    
    console.log('[StatIA] DELAI_PREMIER_DEVIS - Délais calculés:', delais.length);
    
    // 4. Calculer stats
    if (delais.length === 0) {
      return {
        value: 0,
        metadata: {
          computedAt: new Date(),
          source: 'devis',
          recordCount: 0,
        },
        breakdown: {
          moyenne: 0,
          mediane: 0,
          min: 0,
          max: 0,
          nbDossiers: 0,
        }
      };
    }
    
    delais.sort((a, b) => a - b);
    
    const moyenne = delais.reduce((sum, d) => sum + d, 0) / delais.length;
    const mediane = delais.length % 2 === 0
      ? (delais[delais.length / 2 - 1] + delais[delais.length / 2]) / 2
      : delais[Math.floor(delais.length / 2)];
    const min = delais[0];
    const max = delais[delais.length - 1];
    
    console.log('[StatIA] DELAI_PREMIER_DEVIS - Résultat:', { moyenne, mediane, min, max });
    
    return {
      value: Math.round(moyenne * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: delais.length,
      },
      breakdown: {
        moyenne: Math.round(moyenne * 10) / 10,
        mediane: Math.round(mediane * 10) / 10,
        min: Math.round(min * 10) / 10,
        max: Math.round(max * 10) / 10,
        nbDossiers: delais.length,
      }
    };
  }
};

export const devisDefinitions = {
  taux_transformation_devis_nombre: tauxTransformationDevisNombre,
  taux_transformation_devis_montant: tauxTransformationDevisMontant,
  nombre_devis: nombreDevis,
  montant_devis: montantDevis,
  delai_premier_devis: delaiPremierDevis,
};
