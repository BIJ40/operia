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
    
    // Formater le résultat - utiliser les NOMS comme clés (pas les IDs)
    const result: Record<string, number> = {};
    const labels: Record<string, string> = {};
    const counts: Record<string, number> = {};
    
    for (const [id, data] of Object.entries(byApporteur)) {
      // Utiliser le label (nom) comme clé, pas l'ID
      const key = data.label || `Apporteur ${id}`;
      result[key] = (result[key] || 0) + data.ca; // Additionner si même nom
      labels[key] = data.label;
      counts[key] = (counts[key] || 0) + data.count;
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
    
    // Formater le résultat - utiliser les NOMS comme clés (pas les IDs)
    const result: Record<string, number> = {};
    const labels: Record<string, string> = {};
    
    for (const [id, data] of Object.entries(byApporteur)) {
      // Utiliser le label (nom) comme clé, pas l'ID
      const key = data.label || `Apporteur ${id}`;
      result[key] = (result[key] || 0) + data.count;
      labels[key] = data.label;
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

/**
 * Taux de transformation par Apporteur
 * nb devis acceptés / nb devis émis
 */
export const tauxTransformationApporteur: StatDefinition = {
  id: 'taux_transformation_apporteur',
  label: 'Taux transfo par Apporteur',
  description: 'Taux de transformation devis→factures par apporteur',
  category: 'apporteur',
  source: ['devis', 'projects', 'clients'],
  dimensions: ['apporteur'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis, projects, clients } = data;
    
    const projectsById = indexProjectsById(projects);
    const clientsById = indexClientsById(clients);
    
    const statsByApporteur = new Map<string, { 
      emis: number; 
      acceptes: number; 
      caEmis: number;
      caAcceptes: number;
      label: string 
    }>();
    
    for (const d of devis) {
      const dateStr = d.dateReelle || d.date || d.created_at;
      if (dateStr) {
        try {
          const date = new Date(dateStr);
          if (date < params.dateRange.start || date > params.dateRange.end) continue;
        } catch {
          continue;
        }
      }
      
      const projectId = d.projectId;
      const project = projectId ? projectsById.get(projectId) : null;
      const apporteurId = project ? normalizeApporteurId(project) : 'direct';
      
      if (apporteurId === 'direct') continue;
      
      const client = clientsById.get(apporteurId);
      const apporteurLabel = client?.name || client?.label || `Apporteur ${apporteurId}`;
      
      if (!statsByApporteur.has(apporteurId)) {
        statsByApporteur.set(apporteurId, { 
          emis: 0, 
          acceptes: 0, 
          caEmis: 0,
          caAcceptes: 0,
          label: apporteurLabel 
        });
      }
      
      const stats = statsByApporteur.get(apporteurId)!;
      const montant = d.totalHT || d.data?.totalHT || 0;
      const state = (d.state || '').toLowerCase();
      
      // Devis émis (sent, accepted, refused, etc.)
      if (['sent', 'accepted', 'validated', 'signed', 'order', 'refused'].includes(state)) {
        stats.emis++;
        stats.caEmis += montant;
      }
      
      // Devis acceptés
      if (['accepted', 'validated', 'signed', 'order'].includes(state)) {
        stats.acceptes++;
        stats.caAcceptes += montant;
      }
    }
    
    const result: Record<string, number> = {};
    const labels: Record<string, string> = {};
    const details: Record<string, any> = {};
    
    statsByApporteur.forEach((stats, apporteurId) => {
      const tauxNb = stats.emis > 0 ? (stats.acceptes / stats.emis) * 100 : 0;
      result[apporteurId] = Math.round(tauxNb * 10) / 10;
      labels[apporteurId] = stats.label;
      details[apporteurId] = {
        tauxNb: Math.round(tauxNb * 10) / 10,
        tauxCa: stats.caEmis > 0 ? Math.round((stats.caAcceptes / stats.caEmis) * 1000) / 10 : 0,
        emis: stats.emis,
        acceptes: stats.acceptes,
      };
    });
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: statsByApporteur.size,
      },
      breakdown: { labels, details }
    };
  }
};

/**
 * Apporteurs inactifs
 * Apporteurs sans dossier depuis X jours
 */
export const apporteursInactifs: StatDefinition = {
  id: 'apporteurs_inactifs',
  label: 'Apporteurs inactifs',
  description: 'Apporteurs sans nouveau dossier depuis X jours (défaut: 90)',
  category: 'apporteur',
  source: ['projects', 'clients'],
  dimensions: ['apporteur'],
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, clients } = data;
    
    const clientsById = indexClientsById(clients);
    const lastActivityByApporteur = new Map<string, { date: Date; label: string }>();
    
    // Identifier la dernière activité de chaque apporteur
    for (const project of projects) {
      const apporteurId = normalizeApporteurId(project);
      if (apporteurId === 'direct') continue;
      
      const dateStr = project.created_at || project.date;
      if (!dateStr) continue;
      
      try {
        const date = new Date(dateStr);
        const current = lastActivityByApporteur.get(apporteurId);
        
        if (!current || date > current.date) {
          const client = clientsById.get(apporteurId);
          const label = client?.name || client?.label || `Apporteur ${apporteurId}`;
          lastActivityByApporteur.set(apporteurId, { date, label });
        }
      } catch {
        continue;
      }
    }
    
    // Filtrer les inactifs (X jours sans activité)
    const seuilJours = params.filters?.seuilJours || 90;
    const dateSeuil = new Date();
    dateSeuil.setDate(dateSeuil.getDate() - seuilJours);
    
    const inactifs: Array<{ id: string; label: string; lastActivity: string; joursInactifs: number }> = [];
    
    lastActivityByApporteur.forEach((data, apporteurId) => {
      if (data.date < dateSeuil) {
        const joursInactifs = Math.floor((Date.now() - data.date.getTime()) / (1000 * 60 * 60 * 24));
        inactifs.push({
          id: apporteurId,
          label: data.label,
          lastActivity: data.date.toISOString().split('T')[0],
          joursInactifs,
        });
      }
    });
    
    // Trier par jours d'inactivité décroissants
    inactifs.sort((a, b) => b.joursInactifs - a.joursInactifs);
    
    return {
      value: inactifs.length,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: inactifs.length,
      },
      breakdown: {
        seuilJours,
        liste: inactifs,
        totalApporteurs: lastActivityByApporteur.size,
      }
    };
  }
};

export const apporteursDefinitions = {
  ca_par_apporteur: caParApporteur,
  dossiers_par_apporteur: dossiersParApporteur,
  top_apporteurs_ca: topApporteursCA,
  taux_transformation_apporteur: tauxTransformationApporteur,
  apporteurs_inactifs: apporteursInactifs,
};
