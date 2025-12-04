/**
 * StatIA V1 - Définitions des métriques par Univers
 * Réutilise les formules existantes Classe A de universCalculations
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { 
  normalizeUniversSlug, 
  extractProjectUniverses,
  isFactureStateIncluded,
  normalizeApporteurId
} from '../engine/normalizers';
import { extractFactureMeta } from '../rules/rules';
import { indexProjectsById } from '../engine/loaders';

/**
 * CA par Univers
 * Conforme à calculateUniversStats de universCalculations.ts
 * SUPPORTE les filtres croisés: apporteurId
 */
export const caParUnivers: StatDefinition = {
  id: 'ca_par_univers',
  label: 'CA par Univers',
  description: 'Chiffre d\'affaires HT ventilé par univers métier',
  category: 'univers',
  source: ['factures', 'projects'],
  dimensions: ['univers'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    
    const projectsById = indexProjectsById(projects);
    const byUnivers: Record<string, number> = {};
    let totalCA = 0;
    let recordCount = 0;
    
    // Filtre apporteur si spécifié
    const filterApporteurId = params.filters?.apporteurId 
      ? String(params.filters.apporteurId).toLowerCase().trim()
      : null;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      // Récupérer le projet lié
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(projectId) : null;
      
      // FILTRE APPORTEUR: si spécifié, vérifier que la facture correspond à cet apporteur
      if (filterApporteurId) {
        const factureApporteurId = project ? normalizeApporteurId(project) : 'direct';
        const normalizedFactureApporteur = String(factureApporteurId).toLowerCase().trim();
        
        // Comparer les IDs normalisés
        if (normalizedFactureApporteur !== filterApporteurId) {
          continue; // Skip cette facture, elle n'appartient pas à l'apporteur sélectionné
        }
      }
      
      // Extraire les univers du projet
      const universes = project ? extractProjectUniverses(project) : ['non-classe'];
      
      // Distribuer le montant au prorata si multi-univers
      const montantParUnivers = meta.montantNetHT / universes.length;
      
      for (const univers of universes) {
        byUnivers[univers] = (byUnivers[univers] || 0) + montantParUnivers;
      }
      
      totalCA += meta.montantNetHT;
      recordCount++;
    }
    
    return {
      value: byUnivers,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount,
      },
      breakdown: {
        total: totalCA,
        universCount: Object.keys(byUnivers).length,
        filterApporteurId,
      }
    };
  }
};

/**
 * Nombre de dossiers par Univers
 */
export const dossiersParUnivers: StatDefinition = {
  id: 'dossiers_par_univers',
  label: 'Dossiers par Univers',
  description: 'Nombre de dossiers/projets par univers métier',
  category: 'univers',
  source: 'projects',
  dimensions: ['univers'],
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    const byUnivers: Record<string, number> = {};
    let totalCount = 0;
    
    for (const project of projects) {
      // Filtrer par date de création du projet
      const dateStr = project.date || project.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const universes = extractProjectUniverses(project);
      
      // Compter 1 dossier par univers (pas de prorata pour le count)
      for (const univers of universes) {
        byUnivers[univers] = (byUnivers[univers] || 0) + 1;
      }
      
      totalCount++;
    }
    
    return {
      value: byUnivers,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: totalCount,
      },
      breakdown: {
        total: totalCount,
      }
    };
  }
};

/**
 * Panier Moyen par Univers
 */
export const panierMoyenParUnivers: StatDefinition = {
  id: 'panier_moyen_par_univers',
  label: 'Panier Moyen par Univers',
  description: 'Montant moyen par facture ventilé par univers',
  category: 'univers',
  source: ['factures', 'projects'],
  dimensions: ['univers'],
  aggregation: 'avg',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    
    const projectsById = indexProjectsById(projects);
    const caByUnivers: Record<string, number> = {};
    const countByUnivers: Record<string, number> = {};
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      // Exclure les avoirs du panier moyen
      if (meta.isAvoir) continue;
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(projectId) : null;
      const universes = project ? extractProjectUniverses(project) : ['non-classe'];
      
      const montantParUnivers = meta.montantNetHT / universes.length;
      const countParUnivers = 1 / universes.length;
      
      for (const univers of universes) {
        caByUnivers[univers] = (caByUnivers[univers] || 0) + montantParUnivers;
        countByUnivers[univers] = (countByUnivers[univers] || 0) + countParUnivers;
      }
    }
    
    // Calculer les moyennes
    const avgByUnivers: Record<string, number> = {};
    for (const univers of Object.keys(caByUnivers)) {
      avgByUnivers[univers] = countByUnivers[univers] > 0 
        ? caByUnivers[univers] / countByUnivers[univers] 
        : 0;
    }
    
    return {
      value: avgByUnivers,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: Object.values(countByUnivers).reduce((a, b) => a + b, 0),
      },
      breakdown: {
        caByUnivers,
        countByUnivers,
      }
    };
  }
};

export const universDefinitions = {
  ca_par_univers: caParUnivers,
  dossiers_par_univers: dossiersParUnivers,
  panier_moyen_par_univers: panierMoyenParUnivers,
};
