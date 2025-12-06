/**
 * StatIA V2 - Engine pour le Dashboard Réseau Franchiseur
 * Orchestre le calcul de toutes les métriques du dashboard réseau
 */

import { startOfYear, endOfYear, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { NetworkDataService } from '@/franchiseur/services/networkDataService';
import { extractFactureMeta } from '../rules/rules';
import { 
  isFactureStateIncluded, 
  parseDateSafe, 
  isInterventionRealisee as isInterventionRealiseeNorm,
  isSAVIntervention as isSAVInterventionNorm,
  MONTHS_FR 
} from '../engine/normalizers';
import { logNetwork } from '@/lib/logger';

// P2-01: Debug conditionnel
const DEBUG_STATIA = import.meta.env.DEV && import.meta.env.VITE_DEBUG_STATIA === 'true';
function debugLog(message: string, data?: any) {
  if (DEBUG_STATIA) {
    console.log(`[StatIA] ${message}`, data || '');
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface ReseauDashboardParams {
  dateStart: Date;
  dateEnd: Date;
  scopeAgences?: string[]; // IDs des agences sélectionnées (vide = toutes)
}

export interface ReseauDashboardData {
  tuilesHautes: {
    caAnneeEnCours: number;
    caPeriode: number;
    dossiersPeriode: number;
    interventionsPeriode: number;
    redevancesMois: number;
    delaiMoyenTraitement: number;
    tauxOneShot: number;
    delaiDossierDevis: number | null;
    visitesParDossier: number;
    tauxMultiUnivers: number;
  };
  blocSav: {
    tauxSavGlobalReseau: number;
    nbSavGlobal: number;
    nbDossiersBaseSav: number;
    tauxSavMoyenAgences: number;
    serieTauxSavMensuel: Array<{ month: string; tauxSAV: number }>;
  };
  blocCA: {
    serieCAMensuel: Array<{ month: string; ca: number }>;
    partCAParAgence: Array<{ agencyLabel: string; ca: number; percentage: number }>;
    top5AgencesCA: Array<{ agencyId: string; agencyLabel: string; ca: number; rank: number }>;
  };
  blocApporteurs: {
    top3ApporteursCA: Array<{ name: string; ca: number; nbDossiers: number; rank: number }>;
  };
}

interface AgencyData {
  agencyId: string;
  agencyLabel: string;
  data: {
    factures: any[];
    projects: any[];
    interventions: any[];
    devis: any[];
    clients: any[];
  } | null;
}

// ============================================================================
// HELPERS (utilisent les normalizers centralisés)
// ============================================================================

function parseDate(dateString: string | undefined | null): Date | null {
  return parseDateSafe(dateString);
}

function isInterventionRealisee(intervention: any): boolean {
  return isInterventionRealiseeNorm(intervention);
}

function isSAVIntervention(intervention: any): boolean {
  return isSAVInterventionNorm(intervention);
}

// ============================================================================
// ENGINE PRINCIPAL
// ============================================================================

export async function computeReseauDashboard(params: ReseauDashboardParams): Promise<ReseauDashboardData> {
  debugLog('computeReseauDashboard - START', { 
    params,
    scopeAgencesLength: params.scopeAgences?.length,
    scopeAgencesValue: params.scopeAgences 
  });
  logNetwork.info('[StatIA] computeReseauDashboard - START', { params });
  
  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);
  
  // 1. Charger les agences
  const { data: agencies, error: agenciesError } = await supabase
    .from('apogee_agencies')
    .select('id, slug, label')
    .eq('is_active', true);
  
  debugLog('Agences chargées depuis Supabase:', {
    count: agencies?.length,
    error: agenciesError
  });
  
  if (agenciesError || !agencies?.length) {
    logNetwork.error('[StatIA] Erreur chargement agences', agenciesError);
    return getEmptyDashboard();
  }
  
  // 2. Filtrer par scope si nécessaire
  const filteredAgencies = params.scopeAgences?.length
    ? agencies.filter(a => params.scopeAgences!.includes(a.id))
    : agencies;
  
  debugLog('Agences après filtrage:', {
    filteredCount: filteredAgencies.length,
    agencies: filteredAgencies.map(a => a.slug),
  });
  
  logNetwork.debug(`[StatIA] Chargement de ${filteredAgencies.length} agences...`);
  
  // 3. Charger les données de chaque agence EN PARALLÈLE
  debugLog('Chargement PARALLÈLE des agences...', {
    count: filteredAgencies.length,
    agencies: filteredAgencies.map(a => a.slug)
  });
  
  const loadPromises = filteredAgencies.map(async (agency) => {
    try {
      debugLog(`Chargement agence: ${agency.slug}...`);
      const data = await NetworkDataService.loadAgencyData(agency.slug);
      
      if (data) {
        debugLog(`✅ ${agency.slug} chargée:`, {
          factures: data.factures?.length || 0,
          projects: data.projects?.length || 0,
          interventions: data.interventions?.length || 0,
        });
        return {
          agencyId: agency.slug,
          agencyLabel: agency.label,
          data,
          success: true,
        };
      } else {
        debugLog(`⚠️ ${agency.slug} retourne null`);
        return { agencyId: agency.slug, agencyLabel: agency.label, data: null, success: false };
      }
    } catch (err) {
      logNetwork.warn(`[StatIA] Erreur chargement ${agency.slug}`, err);
      return { agencyId: agency.slug, agencyLabel: agency.label, data: null, success: false };
    }
  });
  
  const results = await Promise.all(loadPromises);
  
  // Filtrer et mapper correctement vers AgencyData[]
  const agencyData: AgencyData[] = results
    .filter(r => r.success && r.data)
    .map(r => ({
      agencyId: r.agencyId,
      agencyLabel: r.agencyLabel,
      data: r.data!,
    }));
  const failedAgencies = results.filter(r => !r.success).map(r => r.agencyId);
  
  debugLog('Résumé chargement PARALLÈLE:', {
    total: filteredAgencies.length,
    success: agencyData.length,
    failed: failedAgencies.length,
    failedList: failedAgencies,
    loadedAgencies: agencyData.map(a => a.agencyId),
  });
  
  logNetwork.info(`[StatIA] ${agencyData.length} agences chargées`);
  
  // 4. Agréger toutes les données - avec vérification Array.isArray
  const allFactures: any[] = [];
  const allProjects: any[] = [];
  const allInterventions: any[] = [];
  const allDevis: any[] = [];
  const allClients: any[] = [];
  
  for (const agency of agencyData) {
    if (agency.data) {
      const factures = agency.data.factures;
      const projects = agency.data.projects;
      const interventions = agency.data.interventions;
      const devis = agency.data.devis;
      const clients = agency.data.clients;
      
      if (Array.isArray(factures)) allFactures.push(...factures);
      if (Array.isArray(projects)) allProjects.push(...projects);
      if (Array.isArray(interventions)) allInterventions.push(...interventions);
      if (Array.isArray(devis)) allDevis.push(...devis);
      if (Array.isArray(clients)) allClients.push(...clients);
    }
  }
  
  debugLog('Données agrégées:', {
    factures: allFactures.length,
    projects: allProjects.length,
    interventions: allInterventions.length,
    devis: allDevis.length,
    clients: allClients.length,
  });
  
  // 5. Calculer les métriques
  const tuilesHautes = computeTuilesHautes(allFactures, allProjects, allInterventions, allDevis, params, yearStart, yearEnd);
  const blocSav = computeBlocSav(allProjects, allInterventions, params, agencyData);
  const blocCA = computeBlocCA(allFactures, agencyData, params, yearStart, yearEnd);
  const blocApporteurs = computeBlocApporteurs(allFactures, allProjects, allClients, params);
  
  // P1-03: Assertion de cohérence sum(CA agences) vs CA réseau
  if (process.env.NODE_ENV === 'development' || import.meta.env.DEV) {
    const sumAgencyCA = blocCA.partCAParAgence.reduce((sum, a) => sum + a.ca, 0);
    const networkCA = tuilesHautes.caAnneeEnCours;
    const delta = Math.abs(networkCA - sumAgencyCA);
    const tolerance = 1; // 1€ de tolérance pour arrondis
    if (delta > tolerance) {
      logNetwork.warn(`[StatIA] Incohérence CA: réseau=${networkCA.toFixed(2)}€, Σagences=${sumAgencyCA.toFixed(2)}€, delta=${delta.toFixed(2)}€`);
    }
  }
  
  return {
    tuilesHautes,
    blocSav,
    blocCA,
    blocApporteurs,
  };
}

// ============================================================================
// CALCUL TUILES HAUTES
// ============================================================================

function computeTuilesHautes(
  factures: any[],
  projects: any[],
  interventions: any[],
  devis: any[],
  params: ReseauDashboardParams,
  yearStart: Date,
  yearEnd: Date
) {
  // CA Année en cours
  let caAnneeEnCours = 0;
  for (const facture of factures) {
    const meta = extractFactureMeta(facture);
    const factureState = facture.state || facture.status || facture.data?.state || '';
    if (!isFactureStateIncluded(factureState)) continue;
    const date = meta.date ? new Date(meta.date) : null;
    if (!date || date < yearStart || date > yearEnd) continue;
    caAnneeEnCours += meta.montantNetHT;
  }
  
  // CA Période
  let caPeriode = 0;
  for (const facture of factures) {
    const meta = extractFactureMeta(facture);
    const factureState = facture.state || facture.status || facture.data?.state || '';
    if (!isFactureStateIncluded(factureState)) continue;
    const date = meta.date ? new Date(meta.date) : null;
    if (!date || date < params.dateStart || date > params.dateEnd) continue;
    caPeriode += meta.montantNetHT;
  }
  
  // Dossiers Période
  let dossiersPeriode = 0;
  for (const project of projects) {
    const dateStr = project.date || project.created_at || project.createdAt;
    const date = parseDate(dateStr);
    if (!date || date < params.dateStart || date > params.dateEnd) continue;
    dossiersPeriode++;
  }
  
  // Interventions Période
  let interventionsPeriode = 0;
  for (const intervention of interventions) {
    if (!isInterventionRealisee(intervention)) continue;
    const dateStr = intervention.dateReelle || intervention.date || intervention.created_at;
    const date = parseDate(dateStr);
    if (!date || date < params.dateStart || date > params.dateEnd) continue;
    interventionsPeriode++;
  }
  
  // Délai moyen traitement
  const delaiMoyenTraitement = computeDelaiMoyenTraitement(projects, factures, params);
  
  // Taux One-Shot
  const tauxOneShot = computeTauxOneShot(projects, interventions, params);
  
  // Délai Dossier > Devis
  const delaiDossierDevis = computeDelaiDossierDevis(projects, devis, params);
  
  // Visites par dossier
  const visitesParDossier = computeVisitesParDossier(interventions, params);
  
  // Taux Multi-Univers
  const tauxMultiUnivers = computeTauxMultiUnivers(projects, params);
  
  return {
    caAnneeEnCours,
    caPeriode,
    dossiersPeriode,
    interventionsPeriode,
    redevancesMois: 0, // Placeholder - calculé ailleurs via agency_royalty_calculations
    delaiMoyenTraitement,
    tauxOneShot,
    delaiDossierDevis,
    visitesParDossier,
    tauxMultiUnivers,
  };
}

function computeDelaiMoyenTraitement(projects: any[], factures: any[], params: ReseauDashboardParams): number {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  const firstFactureByProject = new Map<any, Date>();
  
  for (const facture of factures) {
    const meta = extractFactureMeta(facture);
    if (!meta.date) continue;
    const projectId = facture.projectId;
    if (!projectId) continue;
    const factureDate = new Date(meta.date);
    const existing = firstFactureByProject.get(projectId);
    if (!existing || factureDate < existing) {
      firstFactureByProject.set(projectId, factureDate);
    }
  }
  
  let totalDays = 0;
  let validCount = 0;
  
  for (const [projectId, factureDate] of firstFactureByProject) {
    const project = projectsMap.get(projectId);
    if (!project) continue;
    
    const projectDate = parseDate(project.date || project.created_at || project.createdAt);
    if (!projectDate) continue;
    if (factureDate < params.dateStart || factureDate > params.dateEnd) continue;
    
    const diffDays = Math.floor((factureDate.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) continue;
    
    totalDays += diffDays;
    validCount++;
  }
  
  return validCount > 0 ? Math.round(totalDays / validCount) : 0;
}

function computeTauxOneShot(projects: any[], interventions: any[], params: ReseauDashboardParams): number {
  const interventionsByProject = new Map<any, number>();
  
  for (const intervention of interventions) {
    if (!isInterventionRealisee(intervention)) continue;
    if (isSAVIntervention(intervention)) continue;
    const projectId = intervention.projectId || intervention.project_id;
    if (!projectId) continue;
    interventionsByProject.set(projectId, (interventionsByProject.get(projectId) || 0) + 1);
  }
  
  let total = 0;
  let oneShot = 0;
  
  for (const project of projects) {
    const date = parseDate(project.date || project.created_at || project.createdAt);
    if (!date || date < params.dateStart || date > params.dateEnd) continue;
    
    const nbInterventions = interventionsByProject.get(project.id) || 0;
    if (nbInterventions === 0) continue;
    
    total++;
    if (nbInterventions === 1) oneShot++;
  }
  
  return total > 0 ? Math.round((oneShot / total) * 1000) / 10 : 0;
}

function computeDelaiDossierDevis(projects: any[], devis: any[], params: ReseauDashboardParams): number | null {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  const firstDevisByProject = new Map<any, Date>();
  
  for (const d of devis) {
    // IMPORTANT: Filtrer sur state === "sent" et dateReelle uniquement
    const state = (d.state || '').toLowerCase();
    if (state !== 'sent') continue;
    
    const dateStr = d.dateReelle;
    if (!dateStr) continue;
    
    const date = parseDate(dateStr);
    if (!date) continue;
    
    const projectId = d.projectId || d.project_id;
    if (!projectId) continue;
    
    const existing = firstDevisByProject.get(projectId);
    if (!existing || date < existing) {
      firstDevisByProject.set(projectId, date);
    }
  }
  
  let totalDays = 0;
  let validCount = 0;
  
  for (const [projectId, devisDate] of firstDevisByProject) {
    const project = projectsMap.get(projectId);
    if (!project) continue;
    
    const projectDate = parseDate(project.created_at || project.date || project.createdAt);
    if (!projectDate) continue;
    if (devisDate < params.dateStart || devisDate > params.dateEnd) continue;
    
    const diffDays = Math.floor((devisDate.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) continue;
    
    totalDays += diffDays;
    validCount++;
  }
  
  // IMPORTANT: Retourner null si aucune donnée exploitable, pas 0
  return validCount > 0 ? Math.round(totalDays / validCount) : null;
}

function computeVisitesParDossier(interventions: any[], params: ReseauDashboardParams): number {
  const interventionsByProject = new Map<any, number>();
  
  for (const intervention of interventions) {
    if (!isInterventionRealisee(intervention)) continue;
    const dateStr = intervention.dateReelle || intervention.date || intervention.created_at;
    const date = parseDate(dateStr);
    if (!date || date < params.dateStart || date > params.dateEnd) continue;
    
    const projectId = intervention.projectId || intervention.project_id;
    if (!projectId) continue;
    interventionsByProject.set(projectId, (interventionsByProject.get(projectId) || 0) + 1);
  }
  
  let totalDossiers = 0;
  let totalInterventions = 0;
  for (const count of interventionsByProject.values()) {
    totalDossiers++;
    totalInterventions += count;
  }
  
  return totalDossiers > 0 ? Math.round((totalInterventions / totalDossiers) * 10) / 10 : 0;
}

function computeTauxMultiUnivers(projects: any[], params: ReseauDashboardParams): number {
  let total = 0;
  let multiUnivers = 0;
  
  for (const project of projects) {
    const date = parseDate(project.date || project.created_at || project.createdAt);
    if (!date || date < params.dateStart || date > params.dateEnd) continue;
    
    total++;
    const universes = project.data?.universes || project.universes || [];
    if (Array.isArray(universes) && universes.length > 1) {
      multiUnivers++;
    }
  }
  
  return total > 0 ? Math.round((multiUnivers / total) * 1000) / 10 : 0;
}

// ============================================================================
// CALCUL BLOC SAV
// ============================================================================

function computeBlocSav(
  projects: any[],
  interventions: any[],
  params: ReseauDashboardParams,
  agencyData: AgencyData[]
) {
  // Identifier projets avec SAV
  const projectsWithSAV = new Set<any>();
  for (const intervention of interventions) {
    if (isSAVIntervention(intervention)) {
      const projectId = intervention.projectId || intervention.project_id;
      if (projectId) projectsWithSAV.add(projectId);
    }
  }
  
  let totalDossiers = 0;
  let savDossiers = 0;
  const byMonth = new Map<string, { total: number; sav: number }>();
  
  for (const project of projects) {
    const dateStr = project.date || project.created_at || project.createdAt;
    const date = parseDate(dateStr);
    if (!date || date < params.dateStart || date > params.dateEnd) continue;
    
    totalDossiers++;
    const hasSav = projectsWithSAV.has(project.id);
    if (hasSav) savDossiers++;
    
    const monthKey = format(date, 'yyyy-MM');
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, { total: 0, sav: 0 });
    }
    const stats = byMonth.get(monthKey)!;
    stats.total++;
    if (hasSav) stats.sav++;
  }
  
  // Taux moyen par agence
  const agencyRates: number[] = [];
  for (const agency of agencyData) {
    if (!agency.data?.projects?.length) continue;
    
    const agencySAV = new Set<any>();
    for (const intervention of agency.data.interventions || []) {
      if (isSAVIntervention(intervention)) {
        const projectId = intervention.projectId || intervention.project_id;
        if (projectId) agencySAV.add(projectId);
      }
    }
    
    const agencyProjects = agency.data.projects.filter((p: any) => {
      const d = parseDate(p.date || p.created_at || p.createdAt);
      return d && d >= params.dateStart && d <= params.dateEnd;
    });
    
    if (agencyProjects.length > 0) {
      const agencySAVCount = agencyProjects.filter((p: any) => agencySAV.has(p.id)).length;
      agencyRates.push((agencySAVCount / agencyProjects.length) * 100);
    }
  }
  
  const tauxSavMoyenAgences = agencyRates.length > 0
    ? Math.round((agencyRates.reduce((a, b) => a + b, 0) / agencyRates.length) * 10) / 10
    : 0;
  
  // Série mensuelle
  const serieTauxSavMensuel: Array<{ month: string; tauxSAV: number }> = [];
  const sortedMonths = Array.from(byMonth.keys()).sort();
  for (const month of sortedMonths) {
    const stats = byMonth.get(month)!;
    const taux = stats.total > 0 ? (stats.sav / stats.total) * 100 : 0;
    serieTauxSavMensuel.push({ month, tauxSAV: Math.round(taux * 10) / 10 });
  }
  
  return {
    tauxSavGlobalReseau: totalDossiers > 0 ? Math.round((savDossiers / totalDossiers) * 1000) / 10 : 0,
    nbSavGlobal: savDossiers,
    nbDossiersBaseSav: totalDossiers,
    tauxSavMoyenAgences,
    serieTauxSavMensuel,
  };
}

// ============================================================================
// CALCUL BLOC CA
// ============================================================================

function computeBlocCA(
  factures: any[],
  agencyData: AgencyData[],
  params: ReseauDashboardParams,
  yearStart: Date,
  yearEnd: Date
) {
  // Série CA mensuel - utiliser index numérique pour éviter les problèmes de locale
  const byMonthIndex = new Map<number, { ca: number; nbFactures: number }>();
  for (const facture of factures) {
    const meta = extractFactureMeta(facture);
    const factureState = facture.state || facture.status || facture.data?.state || '';
    if (!isFactureStateIncluded(factureState)) continue;
    const date = meta.date ? new Date(meta.date) : null;
    if (!date || date < yearStart || date > yearEnd) continue;
    
    const monthIndex = date.getMonth(); // 0-11
    const existing = byMonthIndex.get(monthIndex) || { ca: 0, nbFactures: 0 };
    existing.ca += meta.montantNetHT;
    existing.nbFactures += 1;
    byMonthIndex.set(monthIndex, existing);
  }
  
  const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const serieCAMensuel = monthLabels.map((month, index) => ({
    month,
    ca: byMonthIndex.get(index)?.ca || 0,
    nbFactures: byMonthIndex.get(index)?.nbFactures || 0,
  }));
  
  // CA par agence
  const caByAgency: Array<{ agencyLabel: string; ca: number; percentage: number }> = [];
  let totalCA = 0;
  
  for (const agency of agencyData) {
    if (!agency.data?.factures) continue;
    
    let agencyCA = 0;
    for (const facture of agency.data.factures) {
      const meta = extractFactureMeta(facture);
      const factureState = facture.state || facture.status || facture.data?.state || '';
      if (!isFactureStateIncluded(factureState)) continue;
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < yearStart || date > yearEnd) continue;
      agencyCA += meta.montantNetHT;
    }
    
    totalCA += agencyCA;
    caByAgency.push({ agencyLabel: agency.agencyLabel, ca: agencyCA, percentage: 0 });
  }
  
  // Calculer pourcentages
  for (const item of caByAgency) {
    item.percentage = totalCA > 0 ? Math.round((item.ca / totalCA) * 1000) / 10 : 0;
  }
  
  // Top 5 agences
  const top5AgencesCA = caByAgency
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 5)
    .map((item, index) => ({
      agencyId: item.agencyLabel,
      agencyLabel: item.agencyLabel,
      ca: item.ca,
      rank: index + 1,
    }));
  
  return {
    serieCAMensuel,
    partCAParAgence: caByAgency.sort((a, b) => b.ca - a.ca),
    top5AgencesCA,
  };
}

// ============================================================================
// CALCUL BLOC APPORTEURS
// ============================================================================

function computeBlocApporteurs(
  factures: any[],
  projects: any[],
  clients: any[],
  params: ReseauDashboardParams
) {
  const clientsMap = new Map(clients.map(c => [c.id, c]));
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  const apporteurStats = new Map<any, { name: string; ca: number; projectIds: Set<any> }>();
  
  for (const facture of factures) {
    const meta = extractFactureMeta(facture);
    const factureState = facture.state || facture.status || facture.data?.state || '';
    if (!isFactureStateIncluded(factureState)) continue;
    
    const date = meta.date ? new Date(meta.date) : null;
    if (!date || date < params.dateStart || date > params.dateEnd) continue;
    
    const project = projectsMap.get(facture.projectId);
    if (!project) continue;
    
    const commanditaireId = project.data?.commanditaireId;
    if (!commanditaireId) continue;
    
    const client = clientsMap.get(commanditaireId);
    const name = client?.nom || client?.name || `Apporteur ${commanditaireId}`;
    
    if (!apporteurStats.has(commanditaireId)) {
      apporteurStats.set(commanditaireId, { name, ca: 0, projectIds: new Set() });
    }
    
    const stats = apporteurStats.get(commanditaireId)!;
    stats.ca += meta.montantNetHT;
    stats.projectIds.add(facture.projectId);
  }
  
  const top3ApporteursCA = Array.from(apporteurStats.values())
    .map(stats => ({
      name: stats.name,
      ca: stats.ca,
      nbDossiers: stats.projectIds.size,
      rank: 0,
    }))
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 3)
    .map((item, index) => ({ ...item, rank: index + 1 }));
  
  return { top3ApporteursCA };
}

// ============================================================================
// EMPTY DASHBOARD
// ============================================================================

function getEmptyDashboard(): ReseauDashboardData {
  return {
    tuilesHautes: {
      caAnneeEnCours: 0,
      caPeriode: 0,
      dossiersPeriode: 0,
      interventionsPeriode: 0,
      redevancesMois: 0,
      delaiMoyenTraitement: 0,
      tauxOneShot: 0,
      delaiDossierDevis: null,
      visitesParDossier: 0,
      tauxMultiUnivers: 0,
    },
    blocSav: {
      tauxSavGlobalReseau: 0,
      nbSavGlobal: 0,
      nbDossiersBaseSav: 0,
      tauxSavMoyenAgences: 0,
      serieTauxSavMensuel: [],
    },
    blocCA: {
      serieCAMensuel: [],
      partCAParAgence: [],
      top5AgencesCA: [],
    },
    blocApporteurs: {
      top3ApporteursCA: [],
    },
  };
}
