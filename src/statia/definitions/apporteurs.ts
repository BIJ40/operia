/**
 * StatIA V1 - Définitions des métriques par Apporteur
 * Réutilise les formules existantes Classe A de apporteursCalculations
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { isFactureStateIncluded } from '../engine/normalizers';
import { extractFactureMeta } from '../rules/rules';
import { indexProjectsById } from '../engine/loaders';

/**
 * Mapping apporteurId → nom lisible
 * Cherche dans plusieurs champs possibles du client
 */
function mapApporteurs(clients: any[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const c of clients) {
    const id = String(c.id);
    const nom =
      c.displayName ||
      c.raisonSociale ||
      c.nom ||
      c.name ||
      c.label ||
      c.data?.nom ||
      c.data?.name ||
      c.data?.raisonSociale ||
      `Apporteur ${id}`;

    map.set(id, nom);
  }

  return map;
}

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
    const apporteursById = mapApporteurs(clients);
    
    const result: Record<string, number> = {};
    const counts: Record<string, number> = {};
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
          continue;
        }
      }
      
      // Identifier l'apporteur - UNIQUEMENT les dossiers AVEC commanditaire
      const apporteurId = project?.data?.commanditaireId || project?.commanditaireId;
      
      // Exclure les factures sans apporteur (dossiers "Direct")
      if (!apporteurId) continue;
      
      // Récupérer le NOM de l'apporteur (pas l'ID)
      const nom = apporteursById.get(String(apporteurId)) || `Apporteur ${apporteurId}`;
      
      result[nom] = (result[nom] || 0) + meta.montantNetHT;
      counts[nom] = (counts[nom] || 0) + 1;
      totalCA += meta.montantNetHT;
      recordCount++;
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
        counts,
        apporteurCount: Object.keys(result).length,
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
    
    const apporteursById = mapApporteurs(clients);
    const result: Record<string, number> = {};
    let totalCount = 0;
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const apporteurId = project.data?.commanditaireId || project.commanditaireId;
      
      // Exclure les dossiers sans apporteur (dossiers "Direct")
      if (!apporteurId) continue;
      
      // Récupérer le NOM de l'apporteur
      const nom = apporteursById.get(String(apporteurId)) || `Apporteur ${apporteurId}`;
      
      result[nom] = (result[nom] || 0) + 1;
      totalCount++;
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
    const apporteursById = mapApporteurs(clients);
    
    // Utiliser le NOM comme clé directement
    const statsByNom = new Map<string, { 
      emis: number; 
      acceptes: number; 
      caEmis: number;
      caAcceptes: number;
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
      const apporteurId = project?.data?.commanditaireId || project?.commanditaireId;
      
      if (!apporteurId) continue;
      
      const nom = apporteursById.get(String(apporteurId)) || `Apporteur ${apporteurId}`;
      
      if (!statsByNom.has(nom)) {
        statsByNom.set(nom, { emis: 0, acceptes: 0, caEmis: 0, caAcceptes: 0 });
      }
      
      const stats = statsByNom.get(nom)!;
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
    const details: Record<string, any> = {};
    
    statsByNom.forEach((stats, nom) => {
      const tauxNb = stats.emis > 0 ? (stats.acceptes / stats.emis) * 100 : 0;
      result[nom] = Math.round(tauxNb * 10) / 10;
      details[nom] = {
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
        recordCount: statsByNom.size,
      },
      breakdown: { details }
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
    
    const apporteursById = mapApporteurs(clients);
    const lastActivityByApporteur = new Map<string, { date: Date; nom: string }>();
    
    // Identifier la dernière activité de chaque apporteur
    for (const project of projects) {
      const apporteurId = project.data?.commanditaireId || project.commanditaireId;
      if (!apporteurId) continue;
      
      const dateStr = project.created_at || project.date;
      if (!dateStr) continue;
      
      try {
        const date = new Date(dateStr);
        const idStr = String(apporteurId);
        const current = lastActivityByApporteur.get(idStr);
        
        if (!current || date > current.date) {
          const nom = apporteursById.get(idStr) || `Apporteur ${apporteurId}`;
          lastActivityByApporteur.set(idStr, { date, nom });
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
          label: data.nom,
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
