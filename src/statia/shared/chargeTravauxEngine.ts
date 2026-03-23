/**
 * Moteur de calcul de la charge de travail TRAVAUX à venir
 * Croisement projets ↔ interventions ↔ devis via projectId
 */

// Mapping des états API vers labels affichés
const STATE_MAPPING: Record<string, string> = {
  'to_planify_tvx': 'À planifier TVX',
  'devis_to_order': 'À commander',
  'wait_fourn': 'En attente fournitures'
};

// États éligibles (clés API)
const ETATS_ELIGIBLES = new Set(['to_planify_tvx', 'devis_to_order', 'wait_fourn']);

// États de devis éligibles (on exclut draft, rejected, canceled)
const DEVIS_ETATS_EXCLUS = new Set(['draft', 'rejected', 'canceled']);

export interface ChargeTravauxProjet {
  projectId: number | string;
  reference?: string;
  label?: string;
  etatWorkflow: string;
  etatWorkflowLabel: string;
  universes: string[];
  totalHeuresRdv: number;
  totalHeuresTech: number;
  nbTechs: number;
  devisHT: number;
  // Enrichissement pilotage avancé
  createdAt: string | null;
  ageDays: number | null;
  riskFlux: number;
  riskData: number;
  riskValue: number;
  riskScoreGlobal: number;
  dataQualityFlags: string[];
  includedInForecastCalc: boolean;
  includedInChargeCalc: boolean;
  technicianIds: string[];
}

export interface ChargeTravauxUniversStats {
  univers: string;
  nbDossiers: number;
  totalHeuresRdv: number;
  totalHeuresTech: number;
  totalHeuresTech_A_planifier_TVX: number;
  totalHeuresTech_A_commander: number;
  totalHeuresTech_En_attente_fournitures: number;
  devisHTTotal: number;
  devisHT_A_planifier_TVX: number;
  devisHT_A_commander: number;
  devisHT_En_attente_fournitures: number;
}

export interface ChargeParEtatStats {
  etat: string;
  etatLabel: string;
  nbDossiers: number;
  totalHeuresRdv: number;
  totalHeuresTech: number;
  totalNbTechs: number;
  devisHT: number;
}

export interface RiskProjectEntry {
  projectId: number | string;
  reference?: string;
  label?: string;
  riskScoreGlobal: number;
  riskFlux: number;
  riskData: number;
  riskValue: number;
  ageDays: number | null;
  devisHT: number;
  etatWorkflowLabel: string;
}

export interface TechnicianCharge {
  technicianId: string;
  hours: number;
  projects: number;
}

export interface WeeklyLoadEntry {
  weekLabel: string;
  weekStart: string;
  hours: number;
  projects: number;
}

export interface DataQualityInfo {
  score: number;
  withHours: number;
  withDevis: number;
  withUnivers: number;
  withPlannedDate: number;
  total: number;
  flags: Record<string, number>;
}

export interface PipelineMaturityInfo {
  commercial: number;
  a_commander: number;
  pret_planification: number;
  planifie: number;
  bloque: number;
}

export interface PipelineAgingInfo {
  bucket_0_7: number;
  bucket_8_15: number;
  bucket_16_30: number;
  bucket_30_plus: number;
  unknown: number;
}

export interface ChargeTravauxResult {
  parUnivers: ChargeTravauxUniversStats[];
  parEtat: ChargeParEtatStats[];
  parProjet: ChargeTravauxProjet[];
  totaux: {
    totalHeuresRdv: number;
    totalHeuresTech: number;
    totalNbTechs: number;
    nbDossiers: number;
    totalDevisHT: number;
    caPlanifie: number;
  };
  debug: {
    totalProjects: number;
    projectsEligibleState: number;
    projectsAvecRT: number;
    rtBlocksCount: number;
    interventionsTotal: number;
    interventionsIndexed: number;
    devisTotal: number;
    devisIndexed: number;
    devisMatchedToProjects: number;
    devisHTCalculated: number;
    caPlanifieDevisCount: number;
    sampleDevis: any;
  };
  // Pilotage avancé
  dataQuality: DataQualityInfo;
  pipelineMaturity: PipelineMaturityInfo;
  pipelineAging: PipelineAgingInfo;
  riskProjects: RiskProjectEntry[];
  chargeByTechnician: TechnicianCharge[];
  weeklyLoad: WeeklyLoadEntry[];
}

/**
 * Extrait un projectId robuste depuis les différentes formes renvoyées par Apogée
 */
function getProjectId(obj: any): number | null {
  const raw = obj?.projectId ?? obj?.project_id ?? obj?.project?.id ?? obj?.refId ?? obj?.ref_id ?? obj?.dossierId ?? obj?.dossier_id ?? obj?.data?.projectId;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function getInterventionId(obj: any): string | null {
  const raw = obj?.id ?? obj?.interventionId ?? obj?.intervention_id ?? obj?.data?.interventionId;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s.length > 0 ? s : null;
}

/**
 * Indexe les interventions par projectId (gère les alias projectId/refId/dossierId)
 */
function groupInterventionsByProjectId(interventions: any[]): Map<number, any[]> {
  const map = new Map<number, any[]>();

  for (const itv of interventions) {
    const key = getProjectId(itv);
    if (key == null) continue;

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(itv);
  }

  return map;
}

/**
 * Indexe les devis par projectId
 */
function groupDevisByProjectId(devis: any[]): Map<number, any[]> {
  const map = new Map<number, any[]>();

  for (const d of devis) {
    const key = getProjectId(d);
    if (key == null) continue;

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }

  return map;
}

/**
 * Indexe les créneaux par interventionId
 */
function groupCreneauxByInterventionId(creneaux: any[] = []): Map<string, any[]> {
  const map = new Map<string, any[]>();

  for (const c of creneaux) {
    const key = getInterventionId(c);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }

  return map;
}

function getUserIds(raw: any): string[] {
  const values = raw?.usersIds ?? raw?.userIds ?? raw?.data?.usersIds ?? raw?.data?.userIds ?? [];
  if (!Array.isArray(values)) return [];
  return values.map((v: any) => String(v)).filter(Boolean);
}

function getDurationHoursFromCreneaux(creneaux: any[] = []): number {
  let hours = 0;

  for (const c of creneaux) {
    if (c?.debut && c?.fin) {
      const [dh, dm] = String(c.debut).split(':').map(Number);
      const [fh, fm] = String(c.fin).split(':').map(Number);
      if ([dh, dm, fh, fm].every((n) => Number.isFinite(n))) {
        const minutes = (fh * 60 + fm) - (dh * 60 + dm);
        if (minutes > 0) hours += minutes / 60;
        continue;
      }
    }

    const durationMinutes =
      parseNumericValue(c?.duree) ||
      parseNumericValue(c?.dureeMinutes) ||
      parseNumericValue(c?.duration);

    if (durationMinutes > 0) {
      hours += durationMinutes / 60;
    }
  }

  return hours;
}

/**
 * Extrait les heures depuis le planning réel d'abord (visites / créneaux), puis fallback sur le chiffrage
 */
function extractHoursFromIntervention(
  intervention: any,
  creneauxByInterventionId?: Map<string, any[]>
): { heuresRdv: number; heuresTech: number; nbTechs: number; blocksCount: number } {
  let totalHeures = 0;
  let totalHeuresTech = 0;
  let maxNbTechs = 0;

  const visites = [
    ...(Array.isArray(intervention?.visites) ? intervention.visites : []),
    ...(Array.isArray(intervention?.data?.visites) ? intervention.data.visites : []),
  ];

  for (const visite of visites) {
    const visiteUsers = getUserIds(visite);
    const visiteCreneaux = Array.isArray(visite?.creneaux) ? visite.creneaux : [];
    const durationHours =
      getDurationHoursFromCreneaux(visiteCreneaux) ||
      (parseNumericValue(visite?.duree) || parseNumericValue(visite?.dureeMinutes) || parseNumericValue(visite?.duration) || parseNumericValue(visite?.tempsPrevu)) / 60;

    if (durationHours <= 0) continue;

    const nbTechs = visiteUsers.length || parseNumericValue(visite?.nbTechs) || 1;
    totalHeures += durationHours;
    totalHeuresTech += durationHours * nbTechs;
    maxNbTechs = Math.max(maxNbTechs, nbTechs);
  }

  if (totalHeures > 0) {
    return {
      heuresRdv: totalHeures,
      heuresTech: totalHeuresTech,
      nbTechs: maxNbTechs,
      blocksCount: 0,
    };
  }

  const interventionUsers = getUserIds(intervention);
  const directDurationHours =
    (parseNumericValue(intervention?.duree) || parseNumericValue(intervention?.tempsPrevu) || parseNumericValue(intervention?.duration)) / 60;

  if (directDurationHours > 0) {
    const nbTechs = interventionUsers.length || 1;
    return {
      heuresRdv: directDurationHours,
      heuresTech: directDurationHours * nbTechs,
      nbTechs,
      blocksCount: 0,
    };
  }

  const interventionId = getInterventionId(intervention);
  const standaloneCreneaux = interventionId && creneauxByInterventionId ? (creneauxByInterventionId.get(interventionId) || []) : [];
  const creneauxHours = getDurationHoursFromCreneaux(standaloneCreneaux);
  if (creneauxHours > 0) {
    const ids = new Set<string>();
    for (const c of standaloneCreneaux) {
      for (const uid of getUserIds(c)) ids.add(uid);
    }
    const nbTechs = ids.size || 1;
    return {
      heuresRdv: creneauxHours,
      heuresTech: creneauxHours * nbTechs,
      nbTechs,
      blocksCount: 0,
    };
  }

  const chiffrage = intervention?.data?.chiffrage;
  if (!chiffrage?.postes || !Array.isArray(chiffrage.postes)) {
    return { heuresRdv: 0, heuresTech: 0, nbTechs: 0, blocksCount: 0 };
  }

  let fallbackHeures = 0;
  let fallbackHeuresTech = 0;
  let fallbackMaxNbTechs = 0;
  let blocksCount = 0;

  for (const poste of chiffrage.postes) {
    const items = poste?.items || [];

    for (const item of items) {
      if (!item?.IS_BLOCK || item?.slug !== 'chiffrage') continue;

      const data = item.data || {};
      blocksCount++;

      let nbHeures = parseNumericValue(data.nbHeures);
      let nbTechs = parseNumericValue(data.nbTechs);

      if (nbHeures === 0 || nbTechs === 0) {
        const subItems = data.subItems || [];

        for (const sub of subItems) {
          if (!sub?.IS_BLOCK || sub?.slug !== 'dfields') continue;

          const dFields = sub.data?.dFields || [];

          for (const df of dFields) {
            const slug = String(df.EXPORT_generiqueSlug || '').toLowerCase();

            if (slug.includes('nombre_de techniciens') || slug.includes('nombre_de_techniciens')) {
              const val = parseNumericValue(df.value);
              if (val > 0 && nbTechs === 0) nbTechs = val;
            }

            if (slug.includes("temps_total d'intervention") || slug.includes("temps_total_d'intervention") || slug.includes('temps_total')) {
              const val = parseNumericValue(df.value);
              if (val > 0 && nbHeures === 0) nbHeures = val;
            }
          }
        }
      }

      if (nbHeures <= 0) continue;
      if (nbTechs <= 0) nbTechs = 1;

      fallbackHeures += nbHeures;
      fallbackHeuresTech += nbHeures * nbTechs;
      fallbackMaxNbTechs = Math.max(fallbackMaxNbTechs, nbTechs);
    }
  }

  return { heuresRdv: fallbackHeures, heuresTech: fallbackHeuresTech, nbTechs: fallbackMaxNbTechs, blocksCount };
}

/**
 * Parse une valeur numérique (string ou number)
 */
function parseNumericValue(value: any): number {
  if (value == null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value === 'string') {
    const cleaned = value.replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/**
 * Normalise un nom d'univers
 */
function normalizeUnivers(univers: string): string {
  const mapping: Record<string, string> = {
    'ame_logement': 'Aménagement PMR',
    'amelioration_logement': 'Aménagement PMR',
    'pmr': 'Aménagement PMR',
    'renovation': 'Rénovation',
    'plomberie': 'Plomberie',
    'electricite': 'Électricité',
    'serrurerie': 'Serrurerie',
    'recherche_fuite': 'Recherche de fuite',
    'vitrerie': 'Vitrerie',
    'multiservice': 'Multiservice',
  };
  
  const normalized = univers.toLowerCase().trim();
  return mapping[normalized] || univers;
}

/**
 * Calcule le montant HT total des devis éligibles pour un projet
 */
function calculateDevisHTForProject(projectDevis: any[]): number {
  let total = 0;

  for (const d of projectDevis) {
    const devisState = String(d.state || '').toLowerCase();
    
    // Exclure les devis non "vivants"
    if (DEVIS_ETATS_EXCLUS.has(devisState)) continue;

    // Priorité: data.totalHT (structure API) > totalHT (racine) > amount
    const montant =
      parseNumericValue(d.data?.totalHT) ||
      parseNumericValue(d.data?.totalTTC) ||
      parseNumericValue(d.totalHT) ||
      parseNumericValue(d.amount) ||
      0;

    if (montant > 0) {
      total += montant;
    }
  }

  return total;
}

/**
 * Vérifie si un devis est "to order" (accepté/commandé)
 */
const VALID_DEVIS_TO_ORDER_STATES = new Set([
  'to order', 'to_order', 'order',
  'accepted', 'accepté', 'accepte',
  'signed', 'signé', 'signe',
  'validated', 'validé', 'valide',
  'commande', 'commandé', 'commandee', 'à commander', 'a commander',
  'devis_accepte', 'devis_valide', 'devis_accepté', 'devis_validé',
]);

function isDevisToOrder(d: any): boolean {
  const state = String(d?.state ?? d?.status ?? d?.data?.state ?? d?.etat ?? d?.data?.etat ?? '').trim().toLowerCase();
  return VALID_DEVIS_TO_ORDER_STATES.has(state);
}

/**
 * Calcule le CA Planifié (devis "to order" uniquement) pour un projet
 * Règle métier: 1 seul devis "to order" max par dossier
 */
function calculateCAPlanifieForProject(projectDevis: any[]): number {
  for (const d of projectDevis) {
    if (!isDevisToOrder(d)) continue;

    const montant =
      parseNumericValue(d.data?.totalHT) ||
      parseNumericValue(d.totalHT) ||
      parseNumericValue(d.amount) ||
      0;

    if (montant > 0) {
      return montant; // 1 seul devis "to order" max par dossier
    }
  }

  return 0;
}

/**
 * Calcule la charge de travaux à venir par univers
 * Croisement: projects.id ↔ interventions.projectId ↔ devis.projectId
 */
export function computeChargeTravauxAvenirParUnivers(
  projects: any[],
  interventions: any[],
  devis: any[] = [],
  creneaux: any[] = []
): ChargeTravauxResult {
  // Index des interventions et devis par projectId
  const byProjectId = groupInterventionsByProjectId(interventions);
  const devisByProjectId = groupDevisByProjectId(devis);

  const debug = {
    totalProjects: projects.length,
    projectsEligibleState: 0,
    projectsAvecRT: 0,
    rtBlocksCount: 0,
    interventionsTotal: interventions.length,
    interventionsIndexed: Array.from(byProjectId.values()).flat().length,
    devisTotal: devis.length,
    devisIndexed: Array.from(devisByProjectId.values()).flat().length,
    devisMatchedToProjects: 0,
    devisHTCalculated: 0,
    caPlanifieDevisCount: 0,
    sampleDevis: devis.length > 0 ? { 
      id: devis[0]?.id, 
      projectId: devis[0]?.projectId, 
      state: devis[0]?.state, 
      totalHT: devis[0]?.totalHT,
      dataTotalHT: devis[0]?.data?.totalHT,
      keys: Object.keys(devis[0] || {}).slice(0, 10)
    } : null
  };

  // Calcul CA Planifié (devis "to order" uniquement)
  let totalCAPlanifie = 0;
  const projectsWithToOrderDevis = new Set<number>();

  const parProjet: ChargeTravauxProjet[] = [];
  const universMap = new Map<string, ChargeTravauxUniversStats>();
  const etatMap = new Map<string, ChargeParEtatStats>();

  // Initialiser les stats par état
  for (const [etat, label] of Object.entries(STATE_MAPPING)) {
    etatMap.set(etat, {
      etat,
      etatLabel: label,
      nbDossiers: 0,
      totalHeuresRdv: 0,
      totalHeuresTech: 0,
      totalNbTechs: 0,
      devisHT: 0
    });
  }

  for (const project of projects) {
    // Filtrer par state (API values)
    const state = String(project?.state || '').toLowerCase();
    if (!ETATS_ELIGIBLES.has(state)) continue;

    debug.projectsEligibleState++;

    const projectId = Number(project.id);
    const etatLabel = STATE_MAPPING[state] || state;

    // Récupérer les interventions du projet via le croisement projectId
    const intervs = byProjectId.get(projectId) || [];

    let heuresRdv = 0;
    let heuresTech = 0;
    let maxNbTechs = 0;

    for (const itv of intervs) {
      const { heuresRdv: hRdv, heuresTech: hTech, nbTechs: nTech, blocksCount } = extractHoursFromIntervention(itv, creneauxByInterventionId);
      heuresRdv += hRdv;
      heuresTech += hTech;
      maxNbTechs = Math.max(maxNbTechs, nTech);
      debug.rtBlocksCount += blocksCount;
    }

    if (heuresRdv > 0 || heuresTech > 0) {
      debug.projectsAvecRT++;
    }

    // Calcul du CA devis pour ce projet
    const projectDevis = devisByProjectId.get(projectId) || [];
    if (projectDevis.length > 0) {
      debug.devisMatchedToProjects += projectDevis.length;
    }
    const totalDevisHTProjet = calculateDevisHTForProject(projectDevis);
    if (totalDevisHTProjet > 0) {
      debug.devisHTCalculated += totalDevisHTProjet;
    }

    // Calcul CA Planifié (devis "to order" uniquement)
    const caPlanifieProjet = calculateCAPlanifieForProject(projectDevis);
    if (caPlanifieProjet > 0 && !projectsWithToOrderDevis.has(projectId)) {
      totalCAPlanifie += caPlanifieProjet;
      projectsWithToOrderDevis.add(projectId);
      debug.caPlanifieDevisCount++;
    }

    // Univers du projet
    const universes = (project?.data?.universes as string[]) || ['Non classé'];
    const normalizedUniverses = universes.map(normalizeUnivers);

    // --- Enrichissement pilotage avancé ---
    // createdAt & ageDays
    const rawCreatedAt = project?.created_at ?? project?.date ?? project?.createdAt ?? project?.data?.createdAt ?? null;
    const createdAtStr = rawCreatedAt ? String(rawCreatedAt) : null;
    let ageDays: number | null = null;
    if (createdAtStr) {
      const createdDate = new Date(createdAtStr);
      if (!isNaN(createdDate.getTime())) {
        ageDays = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    // dataQualityFlags
    const dataQualityFlags: string[] = [];
    if (heuresTech === 0) dataQualityFlags.push('missing_hours');
    if (totalDevisHTProjet === 0) dataQualityFlags.push('missing_devis');
    if (normalizedUniverses.length === 1 && normalizedUniverses[0] === 'Non classé') dataQualityFlags.push('missing_univers');
    if (ageDays === null) dataQualityFlags.push('missing_created_at');

    // Check for planned date
    let hasPlannedDate = false;
    for (const itv of intervs) {
      const d = itv?.dateReelle ?? itv?.date;
      if (d) { hasPlannedDate = true; break; }
      const visites = Array.isArray(itv?.visites) ? itv.visites : (Array.isArray(itv?.data?.visites) ? itv.data.visites : []);
      for (const v of visites) {
        if (v?.dateReelle ?? v?.date) { hasPlannedDate = true; break; }
      }
      if (hasPlannedDate) break;
    }
    if (!hasPlannedDate) dataQualityFlags.push('missing_planned_date');

    // technicianIds — comprehensive extraction (aligned with caParTechnicienCore)
    const techIdSet = new Set<string>();
    for (const itv of intervs) {
      const uid = itv?.userId ?? itv?.user_id;
      if (uid) techIdSet.add(String(uid));
      const uids = itv?.usersIds ?? itv?.data?.usersIds;
      if (Array.isArray(uids)) for (const u of uids) { if (u) techIdSet.add(String(u)); }
      // From visites
      const visites = itv?.visites ?? itv?.data?.visites ?? [];
      if (Array.isArray(visites)) {
        for (const v of visites) {
          const vIds = v?.usersIds ?? v?.userIds ?? [];
          if (Array.isArray(vIds)) for (const u of vIds) { if (u) techIdSet.add(String(u)); }
        }
      }
      // From biV3.items
      const biV3Items = itv?.data?.biV3?.items;
      if (Array.isArray(biV3Items)) {
        for (const item of biV3Items) {
          if (Array.isArray(item?.usersIds)) for (const u of item.usersIds) { if (u) techIdSet.add(String(u)); }
        }
      }
    }
    const technicianIds = Array.from(techIdSet);

    // riskFlux
    const riskFlux = ageDays === null ? 0.5 : ageDays > 30 ? 1.0 : ageDays > 15 ? 0.6 : ageDays > 7 ? 0.3 : 0;

    // riskData
    const riskData = dataQualityFlags.length / 5;

    // riskValue
    let riskValue = 0;
    const isAdvanced = state === 'devis_to_order' || state === 'wait_fourn';
    if (totalDevisHTProjet === 0 && isAdvanced) {
      riskValue = 1.0;
    } else if (totalDevisHTProjet > 5000 && ageDays !== null && ageDays > 15) {
      riskValue = 0.8;
    } else if (totalDevisHTProjet === 0 && state === 'to_planify_tvx') {
      riskValue = 0.4;
    } else if (totalDevisHTProjet > 0 && totalDevisHTProjet < 500) {
      riskValue = 0.3;
    }

    const riskScoreGlobal = 0.25 * riskFlux + 0.40 * riskData + 0.35 * riskValue;

    // includedInForecastCalc: devisHT > 0 et devis non draft/rejected/canceled (already filtered by calculateDevisHTForProject)
    const includedInForecastCalc = totalDevisHTProjet > 0;

    // includedInChargeCalc: heures > 0 et (technicien ou date planifiée)
    const includedInChargeCalc = heuresTech > 0 && (technicianIds.length > 0 || hasPlannedDate);

    parProjet.push({
      projectId,
      reference: project.ref || project.reference,
      label: project.label || project.name,
      etatWorkflow: state,
      etatWorkflowLabel: etatLabel,
      universes: normalizedUniverses,
      totalHeuresRdv: heuresRdv,
      totalHeuresTech: heuresTech,
      nbTechs: maxNbTechs,
      devisHT: totalDevisHTProjet,
      createdAt: createdAtStr,
      ageDays,
      riskFlux,
      riskData,
      riskValue,
      riskScoreGlobal,
      dataQualityFlags,
      includedInForecastCalc,
      includedInChargeCalc,
      technicianIds,
    });

    // Mise à jour des stats par état
    const etatStats = etatMap.get(state);
    if (etatStats) {
      etatStats.nbDossiers++;
      etatStats.totalHeuresRdv += heuresRdv;
      etatStats.totalHeuresTech += heuresTech;
      etatStats.totalNbTechs += maxNbTechs;
      etatStats.devisHT += totalDevisHTProjet;
    }

    // Ventilation par univers (répartition égale si multiple)
    const universeCount = normalizedUniverses.length || 1;
    const heuresRdvShare = heuresRdv / universeCount;
    const heuresTechShare = heuresTech / universeCount;
    const devisHTShare = totalDevisHTProjet / universeCount;

    for (const univers of normalizedUniverses) {
      if (!universMap.has(univers)) {
        universMap.set(univers, {
          univers,
          nbDossiers: 0,
          totalHeuresRdv: 0,
          totalHeuresTech: 0,
          totalHeuresTech_A_planifier_TVX: 0,
          totalHeuresTech_A_commander: 0,
          totalHeuresTech_En_attente_fournitures: 0,
          devisHTTotal: 0,
          devisHT_A_planifier_TVX: 0,
          devisHT_A_commander: 0,
          devisHT_En_attente_fournitures: 0
        });
      }

      const stats = universMap.get(univers)!;
      stats.nbDossiers++;
      stats.totalHeuresRdv += heuresRdvShare;
      stats.totalHeuresTech += heuresTechShare;
      stats.devisHTTotal += devisHTShare;

      // Ventilation par état
      if (state === 'to_planify_tvx') {
        stats.totalHeuresTech_A_planifier_TVX += heuresTechShare;
        stats.devisHT_A_planifier_TVX += devisHTShare;
      } else if (state === 'devis_to_order') {
        stats.totalHeuresTech_A_commander += heuresTechShare;
        stats.devisHT_A_commander += devisHTShare;
      } else if (state === 'wait_fourn') {
        stats.totalHeuresTech_En_attente_fournitures += heuresTechShare;
        stats.devisHT_En_attente_fournitures += devisHTShare;
      }
    }
  }

  const parUnivers = Array.from(universMap.values())
    .sort((a, b) => b.totalHeuresTech - a.totalHeuresTech);

  const parEtat = Array.from(etatMap.values())
    .filter(e => e.nbDossiers > 0)
    .sort((a, b) => b.nbDossiers - a.nbDossiers);

  const totaux = {
    totalHeuresRdv: parProjet.reduce((sum, p) => sum + p.totalHeuresRdv, 0),
    totalHeuresTech: parProjet.reduce((sum, p) => sum + p.totalHeuresTech, 0),
    totalNbTechs: parProjet.reduce((sum, p) => sum + p.nbTechs, 0),
    nbDossiers: parProjet.length,
    totalDevisHT: parProjet.reduce((sum, p) => sum + p.devisHT, 0),
    caPlanifie: totalCAPlanifie
  };

  // --- Agrégats pilotage avancé ---
  const total = parProjet.length;

  // dataQuality
  const withHours = parProjet.filter(p => p.totalHeuresTech > 0).length;
  const withDevis = parProjet.filter(p => p.devisHT > 0).length;
  const withUnivers = parProjet.filter(p => !p.dataQualityFlags.includes('missing_univers')).length;
  const withPlannedDate = parProjet.filter(p => !p.dataQualityFlags.includes('missing_planned_date')).length;
  const flagCounts: Record<string, number> = {};
  for (const p of parProjet) {
    for (const f of p.dataQualityFlags) {
      flagCounts[f] = (flagCounts[f] || 0) + 1;
    }
  }
  const dataQuality: DataQualityInfo = {
    score: total > 0 ? Math.round(100 * (withHours + withDevis + withUnivers + withPlannedDate) / (4 * total)) : 0,
    withHours, withDevis, withUnivers, withPlannedDate, total,
    flags: flagCounts,
  };

  // pipelineMaturity (priority: planifie > bloque > pret_planification > a_commander > commercial)
  const pipelineMaturity: PipelineMaturityInfo = { commercial: 0, a_commander: 0, pret_planification: 0, planifie: 0, bloque: 0 };
  for (const p of parProjet) {
    const hasFuturePlannedDate = !p.dataQualityFlags.includes('missing_planned_date');
    if (hasFuturePlannedDate) {
      pipelineMaturity.planifie++;
    } else if (p.etatWorkflow === 'wait_fourn') {
      pipelineMaturity.bloque++;
    } else if (p.etatWorkflow === 'to_planify_tvx' && p.includedInForecastCalc) {
      pipelineMaturity.pret_planification++;
    } else if (p.etatWorkflow === 'devis_to_order') {
      pipelineMaturity.a_commander++;
    } else {
      pipelineMaturity.commercial++;
    }
  }

  // pipelineAging
  const pipelineAging: PipelineAgingInfo = { bucket_0_7: 0, bucket_8_15: 0, bucket_16_30: 0, bucket_30_plus: 0, unknown: 0 };
  for (const p of parProjet) {
    if (p.ageDays === null) { pipelineAging.unknown++; }
    else if (p.ageDays <= 7) { pipelineAging.bucket_0_7++; }
    else if (p.ageDays <= 15) { pipelineAging.bucket_8_15++; }
    else if (p.ageDays <= 30) { pipelineAging.bucket_16_30++; }
    else { pipelineAging.bucket_30_plus++; }
  }

  // riskProjects (filtered > 0.6, sorted desc)
  const riskProjects: RiskProjectEntry[] = parProjet
    .filter(p => p.riskScoreGlobal > 0.6)
    .sort((a, b) => b.riskScoreGlobal - a.riskScoreGlobal)
    .map(p => ({
      projectId: p.projectId,
      reference: p.reference,
      label: p.label,
      riskScoreGlobal: p.riskScoreGlobal,
      riskFlux: p.riskFlux,
      riskData: p.riskData,
      riskValue: p.riskValue,
      ageDays: p.ageDays,
      devisHT: p.devisHT,
      etatWorkflowLabel: p.etatWorkflowLabel,
    }));

  // chargeByTechnician (aggregation per intervention, split hours among techs)
  const techMap = new Map<string, { hours: number; projectIds: Set<number | string> }>();
  for (const p of parProjet) {
    const intervs = byProjectId.get(Number(p.projectId)) || [];
    for (const itv of intervs) {
      const { heuresTech: hTech } = extractHoursFromIntervention(itv);
      if (hTech === 0) continue;
      const ids: string[] = [];
      const uid = itv?.userId ?? itv?.user_id;
      if (uid) ids.push(String(uid));
      const uids = itv?.usersIds ?? itv?.data?.usersIds;
      if (Array.isArray(uids)) for (const u of uids) { if (u && !ids.includes(String(u))) ids.push(String(u)); }
      // From visites
      const visites = itv?.visites ?? itv?.data?.visites ?? [];
      if (Array.isArray(visites)) {
        for (const v of visites) {
          const vIds = v?.usersIds ?? v?.userIds ?? [];
          if (Array.isArray(vIds)) for (const u of vIds) { const s = String(u); if (u && !ids.includes(s)) ids.push(s); }
        }
      }
      // From biV3.items
      const biV3Items = itv?.data?.biV3?.items;
      if (Array.isArray(biV3Items)) {
        for (const item of biV3Items) {
          if (Array.isArray(item?.usersIds)) for (const u of item.usersIds) { const s = String(u); if (u && !ids.includes(s)) ids.push(s); }
        }
      }
      if (ids.length === 0) continue;
      const share = hTech / ids.length;
      for (const tid of ids) {
        if (!techMap.has(tid)) techMap.set(tid, { hours: 0, projectIds: new Set() });
        const entry = techMap.get(tid)!;
        entry.hours += share;
        entry.projectIds.add(p.projectId);
      }
    }
  }
  const chargeByTechnician: TechnicianCharge[] = Array.from(techMap.entries())
    .map(([technicianId, v]) => ({ technicianId, hours: Math.round(v.hours * 10) / 10, projects: v.projectIds.size }))
    .sort((a, b) => b.hours - a.hours);

  // weeklyLoad (S to S+3 from today)
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  // Get monday of current week
  const dayOfWeek = nowDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const currentMonday = new Date(nowDate);
  currentMonday.setDate(nowDate.getDate() + mondayOffset);

  const weekBuckets: { start: Date; label: string; hours: number; projectIds: Set<number | string> }[] = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() + w * 7);
    const weekNum = getISOWeekNumber(weekStart);
    weekBuckets.push({ start: weekStart, label: `S${weekNum}`, hours: 0, projectIds: new Set() });
  }
  const weekEndMs = new Date(weekBuckets[3].start);
  weekEndMs.setDate(weekEndMs.getDate() + 7);

  for (const p of parProjet) {
    const intervs = byProjectId.get(Number(p.projectId)) || [];
    let placedByDate = false;

    // Try to place by real intervention date first
    for (const itv of intervs) {
      const dates = getInterventionDates(itv);
      const { heuresTech: hTech } = extractHoursFromIntervention(itv);
      for (const d of dates) {
        const dMs = d.getTime();
        if (dMs < currentMonday.getTime() || dMs >= weekEndMs.getTime()) continue;
        for (const bucket of weekBuckets) {
          const bucketEnd = new Date(bucket.start);
          bucketEnd.setDate(bucket.start.getDate() + 7);
          if (dMs >= bucket.start.getTime() && dMs < bucketEnd.getTime()) {
            bucket.hours += hTech;
            bucket.projectIds.add(p.projectId);
            placedByDate = true;
            break;
          }
        }
      }
    }

    // If no date found, distribute by workflow status
    if (!placedByDate && p.totalHeuresTech > 0) {
      let targetWeekIdx: number;
      switch (p.etatWorkflow) {
        case 'to_planify_tvx': targetWeekIdx = 1; break; // S+1
        case 'devis_to_order': targetWeekIdx = 2; break;  // S+2
        case 'wait_fourn': targetWeekIdx = 3; break;       // S+3
        default: targetWeekIdx = 2; break;
      }
      if (targetWeekIdx < weekBuckets.length) {
        weekBuckets[targetWeekIdx].hours += p.totalHeuresTech;
        weekBuckets[targetWeekIdx].projectIds.add(p.projectId);
      }
    }
  }
  const weeklyLoad: WeeklyLoadEntry[] = weekBuckets.map(b => ({
    weekLabel: b.label,
    weekStart: b.start.toISOString().slice(0, 10),
    hours: Math.round(b.hours * 10) / 10,
    projects: b.projectIds.size,
  }));

  return {
    parUnivers,
    parEtat,
    parProjet,
    totaux,
    debug,
    dataQuality,
    pipelineMaturity,
    pipelineAging,
    riskProjects,
    chargeByTechnician,
    weeklyLoad,
  };
}

/** Get ISO week number */
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Extract all valid dates from an intervention */
function getInterventionDates(itv: any): Date[] {
  const dates: Date[] = [];
  const tryAdd = (v: any) => {
    if (!v) return;
    const d = new Date(v);
    if (!isNaN(d.getTime())) dates.push(d);
  };
  tryAdd(itv?.dateReelle);
  tryAdd(itv?.date);
  const visites = Array.isArray(itv?.visites) ? itv.visites : (Array.isArray(itv?.data?.visites) ? itv.data.visites : []);
  for (const v of visites) {
    tryAdd(v?.dateReelle);
    tryAdd(v?.date);
  }
  return dates;
}
