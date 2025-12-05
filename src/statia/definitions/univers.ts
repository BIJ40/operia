/**
 * StatIA V1 - Définitions des métriques par Univers
 * 
 * LOGIQUE SIMPLE basée sur factures + projects:
 * - Même extraction d'univers que technicienUniversEngine
 * - Mais inclut TOUTES les factures (pas de filtre par temps productif)
 * - 'non-classe' si aucun univers exploitable
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { 
  normalizeUniversSlug, 
  isFactureStateIncluded
} from '../engine/normalizers';
import { extractFactureMeta } from '../rules/rules';
import { indexProjectsById } from '../engine/loaders';

// Univers à exclure (identique au moteur technicien)
const EXCLUDED_UNIVERSES = new Set([
  'mobilier',
  'travaux_xterieurs',
  'travaux_exterieurs',
]);

/**
 * Extrait et normalise les univers d'un projet
 * MÊME LOGIQUE que technicienUniversEngine (lignes 262-270)
 */
function extractUniversesFromProject(project: any): string[] {
  if (!project) return [];
  
  // Même ordre de lecture que technicienUniversEngine
  const universesRaw: string[] = 
    project.data?.universes || 
    project.data?.univers || 
    project.universes || 
    project.univers || 
    [];
  
  // Normaliser et filtrer les univers exclus
  return universesRaw
    .map((u: string) => normalizeUniversSlug(u))
    .filter((u: string) => !EXCLUDED_UNIVERSES.has(u));
}

/**
 * DEBUG - Comptage brut des factures
 * Pour diagnostic : vérifie que StatIA reçoit des factures
 */
export const debugFacturesCount: StatDefinition = {
  id: 'debug_factures_count',
  label: 'DEBUG – Nombre de factures',
  description: 'Diagnostic: nombre de factures chargées et traitées',
  category: 'ca',
  source: ['factures', 'projects'],
  dimensions: [],
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    const projectsById = indexProjectsById(projects);
    
    let nbTotal = factures.length;
    let nbAvecDate = 0;
    let nbDansPeriode = 0;
    let nbStateOk = 0;
    let nbMontantOk = 0;
    let nbAvecProject = 0;
    let nbAvecUnivers = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      // Check date
      if (meta.date) nbAvecDate++;
      
      // Check period
      if (params.dateRange && meta.date) {
        if (meta.date >= params.dateRange.start && meta.date <= params.dateRange.end) {
          nbDansPeriode++;
        }
      } else if (!params.dateRange) {
        nbDansPeriode++;
      }
      
      // Check state
      if (isFactureStateIncluded(facture.state)) nbStateOk++;
      
      // Check montant
      if (meta.montantNetHT !== 0) nbMontantOk++;
      
      // Check project join
      const projectIdRaw = facture.projectId || facture.project_id || facture.data?.projectId;
      const projectId = projectIdRaw ? String(projectIdRaw) : null;
      const project = projectId ? (projectsById.get(projectId) || projectsById.get(Number(projectId))) : null;
      if (project) nbAvecProject++;
      
      // Check univers
      if (project) {
        const universes = extractUniversesFromProject(project);
        if (universes.length > 0) nbAvecUnivers++;
      }
    }
    
    return {
      value: {
        nbFacturesTotal: nbTotal,
        nbProjectsCharges: projects.length,
        nbAvecDate,
        nbDansPeriode,
        nbStateOk,
        nbMontantOk,
        nbAvecProjectJoin: nbAvecProject,
        nbAvecUniversExploitable: nbAvecUnivers,
      },
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: nbTotal,
      },
    };
  }
};

/**
 * CA par Univers
 * 
 * RÈGLES:
 * - Source: factures + projects
 * - Filtre: isFactureStateIncluded + dateRange
 * - Univers: extractUniversesFromProject (même logique que technicienUniversEngine)
 * - Si multi-univers: CA réparti au prorata
 * - Si aucun univers: classé dans 'non-classe'
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
    let nbFacturesTraitees = 0;
    
    // DEBUG: log pour comprendre
    console.log('[StatIA ca_par_univers] factures:', factures.length, 'projects:', projects.length);
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      // RÈGLE: Exclure états invalides
      if (!isFactureStateIncluded(facture.state)) continue;
      
      // RÈGLE: Ignorer montants nuls
      if (meta.montantNetHT === 0) continue;
      
      // RÈGLE: Filtre période (si définie) - mais si pas de date, on inclut quand même
      if (params.dateRange && meta.date) {
        if (meta.date < params.dateRange.start || meta.date > params.dateRange.end) continue;
      }
      
      const projectIdRaw = facture.projectId || facture.project_id || facture.data?.projectId;
      const projectId = projectIdRaw ? String(projectIdRaw) : null;
      const project = projectId ? (projectsById.get(projectId) || projectsById.get(Number(projectId))) : null;
      
      // Extraire univers (même logique que technicienUniversEngine)
      const universes = extractUniversesFromProject(project);
      
      // Si pas d'univers exploitable → 'non-classe'
      const finalUniverses = universes.length > 0 ? universes : ['non-classe'];
      
      // RÈGLE: CA réparti au prorata entre univers
      const montantParUnivers = meta.montantNetHT / finalUniverses.length;
      
      for (const univers of finalUniverses) {
        byUnivers[univers] = (byUnivers[univers] || 0) + montantParUnivers;
      }
      
      totalCA += meta.montantNetHT;
      nbFacturesTraitees++;
    }
    
    console.log('[StatIA ca_par_univers] traites:', nbFacturesTraitees, 'CA total:', totalCA, 'univers:', Object.keys(byUnivers));
    
    // Arrondir les valeurs
    for (const key of Object.keys(byUnivers)) {
      byUnivers[key] = Math.round(byUnivers[key] * 100) / 100;
    }
    
    return {
      value: byUnivers,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: nbFacturesTraitees,
      },
      breakdown: {
        total: Math.round(totalCA * 100) / 100,
        universCount: Object.keys(byUnivers).length,
      }
    };
  }
};

/**
 * Nombre de dossiers par Univers
 * 
 * RÈGLES:
 * - Source: projects
 * - Filtre: dateRange sur date création
 * - 1 dossier compté par univers (pas de prorata)
 * - Si aucun univers: classé dans 'non-classe'
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
      // Filtrer par date de création si dateRange défini
      if (params.dateRange) {
        const dateStr = project.date || project.created_at;
        if (dateStr) {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) continue;
          if (date < params.dateRange.start || date > params.dateRange.end) continue;
        }
      }
      
      const universes = extractUniversesFromProject(project);
      
      // Si pas d'univers → 'non-classe'
      const finalUniverses = universes.length > 0 ? universes : ['non-classe'];
      
      // RÈGLE: 1 dossier par univers (pas de prorata pour le count)
      for (const univers of finalUniverses) {
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
 * 
 * RÈGLES:
 * - Source: factures + projects
 * - Panier = CA univers / nb factures univers
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
    const nbFacturesParUnivers: Record<string, number> = {};
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      // RÈGLE: Exclure états invalides
      if (!isFactureStateIncluded(facture.state)) continue;
      
      // RÈGLE: Ignorer montants nuls
      if (meta.montantNetHT === 0) continue;
      
      // RÈGLE: Filtre période
      if (params.dateRange && meta.date) {
        if (meta.date < params.dateRange.start || meta.date > params.dateRange.end) continue;
      }
      
      const projectIdRaw = facture.projectId || facture.project_id || facture.data?.projectId;
      const projectId = projectIdRaw ? String(projectIdRaw) : null;
      const project = projectId ? (projectsById.get(projectId) || projectsById.get(Number(projectId))) : null;
      
      const universes = extractUniversesFromProject(project);
      const finalUniverses = universes.length > 0 ? universes : ['non-classe'];
      
      // CA réparti au prorata
      const montantParUnivers = meta.montantNetHT / finalUniverses.length;
      
      for (const univers of finalUniverses) {
        caByUnivers[univers] = (caByUnivers[univers] || 0) + montantParUnivers;
        nbFacturesParUnivers[univers] = (nbFacturesParUnivers[univers] || 0) + 1;
      }
    }
    
    // Calculer panier moyen
    const avgByUnivers: Record<string, number> = {};
    for (const univers of Object.keys(caByUnivers)) {
      const nb = nbFacturesParUnivers[univers] || 1;
      avgByUnivers[univers] = Math.round((caByUnivers[univers] / nb) * 100) / 100;
    }
    
    return {
      value: avgByUnivers,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: Object.values(nbFacturesParUnivers).reduce((a, b) => a + b, 0),
      },
      breakdown: {
        caByUnivers,
        nbFacturesParUnivers,
      }
    };
  }
};

export const universDefinitions = {
  debug_factures_count: debugFacturesCount,
  ca_par_univers: caParUnivers,
  dossiers_par_univers: dossiersParUnivers,
  panier_moyen_par_univers: panierMoyenParUnivers,
};
