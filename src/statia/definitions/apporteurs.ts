/**
 * StatIA V1 - Définitions des métriques par Apporteur
 * Réutilise les formules existantes Classe A de apporteursCalculations
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { 
  normalizeApporteurId,
  isFactureStateIncluded 
} from '../engine/normalizers';
import { extractFactureMeta } from '../rules/rules';
import { indexProjectsById, indexClientsById } from '../engine/loaders';

/**
 * CA par Apporteur
 * Conforme à calculateApporteurStats de apporteursCalculations.ts
 * SUPPORTE les filtres croisés: univers
 */
export const caParApporteur: StatDefinition = {
  id: 'ca_par_apporteur',
  label: 'CA par Apporteur',
  description: 'Chiffre d\'affaires HT ventilé par apporteur/commanditaire',
  category: 'apporteur',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['apporteur'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, clients } = data;
    
    const projectsById = indexProjectsById(projects);
    const clientsById = indexClientsById(clients);
    
    const byApporteur: Record<string, { ca: number; label: string; count: number }> = {};
    let totalCA = 0;
    let recordCount = 0;
    
    // Filtre univers si spécifié
    const filterUnivers = params.filters?.univers 
      ? String(params.filters.univers).toLowerCase().trim()
      : null;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      // Récupérer le projet lié
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(projectId) : null;
      
      // FILTRE UNIVERS: si spécifié, vérifier que la facture appartient à cet univers
      if (filterUnivers) {
        const projectUniverses = project 
          ? (project.data?.universes || project.universes || []).map((u: string) => u.toLowerCase().trim())
          : ['non-classe'];
        
        if (!projectUniverses.includes(filterUnivers)) {
          continue; // Skip cette facture, elle n'appartient pas à l'univers sélectionné
        }
      }
      
      // Identifier l'apporteur - UNIQUEMENT les dossiers AVEC commanditaire
      const apporteurId = project ? normalizeApporteurId(project) : 'direct';
      
      // Exclure les factures sans apporteur (dossiers "Direct")
      if (apporteurId === 'direct') continue;
      
      // Récupérer le label de l'apporteur
      const client = clientsById.get(apporteurId);
      const apporteurLabel = client?.name || client?.label || `Apporteur ${apporteurId}`;
      
      if (!byApporteur[apporteurId]) {
        byApporteur[apporteurId] = { ca: 0, label: apporteurLabel, count: 0 };
      }
      
      byApporteur[apporteurId].ca += meta.montantNetHT;
      byApporteur[apporteurId].count++;
      totalCA += meta.montantNetHT;
      recordCount++;
    }
    
    // Formater le résultat
    const result: Record<string, number> = {};
    const labels: Record<string, string> = {};
    const counts: Record<string, number> = {};
    
    for (const [id, data] of Object.entries(byApporteur)) {
      result[id] = data.ca;
      labels[id] = data.label;
      counts[id] = data.count;
    }
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount,
      },
      breakdown: {
        total: totalCA,
        labels,
        counts,
        apporteurCount: Object.keys(byApporteur).length,
        filterUnivers,
      }
    };
  }
};

/**
 * Nombre de dossiers par Apporteur
 */
export const dossiersParApporteur: StatDefinition = {
  id: 'dossiers_par_apporteur',
  label: 'Dossiers par Apporteur',
  description: 'Nombre de dossiers/projets par apporteur',
  category: 'apporteur',
  source: ['projects', 'clients'],
  dimensions: ['apporteur'],
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, clients } = data;
    
    const clientsById = indexClientsById(clients);
    const byApporteur: Record<string, { count: number; label: string }> = {};
    let totalCount = 0;
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const apporteurId = normalizeApporteurId(project);
      
      // Exclure les dossiers sans apporteur (dossiers "Direct")
      if (apporteurId === 'direct') continue;
      
      const client = clientsById.get(apporteurId);
      const apporteurLabel = client?.name || client?.label || `Apporteur ${apporteurId}`;
      
      if (!byApporteur[apporteurId]) {
        byApporteur[apporteurId] = { count: 0, label: apporteurLabel };
      }
      
      byApporteur[apporteurId].count++;
      totalCount++;
    }
    
    const result: Record<string, number> = {};
    const labels: Record<string, string> = {};
    
    for (const [id, data] of Object.entries(byApporteur)) {
      result[id] = data.count;
      labels[id] = data.label;
    }
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: totalCount,
      },
      breakdown: {
        total: totalCount,
        labels,
      }
    };
  }
};

/**
 * Top N Apporteurs par CA
 */
export const topApporteursCA: StatDefinition = {
  id: 'top_apporteurs_ca',
  label: 'Top Apporteurs (CA)',
  description: 'Classement des meilleurs apporteurs par CA',
  category: 'apporteur',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['apporteur'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    // Réutiliser le calcul de caParApporteur
    const baseResult = caParApporteur.compute(data, params);
    
    // Trier par CA décroissant
    const entries = Object.entries(baseResult.value as Record<string, number>);
    entries.sort((a, b) => b[1] - a[1]);
    
    // Limiter au top N (par défaut 10)
    const topN = params.filters?.topN || 10;
    const topEntries = entries.slice(0, topN);
    
    const result: Record<string, number> = {};
    for (const [id, ca] of topEntries) {
      result[id] = ca;
    }
    
    return {
      value: result,
      metadata: baseResult.metadata,
      breakdown: {
        ...baseResult.breakdown,
        ranking: topEntries.map(([id], index) => ({ 
          rank: index + 1, 
          id, 
          label: baseResult.breakdown?.labels?.[id] 
        })),
      }
    };
  }
};

export const apporteursDefinitions = {
  ca_par_apporteur: caParApporteur,
  dossiers_par_apporteur: dossiersParApporteur,
  top_apporteurs_ca: topApporteursCA,
};
