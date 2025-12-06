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

/**
 * Nombre d'interventions par Univers
 */
export const interventionsParUnivers: StatDefinition = {
  id: 'interventions_par_univers',
  label: 'Interventions par Univers',
  description: 'Nombre d\'interventions ventilé par univers métier',
  category: 'univers',
  source: ['interventions', 'projects'],
  dimensions: ['univers'],
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, projects } = data;
    
    const projectsById = indexProjectsById(projects);
    const byUnivers: Record<string, number> = {};
    let totalCount = 0;
    
    for (const intervention of interventions || []) {
      // Filtrer états invalides
      const state = intervention.state?.toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'draft') continue;
      
      // Filtrer par date
      if (params.dateRange) {
        const dateStr = intervention.date || intervention.created_at;
        if (dateStr) {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) continue;
          if (date < params.dateRange.start || date > params.dateRange.end) continue;
        }
      }
      
      const projectId = intervention.projectId || intervention.project_id;
      const project = projectId ? (projectsById.get(String(projectId)) || projectsById.get(Number(projectId))) : null;
      
      const universes = extractUniversesFromProject(project);
      const finalUniverses = universes.length > 0 ? universes : ['non-classe'];
      
      for (const univers of finalUniverses) {
        byUnivers[univers] = (byUnivers[univers] || 0) + 1;
      }
      
      totalCount++;
    }
    
    return {
      value: byUnivers,
      metadata: {
        computedAt: new Date(),
        source: 'interventions',
        recordCount: totalCount,
      },
      breakdown: { total: totalCount }
    };
  }
};

/**
 * Taux SAV par Univers
 */
export const tauxSavParUnivers: StatDefinition = {
  id: 'taux_sav_par_univers',
  label: 'Taux SAV par Univers',
  description: 'Pourcentage de dossiers avec SAV par univers',
  category: 'univers',
  source: ['projects', 'interventions'],
  dimensions: ['univers'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, interventions } = data;
    
    // Identifier projets SAV via interventions
    const projectHasSav: Record<string, boolean> = {};
    
    for (const interv of interventions || []) {
      const pictos = interv.data?.pictosInterv ?? [];
      const type2 = interv.data?.type2 ?? null;
      
      if (pictos.includes('SAV') || type2 === 'SAV') {
        const pid = interv.projectId || interv.project_id;
        if (pid) projectHasSav[String(pid)] = true;
      }
    }
    
    // Identifier projets SAV via flags projet
    for (const p of projects) {
      const picto = p.data?.pictoInterv ?? [];
      const sinistre = p.data?.sinistre ?? null;
      if (picto.includes('SAV') || sinistre === 'SAV') {
        projectHasSav[String(p.id)] = true;
      }
    }
    
    // Compter par univers
    const totalByUnivers: Record<string, number> = {};
    const savByUnivers: Record<string, number> = {};
    
    for (const project of projects) {
      // Filtrer par date
      if (params.dateRange) {
        const dateStr = project.date || project.created_at;
        if (dateStr) {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) continue;
          if (date < params.dateRange.start || date > params.dateRange.end) continue;
        }
      }
      
      const universes = extractUniversesFromProject(project);
      const finalUniverses = universes.length > 0 ? universes : ['non-classe'];
      
      for (const univers of finalUniverses) {
        totalByUnivers[univers] = (totalByUnivers[univers] || 0) + 1;
        
        if (projectHasSav[String(project.id)]) {
          savByUnivers[univers] = (savByUnivers[univers] || 0) + 1;
        }
      }
    }
    
    // Calculer taux
    const tauxByUnivers: Record<string, number> = {};
    for (const univers of Object.keys(totalByUnivers)) {
      const total = totalByUnivers[univers] || 1;
      const sav = savByUnivers[univers] || 0;
      tauxByUnivers[univers] = Math.round((sav / total) * 1000) / 10;
    }
    
    return {
      value: tauxByUnivers,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: Object.values(totalByUnivers).reduce((a, b) => a + b, 0),
      },
      breakdown: { totalByUnivers, savByUnivers }
    };
  }
};

/**
 * CA Mensuel par Univers (pour graphique empilé)
 */
export const caMensuelParUnivers: StatDefinition = {
  id: 'ca_mensuel_par_univers',
  label: 'CA Mensuel par Univers',
  description: 'Évolution mensuelle du CA ventilé par univers',
  category: 'univers',
  source: ['factures', 'projects'],
  dimensions: ['univers', 'mois'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    
    const projectsById = indexProjectsById(projects);
    const byMonthAndUnivers: Record<string, Record<string, number>> = {};
    let totalCA = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      if (!isFactureStateIncluded(facture.state)) continue;
      if (meta.montantNetHT === 0) continue;
      
      if (params.dateRange && meta.date) {
        if (meta.date < params.dateRange.start || meta.date > params.dateRange.end) continue;
      }
      
      const monthKey = meta.date 
        ? meta.date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        : 'inconnu';
      
      const projectIdRaw = facture.projectId || facture.project_id || facture.data?.projectId;
      const projectId = projectIdRaw ? String(projectIdRaw) : null;
      const project = projectId ? (projectsById.get(projectId) || projectsById.get(Number(projectId))) : null;
      
      const universes = extractUniversesFromProject(project);
      const finalUniverses = universes.length > 0 ? universes : ['non-classe'];
      
      const montantParUnivers = meta.montantNetHT / finalUniverses.length;
      
      if (!byMonthAndUnivers[monthKey]) {
        byMonthAndUnivers[monthKey] = {};
      }
      
      for (const univers of finalUniverses) {
        byMonthAndUnivers[monthKey][univers] = (byMonthAndUnivers[monthKey][univers] || 0) + montantParUnivers;
      }
      
      totalCA += meta.montantNetHT;
    }
    
    // Convertir en tableau pour le graphique
    const monthlyData = Object.entries(byMonthAndUnivers).map(([month, univers]) => ({
      month,
      ...univers
    }));
    
    return {
      value: monthlyData,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: factures.length,
      },
      breakdown: { total: totalCA }
    };
  }
};

/**
 * Taux Transformation par Univers
 */
export const tauxTransfoParUnivers: StatDefinition = {
  id: 'taux_transfo_par_univers',
  label: 'Taux Transformation par Univers',
  description: 'Ratio CA facturé / CA devisé par univers',
  category: 'univers',
  source: ['devis', 'factures', 'projects'],
  dimensions: ['univers'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis, factures, projects } = data;
    
    const projectsById = indexProjectsById(projects);
    const acceptedStates = ['order', 'invoice', 'validated', 'signed', 'accepted'];
    
    // Étape 1: Identifier projets avec devis accepté
    const projectsWithAcceptedQuote = new Set<string>();
    const acceptedQuotesByProject = new Map<string, any[]>();
    
    for (const d of devis || []) {
      if (!acceptedStates.includes(d.state)) continue;
      
      if (params.dateRange) {
        const dateStr = d.dateReelle || d.date;
        if (dateStr) {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) continue;
          if (date < params.dateRange.start || date > params.dateRange.end) continue;
        }
      }
      
      const pid = String(d.projectId || d.project_id);
      projectsWithAcceptedQuote.add(pid);
      
      const list = acceptedQuotesByProject.get(pid) ?? [];
      list.push(d);
      acceptedQuotesByProject.set(pid, list);
    }
    
    // Étape 2: CA Devis par univers
    const caDevisByUnivers: Record<string, number> = {};
    const caFacturesByUnivers: Record<string, number> = {};
    
    for (const pid of projectsWithAcceptedQuote) {
      const project = projectsById.get(pid) || projectsById.get(Number(pid));
      if (!project) continue;
      
      const universes = extractUniversesFromProject(project);
      const finalUniverses = universes.length > 0 ? universes : ['non-classe'];
      
      const devisList = acceptedQuotesByProject.get(pid) ?? [];
      let totalDevis = 0;
      for (const d of devisList) {
        totalDevis += Number(d.data?.totalHT || d.totalHT || 0);
      }
      
      for (const univers of finalUniverses) {
        caDevisByUnivers[univers] = (caDevisByUnivers[univers] || 0) + (totalDevis / finalUniverses.length);
      }
    }
    
    // Étape 3: CA Factures par univers (uniquement projets avec devis accepté)
    for (const f of factures) {
      const meta = extractFactureMeta(f);
      if (!isFactureStateIncluded(f.state)) continue;
      if (f.data?.type === 'avoir') continue;
      
      const pid = String(f.projectId || f.project_id || f.data?.projectId);
      if (!projectsWithAcceptedQuote.has(pid)) continue;
      
      if (params.dateRange && meta.date) {
        if (meta.date < params.dateRange.start || meta.date > params.dateRange.end) continue;
      }
      
      const project = projectsById.get(pid) || projectsById.get(Number(pid));
      const universes = extractUniversesFromProject(project);
      const finalUniverses = universes.length > 0 ? universes : ['non-classe'];
      
      for (const univers of finalUniverses) {
        caFacturesByUnivers[univers] = (caFacturesByUnivers[univers] || 0) + (meta.montantNetHT / finalUniverses.length);
      }
    }
    
    // Étape 4: Calculer taux
    const result: Record<string, { caDevis: number; caFactures: number; tauxTransfo: number }> = {};
    const allUniverses = new Set([...Object.keys(caDevisByUnivers), ...Object.keys(caFacturesByUnivers)]);
    
    for (const univers of allUniverses) {
      const caDevis = caDevisByUnivers[univers] || 0;
      const caFactures = caFacturesByUnivers[univers] || 0;
      const taux = caDevis > 0 ? Math.min((caFactures / caDevis) * 100, 100) : 0;
      
      result[univers] = {
        caDevis: Math.round(caDevis * 100) / 100,
        caFactures: Math.round(caFactures * 100) / 100,
        tauxTransfo: Math.round(taux * 10) / 10
      };
    }
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'devis',
        recordCount: projectsWithAcceptedQuote.size,
      }
    };
  }
};

/**
 * Matrice Univers × Apporteur
 */
export const matrixUniversApporteur: StatDefinition = {
  id: 'matrix_univers_apporteur',
  label: 'Matrice Univers × Apporteur',
  description: 'Performance croisée univers et type d\'apporteur',
  category: 'univers',
  source: ['factures', 'projects', 'clients'],
  dimensions: ['univers', 'apporteur'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, clients } = data;
    
    const projectsById = indexProjectsById(projects);
    const clientsById = new Map<string, any>();
    for (const c of clients || []) {
      clientsById.set(String(c.id), c);
      clientsById.set(String(Number(c.id)), c);
    }
    
    const matrix: Record<string, Record<string, { ca: number; nbDossiers: Set<string> }>> = {};
    
    for (const f of factures) {
      const meta = extractFactureMeta(f);
      if (!isFactureStateIncluded(f.state)) continue;
      if (meta.montantNetHT === 0) continue;
      
      if (params.dateRange && meta.date) {
        if (meta.date < params.dateRange.start || meta.date > params.dateRange.end) continue;
      }
      
      const projectIdRaw = f.projectId || f.project_id || f.data?.projectId;
      const projectId = projectIdRaw ? String(projectIdRaw) : null;
      const project = projectId ? (projectsById.get(projectId) || projectsById.get(Number(projectId))) : null;
      
      const universes = extractUniversesFromProject(project);
      const finalUniverses = universes.length > 0 ? universes : ['non-classe'];
      
      // Déterminer type apporteur
      const commanditaireId = f.data?.commanditaireId || project?.data?.commanditaireId;
      let typeApporteur = 'particulier';
      
      if (commanditaireId) {
        const client = clientsById.get(String(commanditaireId));
        if (client) {
          typeApporteur = client.data?.type || client.type || 'particulier';
        }
      }
      
      const montantParUnivers = meta.montantNetHT / finalUniverses.length;
      
      for (const univers of finalUniverses) {
        if (!matrix[univers]) matrix[univers] = {};
        if (!matrix[univers][typeApporteur]) {
          matrix[univers][typeApporteur] = { ca: 0, nbDossiers: new Set() };
        }
        
        matrix[univers][typeApporteur].ca += montantParUnivers;
        if (projectId) matrix[univers][typeApporteur].nbDossiers.add(projectId);
      }
    }
    
    // Convertir Sets en nombres
    const result: Record<string, Record<string, { ca: number; nbDossiers: number }>> = {};
    for (const univers of Object.keys(matrix)) {
      result[univers] = {};
      for (const type of Object.keys(matrix[univers])) {
        result[univers][type] = {
          ca: Math.round(matrix[univers][type].ca * 100) / 100,
          nbDossiers: matrix[univers][type].nbDossiers.size
        };
      }
    }
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: factures.length,
      }
    };
  }
};

export const universDefinitions = {
  debug_factures_count: debugFacturesCount,
  ca_par_univers: caParUnivers,
  dossiers_par_univers: dossiersParUnivers,
  panier_moyen_par_univers: panierMoyenParUnivers,
  interventions_par_univers: interventionsParUnivers,
  taux_sav_par_univers: tauxSavParUnivers,
  ca_mensuel_par_univers: caMensuelParUnivers,
  taux_transfo_par_univers: tauxTransfoParUnivers,
  matrix_univers_apporteur: matrixUniversApporteur,
};
