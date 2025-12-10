/**
 * StatIA V2 - Engine pour le Comparatif Agences
 * Calcule tous les KPI par agence pour la page comparatif
 */

import { startOfYear, endOfYear } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { NetworkDataService } from '@/franchiseur/services/networkDataService';
import { extractFactureMeta } from '../rules/rules';
import { isFactureStateIncluded } from '../engine/normalizers';
import { logNetwork } from '@/lib/logger';
import { calculateDelaiPremierDevis } from '../shared/delaiPremierDevis';

// ============================================================================
// TYPES
// ============================================================================

export interface ComparatifAgencesParams {
  dateStart: Date;
  dateEnd: Date;
  scopeAgencies?: string[]; // IDs des agences sélectionnées (vide = toutes)
}

export interface ComparatifAgenceRow {
  agency_id: string;
  agency_name: string;
  ca_periode: number | null;
  ca_annee: number | null;
  nb_dossiers_periode: number;
  nb_interventions_periode: number;
  ca_moyen_par_dossier: number | null;
  ca_moyen_par_intervention: number | null;
  taux_sav: number | null;
  cout_sav: number | null;
  taux_one_shot: number | null;
  taux_multi_visites: number | null;
  delai_premier_devis: number | null;
  delai_traitement_dossier: number | null;
  delai_ouverture_dossier: number | null;
  ca_par_technicien_actif: number | null;
  nb_techniciens_actifs: number;
}

export interface ComparatifAgencesResult {
  agences: ComparatifAgenceRow[];
}

// ============================================================================
// HELPERS
// ============================================================================

function parseDate(dateString: string | undefined | null): Date | null {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function isInterventionRealisee(intervention: any): boolean {
  const state = (intervention.state || intervention.statut || intervention.data?.state || '').toLowerCase();
  return ['done', 'finished', 'validated', 'completed', 'réalisée', 'terminée'].includes(state);
}

/**
 * Vérifie si une intervention est de type SAV
 * RÈGLE MÉTIER STRICTE: type2 === "SAV" (égalité exacte, pas includes)
 */
function isSAVIntervention(intervention: any): boolean {
  const type2 = (intervention.data?.type2 || intervention.type2 || '').toLowerCase().trim();
  return type2 === 'sav';
}

// ============================================================================
// ENGINE PRINCIPAL
// ============================================================================

export async function computeComparatifAgences(params: ComparatifAgencesParams): Promise<ComparatifAgencesResult> {
  logNetwork.info('[StatIA Comparatif] computeComparatifAgences - START', { params });

  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  // 1. Charger les agences
  const { data: agencies, error: agenciesError } = await supabase
    .from('apogee_agencies')
    .select('id, slug, label')
    .eq('is_active', true);

  if (agenciesError || !agencies?.length) {
    logNetwork.error('[StatIA Comparatif] Erreur chargement agences', agenciesError);
    return { agences: [] };
  }

  // 2. Filtrer par scope si nécessaire
  const filteredAgencies = params.scopeAgencies?.length
    ? agencies.filter(a => params.scopeAgencies!.includes(a.id))
    : agencies;

  logNetwork.debug(`[StatIA Comparatif] Chargement de ${filteredAgencies.length} agences...`);

  // 3. Charger et calculer les KPI par agence
  const agenceRows: ComparatifAgenceRow[] = [];

  for (const agency of filteredAgencies) {
    try {
      const data = await NetworkDataService.loadAgencyData(agency.slug);
      
      if (!data) {
        agenceRows.push(createEmptyRow(agency.id, agency.label));
        continue;
      }

      const row = computeAgencyKPIs(
        agency.id,
        agency.label,
        data.factures || [],
        data.projects || [],
        data.interventions || [],
        data.devis || [],
        params,
        yearStart,
        yearEnd
      );
      
      agenceRows.push(row);
    } catch (err) {
      logNetwork.warn(`[StatIA Comparatif] Erreur chargement ${agency.slug}`, err);
      agenceRows.push(createEmptyRow(agency.id, agency.label));
    }
  }

  logNetwork.info(`[StatIA Comparatif] ${agenceRows.length} agences calculées`);
  
  return { agences: agenceRows };
}

function createEmptyRow(agencyId: string, agencyName: string): ComparatifAgenceRow {
  return {
    agency_id: agencyId,
    agency_name: agencyName,
    ca_periode: null,
    ca_annee: null,
    nb_dossiers_periode: 0,
    nb_interventions_periode: 0,
    ca_moyen_par_dossier: null,
    ca_moyen_par_intervention: null,
    taux_sav: null,
    cout_sav: null,
    taux_one_shot: null,
    taux_multi_visites: null,
    delai_premier_devis: null,
    delai_traitement_dossier: null,
    delai_ouverture_dossier: null,
    ca_par_technicien_actif: null,
    nb_techniciens_actifs: 0,
  };
}

function computeAgencyKPIs(
  agencyId: string,
  agencyName: string,
  factures: any[],
  projects: any[],
  interventions: any[],
  devis: any[],
  params: ComparatifAgencesParams,
  yearStart: Date,
  yearEnd: Date
): ComparatifAgenceRow {
  // CA Période
  let caPeriode = 0;
  let nbFacturesPeriode = 0;
  const projectsFactures = new Set<string>();
  
  for (const facture of factures) {
    const meta = extractFactureMeta(facture);
    // Vérifier état facture avec paymentStatus (champ Apogée) en priorité
    const factureState = facture.paymentStatus || facture.state || facture.status || facture.data?.paymentStatus || facture.data?.state || '';
    if (!isFactureStateIncluded(factureState)) continue;
    const date = meta.date ? new Date(meta.date) : null;
    if (!date || date < params.dateStart || date > params.dateEnd) continue;
    caPeriode += meta.montantNetHT;
    nbFacturesPeriode++;
    const projectId = facture.projectId;
    if (projectId) projectsFactures.add(projectId);
  }

  // CA Année
  let caAnnee = 0;
  for (const facture of factures) {
    const meta = extractFactureMeta(facture);
    // Vérifier état facture avec paymentStatus (champ Apogée) en priorité
    const factureState = facture.paymentStatus || facture.state || facture.status || facture.data?.paymentStatus || facture.data?.state || '';
    if (!isFactureStateIncluded(factureState)) continue;
    const date = meta.date ? new Date(meta.date) : null;
    if (!date || date < yearStart || date > yearEnd) continue;
    caAnnee += meta.montantNetHT;
  }

  // Dossiers période
  let nbDossiersPeriode = 0;
  for (const project of projects) {
    const dateStr = project.date || project.created_at || project.createdAt;
    const date = parseDate(dateStr);
    if (!date || date < params.dateStart || date > params.dateEnd) continue;
    nbDossiersPeriode++;
  }

  // Interventions période + techniciens actifs
  let nbInterventionsPeriode = 0;
  const techniciensActifs = new Set<number>();
  const interventionsByProject = new Map<string, number>();
  const projectsWithSAV = new Set<string>();
  const firstIntervByProject = new Map<string, Date>();

  for (const intervention of interventions) {
    if (!isInterventionRealisee(intervention)) continue;
    
    const dateStr = intervention.dateReelle || intervention.date || intervention.created_at;
    const date = parseDate(dateStr);
    if (!date || date < params.dateStart || date > params.dateEnd) continue;
    
    nbInterventionsPeriode++;
    
    // Techniciens actifs
    const userId = intervention.userId || intervention.user_id;
    if (userId) techniciensActifs.add(userId);
    
    const projectId = intervention.projectId || intervention.project_id;
    if (!projectId) continue;
    
    // Compter interventions par projet (hors SAV pour one-shot)
    if (!isSAVIntervention(intervention)) {
      interventionsByProject.set(projectId, (interventionsByProject.get(projectId) || 0) + 1);
    }
    
    // Tracker SAV
    if (isSAVIntervention(intervention)) {
      projectsWithSAV.add(projectId);
    }
    
    // Premier intervention par projet
    const existing = firstIntervByProject.get(projectId);
    if (!existing || date < existing) {
      firstIntervByProject.set(projectId, date);
    }
  }

  // CA moyen par dossier
  const nbDossiersFactures = projectsFactures.size;
  const caMoyenParDossier = nbDossiersFactures > 0 ? caPeriode / nbDossiersFactures : null;

  // CA moyen par intervention
  const caMoyenParIntervention = nbInterventionsPeriode > 0 ? caPeriode / nbInterventionsPeriode : null;

  // Taux SAV
  const nbDossiersBase = interventionsByProject.size;
  const nbDossiersSav = projectsWithSAV.size;
  const tauxSav = nbDossiersBase > 0 ? Math.round((nbDossiersSav / nbDossiersBase) * 1000) / 10 : null;

  // Coût SAV (factures SAV + devis SAV acceptés)
  let coutSav = 0;
  for (const facture of factures) {
    const isSav = facture.data?.type_sav || facture.type_sav;
    if (!isSav) continue;
    const meta = extractFactureMeta(facture);
    coutSav += meta.montantNetHT;
  }
  for (const d of devis) {
    const isSav = d.data?.type_sav || d.type_sav;
    if (!isSav) continue;
    const state = (d.state || '').toLowerCase();
    if (!['accepted', 'validated', 'order'].includes(state)) continue;
    const totalHT = d.data?.totalHT || d.totalHT || 0;
    coutSav += totalHT;
  }

  // Taux one-shot et multi-visites
  let oneShot = 0;
  let multiVisites = 0;
  for (const [, count] of interventionsByProject) {
    if (count === 1) oneShot++;
    if (count >= 2) multiVisites++;
  }
  const tauxOneShot = nbDossiersBase > 0 ? Math.round((oneShot / nbDossiersBase) * 1000) / 10 : null;
  const tauxMultiVisites = nbDossiersBase > 0 ? Math.round((multiVisites / nbDossiersBase) * 1000) / 10 : null;

  // Délai premier devis - UTILISE LA SOURCE UNIQUE DE VÉRITÉ
  const delaiResult = calculateDelaiPremierDevis(projects, {
    dateStart: params.dateStart,
    dateEnd: params.dateEnd,
    maxDelaiJours: 60,
    debug: false
  });
  const delaiPremierDevis = delaiResult.moyenne;
  
  const projectsMap = new Map(projects.map(p => [p.id, p]));

  // Délai ouverture dossier (project → première intervention)
  let totalDelaiOuverture = 0;
  let countDelaiOuverture = 0;
  for (const [projectId, intervDate] of firstIntervByProject) {
    const project = projectsMap.get(projectId);
    if (!project) continue;
    const projectDate = parseDate(project.created_at || project.date || project.createdAt);
    if (!projectDate) continue;
    const diffDays = Math.floor((intervDate.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) continue;
    totalDelaiOuverture += diffDays;
    countDelaiOuverture++;
  }
  const delaiOuvertureDossier = countDelaiOuverture > 0 ? Math.round(totalDelaiOuverture / countDelaiOuverture) : null;

  // Délai traitement dossier (première intervention → première facture)
  const firstFactureByProject = new Map<string, Date>();
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

  let totalDelaiTraitement = 0;
  let countDelaiTraitement = 0;
  for (const [projectId, factureDate] of firstFactureByProject) {
    const intervDate = firstIntervByProject.get(projectId);
    if (!intervDate) continue;
    if (factureDate < params.dateStart || factureDate > params.dateEnd) continue;
    const diffDays = Math.floor((factureDate.getTime() - intervDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) continue;
    totalDelaiTraitement += diffDays;
    countDelaiTraitement++;
  }
  const delaiTraitementDossier = countDelaiTraitement > 0 ? Math.round(totalDelaiTraitement / countDelaiTraitement) : null;

  // CA par technicien actif
  const nbTechniciensActifs = techniciensActifs.size;
  const caParTechnicienActif = nbTechniciensActifs > 0 ? caPeriode / nbTechniciensActifs : null;

  return {
    agency_id: agencyId,
    agency_name: agencyName,
    ca_periode: caPeriode > 0 ? caPeriode : null,
    ca_annee: caAnnee > 0 ? caAnnee : null,
    nb_dossiers_periode: nbDossiersPeriode,
    nb_interventions_periode: nbInterventionsPeriode,
    ca_moyen_par_dossier: caMoyenParDossier,
    ca_moyen_par_intervention: caMoyenParIntervention,
    taux_sav: tauxSav,
    cout_sav: coutSav > 0 ? coutSav : null,
    taux_one_shot: tauxOneShot,
    taux_multi_visites: tauxMultiVisites,
    delai_premier_devis: delaiPremierDevis,
    delai_traitement_dossier: delaiTraitementDossier,
    delai_ouverture_dossier: delaiOuvertureDossier,
    ca_par_technicien_actif: caParTechnicienActif,
    nb_techniciens_actifs: nbTechniciensActifs,
  };
}
