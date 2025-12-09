/**
 * StatIA V1 - Définitions des métriques par Apporteur
 * Réutilise les formules existantes Classe A de apporteursCalculations
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { isFactureStateIncluded, isSAVIntervention } from '../engine/normalizers';
import { extractFactureMeta } from '../rules/rules';
import { indexProjectsById } from '../engine/loaders';

// ==================== TYPES ====================

type ApporteurInfo = {
  id: string;
  name: string;
  type: string; // type d'apporteur normalisé
};

// ==================== HELPERS ====================

/**
 * Normalise le type d'apporteur brut vers un label lisible
 */
function normalizeApporteurType(raw: any): string {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return 'Clients Directs';

  if (['assureur', 'assurance', 'assureurs'].includes(v)) return 'Assureurs';
  if (['bailleur', 'bailleurs', 'bailleur_social'].includes(v)) return 'Bailleurs';
  if (['syndic', 'copro', 'copropriete'].includes(v)) return 'Syndics';
  if (['maintenance', 'mainteneur'].includes(v)) return 'Maintenance';
  if (['gestion', 'gestionnaire'].includes(v)) return 'Gestionnaires';
  if (['pro', 'professionnel', 'professionnels'].includes(v)) return 'Professionnels';

  // fallback générique: capitalize first letter
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/**
 * Mapping apporteurId → { id, name, type }
 */
function mapApporteurInfos(clients: any[]): Map<string, ApporteurInfo> {
  const map = new Map<string, ApporteurInfo>();

  for (const c of clients) {
    const id = String(c.id);
    const name =
      c.displayName ||
      c.raisonSociale ||
      c.nom ||
      c.name ||
      c.label ||
      c.data?.nom ||
      c.data?.name ||
      c.data?.raisonSociale ||
      `Apporteur ${id}`;

    const rawType =
      c.data?.type ||
      c.data?.typeApporteur ||
      c.data?.categorie ||
      c.categorie ||
      c.type ||
      null;

    const type = normalizeApporteurType(rawType);

    map.set(id, { id, name, type });
  }

  return map;
}

/**
 * Mapping apporteurId → nom lisible (legacy helper)
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
 * Retourne le type d'apporteur pour un projet
 */
function getApporteurTypeForProject(
  project: any,
  apporteursInfoById: Map<string, ApporteurInfo>
): string {
  const cmdId = project?.data?.commanditaireId || project?.commanditaireId;
  if (!cmdId) {
    return 'Clients Directs';
  }

  const info = apporteursInfoById.get(String(cmdId));
  return info?.type || 'Clients Directs';
}

/**
 * Vérifie si un projet est un dossier SAV
 */
function isSavProject(project: any): boolean {
  // Vérifier le flag SAV direct
  if (project?.data?.isSav || project?.isSav) return true;
  
  // Vérifier si c'est un dossier enfant/lié (SAV = reprise)
  if (project?.data?.parentProjectId || project?.parentProjectId) return true;
  
  // RÈGLE STRICTE: univers === "sav" (égalité exacte)
  const universes = project?.data?.universes || project?.universes || [];
  if (universes.some((u: string) => String(u).toLowerCase().trim() === 'sav')) return true;
  
  return false;
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

// ==================== MÉTRIQUES PAR TYPE D'APPORTEUR ====================

/**
 * CA par Type d'Apporteur
 * Ventile le CA HT par catégorie d'apporteur (Assureurs, Bailleurs, etc.)
 */
export const caParTypeApporteur: StatDefinition = {
  id: 'ca_par_type_apporteur',
  label: 'CA par Type d\'Apporteur',
  description: 'Chiffre d\'affaires HT ventilé par type d\'apporteur',
  category: 'apporteur',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['type_apporteur'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, clients } = data;
    
    const projectsById = indexProjectsById(projects);
    const apporteursInfoById = mapApporteurInfos(clients);
    
    const caByType: Record<string, number> = {};
    let totalCA = 0;
    let recordCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(projectId) : null;
      
      const typeApporteur = getApporteurTypeForProject(project, apporteursInfoById);
      
      caByType[typeApporteur] = (caByType[typeApporteur] || 0) + meta.montantNetHT;
      totalCA += meta.montantNetHT;
      recordCount++;
    }
    
    return {
      value: caByType,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount,
      },
      breakdown: {
        total: totalCA,
        typeCount: Object.keys(caByType).length,
      }
    };
  }
};

/**
 * Dossiers par Type d'Apporteur
 * Nombre de dossiers facturés par type d'apporteur
 */
export const dossiersParTypeApporteur: StatDefinition = {
  id: 'dossiers_par_type_apporteur',
  label: 'Dossiers par Type d\'Apporteur',
  description: 'Nombre de dossiers par type d\'apporteur',
  category: 'apporteur',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['type_apporteur'],
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, clients } = data;
    
    const projectsById = indexProjectsById(projects);
    const apporteursInfoById = mapApporteurInfos(clients);
    
    // Set de projectIds par type pour éviter les doublons
    const projectsByType = new Map<string, Set<string>>();
    let recordCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = facture.projectId || facture.project_id;
      if (!projectId) continue;
      
      const project = projectsById.get(projectId);
      const typeApporteur = getApporteurTypeForProject(project, apporteursInfoById);
      
      if (!projectsByType.has(typeApporteur)) {
        projectsByType.set(typeApporteur, new Set());
      }
      projectsByType.get(typeApporteur)!.add(String(projectId));
      recordCount++;
    }
    
    const result: Record<string, number> = {};
    let totalDossiers = 0;
    
    projectsByType.forEach((projectIds, type) => {
      result[type] = projectIds.size;
      totalDossiers += projectIds.size;
    });
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount,
      },
      breakdown: {
        total: totalDossiers,
        typeCount: projectsByType.size,
      }
    };
  }
};

/**
 * Panier Moyen par Type d'Apporteur
 * CA HT / nb dossiers par type d'apporteur
 */
export const panierMoyenParTypeApporteur: StatDefinition = {
  id: 'panier_moyen_par_type_apporteur',
  label: 'Panier Moyen par Type d\'Apporteur',
  description: 'Panier moyen (CA/dossier) par type d\'apporteur',
  category: 'apporteur',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['type_apporteur'],
  aggregation: 'avg',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, clients } = data;
    
    const projectsById = indexProjectsById(projects);
    const apporteursInfoById = mapApporteurInfos(clients);
    
    const caByType: Record<string, number> = {};
    const projectsByType = new Map<string, Set<string>>();
    let recordCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(projectId) : null;
      const typeApporteur = getApporteurTypeForProject(project, apporteursInfoById);
      
      // Accumuler le CA
      caByType[typeApporteur] = (caByType[typeApporteur] || 0) + meta.montantNetHT;
      
      // Compter les dossiers uniques
      if (projectId) {
        if (!projectsByType.has(typeApporteur)) {
          projectsByType.set(typeApporteur, new Set());
        }
        projectsByType.get(typeApporteur)!.add(String(projectId));
      }
      recordCount++;
    }
    
    // Calculer le panier moyen par type
    const result: Array<{
      typeApporteur: string;
      caHT: number;
      nbDossiers: number;
      panierMoyen: number;
    }> = [];
    
    const allTypes = new Set([...Object.keys(caByType), ...projectsByType.keys()]);
    
    allTypes.forEach(type => {
      const ca = caByType[type] || 0;
      const nbDossiers = projectsByType.get(type)?.size || 0;
      const panierMoyen = nbDossiers > 0 ? ca / nbDossiers : 0;
      
      result.push({
        typeApporteur: type,
        caHT: Math.round(ca * 100) / 100,
        nbDossiers,
        panierMoyen: Math.round(panierMoyen * 100) / 100,
      });
    });
    
    // Trier par CA décroissant
    result.sort((a, b) => b.caHT - a.caHT);
    
    // Créer aussi un Record simple pour value
    const valueRecord: Record<string, number> = {};
    result.forEach(r => {
      valueRecord[r.typeApporteur] = r.panierMoyen;
    });
    
    return {
      value: valueRecord,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount,
      },
      breakdown: {
        rows: result,
        typeCount: result.length,
      }
    };
  }
};

/**
 * Taux de Transformation par Type d'Apporteur
 * nb devis acceptés / nb devis émis par type d'apporteur
 */
export const tauxTransfoParTypeApporteur: StatDefinition = {
  id: 'taux_transfo_par_type_apporteur',
  label: 'Taux Transfo par Type d\'Apporteur',
  description: 'Taux de transformation devis→factures par type d\'apporteur',
  category: 'apporteur',
  source: ['devis', 'projects', 'clients'],
  dimensions: ['type_apporteur'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis, projects, clients } = data;
    
    const projectsById = indexProjectsById(projects);
    const apporteursInfoById = mapApporteurInfos(clients);
    
    const statsByType = new Map<string, {
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
      const typeApporteur = getApporteurTypeForProject(project, apporteursInfoById);
      
      if (!statsByType.has(typeApporteur)) {
        statsByType.set(typeApporteur, { emis: 0, acceptes: 0, caEmis: 0, caAcceptes: 0 });
      }
      
      const stats = statsByType.get(typeApporteur)!;
      const montant = d.totalHT || d.data?.totalHT || 0;
      const state = (d.state || '').toLowerCase();
      
      // Devis émis
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
    
    statsByType.forEach((stats, type) => {
      const tauxNb = stats.emis > 0 ? (stats.acceptes / stats.emis) * 100 : 0;
      const tauxCa = stats.caEmis > 0 ? (stats.caAcceptes / stats.caEmis) * 100 : 0;
      
      result[type] = Math.round(tauxNb * 10) / 10;
      details[type] = {
        tauxNb: Math.round(tauxNb * 10) / 10,
        tauxCa: Math.round(tauxCa * 10) / 10,
        emis: stats.emis,
        acceptes: stats.acceptes,
        caEmis: Math.round(stats.caEmis * 100) / 100,
        caAcceptes: Math.round(stats.caAcceptes * 100) / 100,
      };
    });
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: statsByType.size,
      },
      breakdown: { details }
    };
  }
};

/**
 * Taux SAV par Type d'Apporteur
 * nb dossiers SAV / nb dossiers total par type d'apporteur
 */
export const tauxSavParTypeApporteur: StatDefinition = {
  id: 'taux_sav_par_type_apporteur',
  label: 'Taux SAV par Type d\'Apporteur',
  description: 'Taux de SAV par type d\'apporteur',
  category: 'apporteur',
  source: ['projects', 'clients'],
  dimensions: ['type_apporteur'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, clients } = data;
    
    const apporteursInfoById = mapApporteurInfos(clients);
    
    const totalByType: Record<string, number> = {};
    const savByType: Record<string, number> = {};
    let recordCount = 0;
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at;
      if (dateStr) {
        try {
          const date = new Date(dateStr);
          if (date < params.dateRange.start || date > params.dateRange.end) continue;
        } catch {
          continue;
        }
      }
      
      const typeApporteur = getApporteurTypeForProject(project, apporteursInfoById);
      
      totalByType[typeApporteur] = (totalByType[typeApporteur] || 0) + 1;
      
      if (isSavProject(project)) {
        savByType[typeApporteur] = (savByType[typeApporteur] || 0) + 1;
      }
      
      recordCount++;
    }
    
    const result: Record<string, number> = {};
    const details: Record<string, any> = {};
    
    Object.keys(totalByType).forEach(type => {
      const total = totalByType[type];
      const sav = savByType[type] || 0;
      const tauxSav = total > 0 ? (sav / total) * 100 : 0;
      
      result[type] = Math.round(tauxSav * 10) / 10;
      details[type] = {
        tauxSav: Math.round(tauxSav * 10) / 10,
        total,
        sav,
      };
    });
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount,
      },
      breakdown: { details }
    };
  }
};

/**
 * CA Mensuel Segmenté : Apporteurs vs Particuliers
 * Ventilation mensuelle du CA entre clients directs et apporteurs
 */
export const caMensuelSegmente: StatDefinition = {
  id: 'ca_mensuel_segmente',
  label: 'CA Mensuel Segmenté',
  description: 'Répartition mensuelle du CA entre Apporteurs et Particuliers',
  category: 'apporteur',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['mois'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    
    const projectsById = indexProjectsById(projects);
    
    // Map mois → { apporteurs, particuliers }
    const byMonth = new Map<string, { apporteurs: number; particuliers: number }>();
    let recordCount = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      if (!isFactureStateIncluded(facture.state)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      // Clé mois : YYYY-MM ou libellé français
      const monthKey = date.toLocaleDateString('fr-FR', { month: 'short' });
      
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(projectId) : null;
      const apporteurId = project?.data?.commanditaireId || project?.commanditaireId;
      
      if (!byMonth.has(monthKey)) {
        byMonth.set(monthKey, { apporteurs: 0, particuliers: 0 });
      }
      
      const entry = byMonth.get(monthKey)!;
      if (apporteurId) {
        entry.apporteurs += meta.montantNetHT;
      } else {
        entry.particuliers += meta.montantNetHT;
      }
      recordCount++;
    }
    
    // Construire le résultat sous forme de tableau
    const result: Array<{ mois: string; apporteurs: number; particuliers: number }> = [];
    
    // Ordre des mois selon la période
    const orderedMonths = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    
    for (const mois of orderedMonths) {
      const data = byMonth.get(mois);
      if (data) {
        result.push({ mois, ...data });
      }
    }
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount,
      },
      breakdown: {
        totalApporteurs: result.reduce((s, r) => s + r.apporteurs, 0),
        totalParticuliers: result.reduce((s, r) => s + r.particuliers, 0),
        monthCount: result.length,
      }
    };
  }
};

// ==================== NOUVELLES MÉTRIQUES APPORTEURS V2 ====================

/**
 * Dû Global TTC Apporteurs
 * Montant TTC restant à encaisser sur les factures AVEC apporteur uniquement
 * Règle: exclure factures sans apporteur, calculer reste = TTC - paiements
 */
export const apporteursDuGlobalTtc: StatDefinition = {
  id: 'apporteurs_du_global_ttc',
  label: 'Dû Global TTC Apporteurs',
  description: 'Montant TTC restant à encaisser sur les factures avec apporteur',
  category: 'apporteur',
  source: ['factures', 'projects', 'clients'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    
    const projectsById = indexProjectsById(projects);
    let totalDu = 0;
    let recordCount = 0;
    const details: Array<{ ref: string; projectRef: string; restantTTC: number }> = [];
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      // Exclure les avoirs
      if (meta.isAvoir) continue;
      
      // Filtrer par date
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      // Vérifier que la facture a un apporteur (via le projet)
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(projectId) : null;
      const apporteurId = project?.data?.commanditaireId || project?.commanditaireId;
      
      // EXCLUSION: factures sans apporteur
      if (!apporteurId) continue;
      
      // Calculer le montant TTC de la facture
      const totalTTC = facture.totalTTC || facture.data?.totalTTC || 
        (meta.montantBrutHT * 1.2); // fallback TVA 20%
      
      // Calculer le montant déjà payé TTC
      const payments = facture.payments || facture.data?.payments || [];
      const paidTTC = Array.isArray(payments) 
        ? payments.reduce((sum: number, p: any) => sum + (p.amount || p.montant || 0), 0)
        : 0;
      
      // Calculer le reste à payer
      const restantDu = Math.max(totalTTC - paidTTC, 0);
      
      // Ne compter que les factures avec un reste > 0
      if (restantDu > 0) {
        totalDu += restantDu;
        recordCount++;
        
        if (details.length < 20) { // garder les 20 premiers pour debug
          details.push({
            ref: facture.reference || facture.ref || `F-${facture.id}`,
            projectRef: project?.ref || projectId || 'N/A',
            restantTTC: restantDu,
          });
        }
      }
    }
    
    return {
      value: totalDu,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount,
      },
      breakdown: {
        totalDuTTC: totalDu,
        nbFacturesAvecReste: recordCount,
        details,
      }
    };
  }
};

/**
 * Délai Paiement Moyen Apporteurs
 * Délai moyen entre date facture et date du dernier règlement (factures payées uniquement)
 */
export const apporteursDelaiPaiementMoyen: StatDefinition = {
  id: 'apporteurs_delai_paiement_moyen',
  label: 'Délai Paiement Moyen',
  description: 'Délai moyen en jours entre facturation et dernier règlement (factures payées avec apporteur)',
  category: 'apporteur',
  source: ['factures', 'projects'],
  aggregation: 'avg',
  unit: 'j',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    
    const projectsById = indexProjectsById(projects);
    const delais: number[] = [];
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      // Exclure les avoirs
      if (meta.isAvoir) continue;
      
      // Filtrer par date
      const dateFacture = meta.date ? new Date(meta.date) : null;
      if (!dateFacture || dateFacture < params.dateRange.start || dateFacture > params.dateRange.end) continue;
      
      // Vérifier que la facture a un apporteur
      const projectId = facture.projectId || facture.project_id;
      const project = projectId ? projectsById.get(projectId) : null;
      const apporteurId = project?.data?.commanditaireId || project?.commanditaireId;
      
      // EXCLUSION: factures sans apporteur
      if (!apporteurId) continue;
      
      // Calculer TTC et payé
      const totalTTC = facture.totalTTC || facture.data?.totalTTC || (meta.montantBrutHT * 1.2);
      const payments = facture.payments || facture.data?.payments || [];
      
      if (!Array.isArray(payments) || payments.length === 0) continue;
      
      const paidTTC = payments.reduce((sum: number, p: any) => sum + (p.amount || p.montant || 0), 0);
      const restantDu = Math.max(totalTTC - paidTTC, 0);
      
      // Ne garder que les factures ENTIÈREMENT payées (reste = 0)
      if (restantDu > 0) continue;
      
      // Trouver la date du DERNIER règlement
      let dateDernierReglement: Date | null = null;
      for (const p of payments) {
        const pDate = p.date || p.dateReglement || p.created_at;
        if (pDate) {
          try {
            const parsed = new Date(pDate);
            if (!dateDernierReglement || parsed > dateDernierReglement) {
              dateDernierReglement = parsed;
            }
          } catch { continue; }
        }
      }
      
      if (!dateDernierReglement) continue;
      
      // Calculer le délai en jours
      const diffMs = dateDernierReglement.getTime() - dateFacture.getTime();
      const delaiJours = Math.round(diffMs / (1000 * 60 * 60 * 24));
      
      if (delaiJours >= 0) {
        delais.push(delaiJours);
      }
    }
    
    const moyenneDelai = delais.length > 0 
      ? delais.reduce((s, d) => s + d, 0) / delais.length 
      : 0;
    
    return {
      value: Math.round(moyenneDelai * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: delais.length,
      },
      breakdown: {
        nbFacturesPayees: delais.length,
        delaiMin: delais.length > 0 ? Math.min(...delais) : 0,
        delaiMax: delais.length > 0 ? Math.max(...delais) : 0,
        delaiMedian: delais.length > 0 ? delais.sort((a, b) => a - b)[Math.floor(delais.length / 2)] : 0,
      }
    };
  }
};

/**
 * Délai Moyen Dossier → Facture Apporteurs
 * Délai moyen entre création du dossier et sa première facture (apporteurs uniquement)
 */
export const apporteursDelaiDossierFacture: StatDefinition = {
  id: 'apporteurs_delai_dossier_facture',
  label: 'Délai Dossier → Facture',
  description: 'Délai moyen entre création dossier et première facture (apporteurs uniquement)',
  category: 'apporteur',
  source: ['factures', 'projects'],
  aggregation: 'avg',
  unit: 'j',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    
    // Indexer les projets AVEC apporteur et leur date de création
    const projectsWithApporteur = new Map<string, { dateCreation: Date; ref: string }>();
    
    for (const project of projects) {
      const apporteurId = project.data?.commanditaireId || project.commanditaireId;
      if (!apporteurId) continue; // EXCLUSION: dossiers sans apporteur
      
      const dateCreationStr = project.created_at || project.date;
      if (!dateCreationStr) continue;
      
      try {
        const dateCreation = new Date(dateCreationStr);
        
        // Filtre période sur date création dossier
        if (dateCreation < params.dateRange.start || dateCreation > params.dateRange.end) continue;
        
        projectsWithApporteur.set(String(project.id), {
          dateCreation,
          ref: project.ref || `P-${project.id}`,
        });
      } catch { continue; }
    }
    
    // Pour chaque projet, trouver la date de sa PREMIÈRE facture
    const factureDatesByProject = new Map<string, Date>();
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (meta.isAvoir) continue;
      
      const projectId = String(facture.projectId || facture.project_id || '');
      if (!projectId || !projectsWithApporteur.has(projectId)) continue;
      
      const dateFacture = meta.date ? new Date(meta.date) : null;
      if (!dateFacture) continue;
      
      const currentMin = factureDatesByProject.get(projectId);
      if (!currentMin || dateFacture < currentMin) {
        factureDatesByProject.set(projectId, dateFacture);
      }
    }
    
    // Calculer les délais
    const delais: number[] = [];
    
    projectsWithApporteur.forEach((projectInfo, projectId) => {
      const datePremiereFacture = factureDatesByProject.get(projectId);
      if (!datePremiereFacture) return; // pas de facture pour ce dossier
      
      const diffMs = datePremiereFacture.getTime() - projectInfo.dateCreation.getTime();
      const delaiJours = Math.round(diffMs / (1000 * 60 * 60 * 24));
      
      if (delaiJours >= 0) {
        delais.push(delaiJours);
      }
    });
    
    const moyenneDelai = delais.length > 0 
      ? delais.reduce((s, d) => s + d, 0) / delais.length 
      : 0;
    
    return {
      value: Math.round(moyenneDelai * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: delais.length,
      },
      breakdown: {
        nbDossiersAvecFacture: delais.length,
        nbDossiersSansFacture: projectsWithApporteur.size - delais.length,
        delaiMin: delais.length > 0 ? Math.min(...delais) : 0,
        delaiMax: delais.length > 0 ? Math.max(...delais) : 0,
        delaiMedian: delais.length > 0 ? delais.sort((a, b) => a - b)[Math.floor(delais.length / 2)] : 0,
      }
    };
  }
};

// ==================== EXPORTS ====================

export const apporteursDefinitions = {
  // Par apporteur (existant)
  ca_par_apporteur: caParApporteur,
  dossiers_par_apporteur: dossiersParApporteur,
  top_apporteurs_ca: topApporteursCA,
  taux_transformation_apporteur: tauxTransformationApporteur,
  apporteurs_inactifs: apporteursInactifs,
  // Par TYPE d'apporteur
  ca_par_type_apporteur: caParTypeApporteur,
  dossiers_par_type_apporteur: dossiersParTypeApporteur,
  panier_moyen_par_type_apporteur: panierMoyenParTypeApporteur,
  taux_transfo_par_type_apporteur: tauxTransfoParTypeApporteur,
  taux_sav_par_type_apporteur: tauxSavParTypeApporteur,
  // Segmentation temporelle
  ca_mensuel_segmente: caMensuelSegmente,
  // V2: Nouvelles métriques apporteurs
  apporteurs_du_global_ttc: apporteursDuGlobalTtc,
  apporteurs_delai_paiement_moyen: apporteursDelaiPaiementMoyen,
  apporteurs_delai_dossier_facture: apporteursDelaiDossierFacture,
};
