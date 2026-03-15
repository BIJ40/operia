/**
 * Moteur de calcul de la charge de travail TRAVAUX à venir
 * Croisement projets ↔ interventions ↔ devis via projectId
 * 
 * MVP Prévisionnel: enrichi avec pipeline maturity, risk scoring 3D,
 * data quality flags, charge par technicien/semaine
 */

import { getISOWeek, getISOWeekYear, startOfWeek, addWeeks } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────

export type DataQualityFlag =
  | 'MISSING_DEVIS_AMOUNT'
  | 'MISSING_TECHNICIAN'
  | 'MISSING_HOURS'
  | 'MISSING_PLANNED_DATE'
  | 'MULTIPLE_VISITS_NO_PROGRESS';

export type PipelineMaturity =
  | 'commercial'
  | 'a_commander'
  | 'pret_planification'
  | 'planifie'
  | 'bloque';

export interface ChargeTechnicien {
  techId: number;
  techName: string;
  nbDossiers: number;
  heuresPlanifiees: number;
  caPrevu: number;
  tauxCharge: number; // heures / (35 * 4)
}

export interface PipelineAgeBucket {
  bucket: '0-7j' | '8-15j' | '16-30j' | '30+j';
  nbDossiers: number;
  caTotal: number;
}

export interface ChargeParSemaine {
  week: string; // "2026-W12"
  heuresPlanifiees: number;
  heuresDisponibles: number;
  tauxCharge: number;
}

// ─── Mapping des états ───────────────────────────────────────────────

const STATE_MAPPING: Record<string, string> = {
  'to_planify_tvx': 'À planifier TVX',
  'devis_to_order': 'À commander',
  'wait_fourn': 'En attente fournitures',
  'planified_tvx': 'Planifié TVX',
};

const ETATS_ELIGIBLES = new Set([
  'to_planify_tvx',
  'devis_to_order',
  'wait_fourn',
  'planified_tvx',
]);

const DEVIS_ETATS_EXCLUS = new Set(['draft', 'rejected', 'canceled']);

// ─── Interfaces projets / résultats ─────────────────────────────────

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
  // MVP enrichments
  technicienIds: number[];
  dateCreation: string | null;
  ageJours: number;
  pipelineMaturity: PipelineMaturity;
  riskFlux: number;
  riskData: number;
  riskValue: number;
  riskScoreGlobal: number;
  dataQualityFlags: DataQualityFlag[];
  includedInForecastCalc: boolean;
  includedInChargeCalc: boolean;
  hasPlannedDate: boolean;
}

export interface ChargeTravauxUniversStats {
  univers: string;
  nbDossiers: number;
  totalHeuresRdv: number;
  totalHeuresTech: number;
  totalHeuresTech_A_planifier_TVX: number;
  totalHeuresTech_A_commander: number;
  totalHeuresTech_En_attente_fournitures: number;
  totalHeuresTech_Planifie_TVX: number;
  devisHTTotal: number;
  devisHT_A_planifier_TVX: number;
  devisHT_A_commander: number;
  devisHT_En_attente_fournitures: number;
  devisHT_Planifie_TVX: number;
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
  // MVP enrichments
  parTechnicien: ChargeTechnicien[];
  pipelineAge: PipelineAgeBucket[];
  dossiersRisque: ChargeTravauxProjet[];
  chargeParSemaine: ChargeParSemaine[];
  forecastReliabilityScore: number;
  caPipelineTotal: number;
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
    sampleDevis: Record<string, unknown> | null;
  };
}

// ─── Helpers internes ────────────────────────────────────────────────

function groupInterventionsByProjectId(interventions: any[]): Map<number, any[]> {
  const map = new Map<number, any[]>();
  for (const itv of interventions) {
    const pid = itv?.projectId ?? itv?.project_id;
    if (!pid) continue;
    const key = Number(pid);
    if (isNaN(key)) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(itv);
  }
  return map;
}

function groupDevisByProjectId(devis: any[]): Map<number, any[]> {
  const map = new Map<number, any[]>();
  for (const d of devis) {
    const pid = d?.projectId ?? d?.project_id;
    if (!pid) continue;
    const key = Number(pid);
    if (isNaN(key)) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  return map;
}

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

function extractHoursFromIntervention(intervention: any): {
  heuresRdv: number;
  heuresTech: number;
  nbTechs: number;
  blocksCount: number;
} {
  const chiffrage = intervention?.data?.chiffrage;
  if (!chiffrage?.postes || !Array.isArray(chiffrage.postes)) {
    return { heuresRdv: 0, heuresTech: 0, nbTechs: 0, blocksCount: 0 };
  }

  let totalHeures = 0;
  let totalHeuresTech = 0;
  let maxNbTechs = 0;
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
            if (
              slug.includes('nombre_de techniciens') ||
              slug.includes('nombre_de_techniciens')
            ) {
              const val = parseNumericValue(df.value);
              if (val > 0 && nbTechs === 0) nbTechs = val;
            }
            if (
              slug.includes("temps_total d'intervention") ||
              slug.includes("temps_total_d'intervention") ||
              slug.includes('temps_total')
            ) {
              const val = parseNumericValue(df.value);
              if (val > 0 && nbHeures === 0) nbHeures = val;
            }
          }
        }
      }

      if (nbHeures <= 0) continue;
      if (nbTechs <= 0) nbTechs = 1;

      totalHeures += nbHeures;
      totalHeuresTech += nbHeures * nbTechs;
      maxNbTechs = Math.max(maxNbTechs, nbTechs);
    }
  }

  return {
    heuresRdv: totalHeures,
    heuresTech: totalHeuresTech,
    nbTechs: maxNbTechs,
    blocksCount,
  };
}

function normalizeUnivers(univers: string): string {
  const mapping: Record<string, string> = {
    ame_logement: 'Aménagement PMR',
    amelioration_logement: 'Aménagement PMR',
    pmr: 'Aménagement PMR',
    renovation: 'Rénovation',
    plomberie: 'Plomberie',
    electricite: 'Électricité',
    serrurerie: 'Serrurerie',
    recherche_fuite: 'Recherche de fuite',
    vitrerie: 'Vitrerie',
    multiservice: 'Multiservice',
  };
  const normalized = univers.toLowerCase().trim();
  return mapping[normalized] || univers;
}

function calculateDevisHTForProject(projectDevis: any[]): number {
  let total = 0;
  for (const d of projectDevis) {
    const devisState = String(d.state || '').toLowerCase();
    if (DEVIS_ETATS_EXCLUS.has(devisState)) continue;
    const montant =
      parseNumericValue(d.data?.totalHT) ||
      parseNumericValue(d.data?.totalTTC) ||
      parseNumericValue(d.totalHT) ||
      parseNumericValue(d.amount) ||
      0;
    if (montant > 0) total += montant;
  }
  return total;
}

function isDevisToOrder(d: any): boolean {
  const state = String(d?.state ?? d?.status ?? d?.data?.state ?? '')
    .trim()
    .toLowerCase();
  return state === 'to order' || state === 'to_order' || state === 'order';
}

function calculateCAPlanifieForProject(projectDevis: any[]): number {
  for (const d of projectDevis) {
    if (!isDevisToOrder(d)) continue;
    const montant =
      parseNumericValue(d.data?.totalHT) ||
      parseNumericValue(d.totalHT) ||
      parseNumericValue(d.amount) ||
      0;
    if (montant > 0) return montant;
  }
  return 0;
}

// ─── Extractors pour enrichment single-pass ─────────────────────────

function extractTechnicienIds(intervs: any[]): number[] {
  const ids = new Set<number>();
  for (const itv of intervs) {
    const uid = Number(itv?.userId ?? itv?.user_id);
    if (Number.isFinite(uid) && uid > 0) ids.add(uid);
    const visites = Array.isArray(itv?.visites) ? itv.visites : [];
    for (const v of visites) {
      const vUsers = Array.isArray(v?.usersIds) ? v.usersIds : [];
      for (const u of vUsers) {
        const n = Number(u);
        if (Number.isFinite(n) && n > 0) ids.add(n);
      }
    }
  }
  return Array.from(ids);
}

function extractPlannedDate(intervs: any[]): Date | null {
  for (const itv of intervs) {
    const raw = itv?.dateReelle ?? itv?.date;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
    const visites = Array.isArray(itv?.visites) ? itv.visites : [];
    for (const v of visites) {
      const vd = v?.dateReelle ?? v?.date;
      if (vd) {
        const d = new Date(vd);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }
  return null;
}

function hasMultipleVisitsNoProgress(intervs: any[]): boolean {
  let totalVisites = 0;
  for (const itv of intervs) {
    const visites = Array.isArray(itv?.visites) ? itv.visites : [];
    totalVisites += visites.length;
  }
  // 2+ visits counted but state still in pipeline = no progress
  return totalVisites >= 2;
}

// ─── Pipeline maturity (bloque prioritaire) ─────────────────────────

function computePipelineMaturity(
  state: string,
  hasDevis: boolean,
  hasIntervention: boolean,
  hasTech: boolean,
  ageJours: number
): PipelineMaturity {
  // bloque: wait_fourn AND age > 15j — prioritaire
  if (state === 'wait_fourn' && ageJours > 15) return 'bloque';
  if (state === 'planified_tvx') return 'planifie';
  if (state === 'to_planify_tvx' && hasDevis) return 'pret_planification';
  if (state === 'devis_to_order') return 'a_commander';
  return 'commercial';
}

// ─── Risk scoring 3D ────────────────────────────────────────────────

function computeRiskScores(
  state: string,
  ageJours: number,
  heuresTech: number,
  technicienIds: number[],
  devisHT: number,
  multiVisitsNoProgress: boolean
): { riskFlux: number; riskData: number; riskValue: number; riskScoreGlobal: number } {
  // Flux (0-33)
  let riskFlux = 0;
  if (ageJours > 30) riskFlux += 15;
  else if (ageJours > 15) riskFlux += 8;
  if (state === 'wait_fourn') riskFlux += 10;
  if (multiVisitsNoProgress) riskFlux += 10;
  riskFlux = Math.min(33, riskFlux);

  // Data (0-33)
  let riskData = 0;
  if (heuresTech === 0) riskData += 11;
  if (technicienIds.length === 0) riskData += 11;
  if (devisHT === 0) riskData += 11;
  riskData = Math.min(33, riskData);

  // Value (0-34)
  let riskValue = 0;
  if (devisHT > 10000) riskValue += 17;
  else if (devisHT > 5000) riskValue += 10;
  else if (devisHT > 2000) riskValue += 7;
  riskValue = Math.min(34, riskValue);

  return {
    riskFlux,
    riskData,
    riskValue,
    riskScoreGlobal: Math.min(100, riskFlux + riskData + riskValue),
  };
}

// ─── Data quality flags ─────────────────────────────────────────────

function computeDataQualityFlags(
  devisHT: number,
  technicienIds: number[],
  heuresTech: number,
  hasPlannedDate: boolean,
  multiVisitsNoProgress: boolean
): DataQualityFlag[] {
  const flags: DataQualityFlag[] = [];
  if (devisHT === 0) flags.push('MISSING_DEVIS_AMOUNT');
  if (technicienIds.length === 0) flags.push('MISSING_TECHNICIAN');
  if (heuresTech === 0) flags.push('MISSING_HOURS');
  if (!hasPlannedDate) flags.push('MISSING_PLANNED_DATE');
  if (multiVisitsNoProgress) flags.push('MULTIPLE_VISITS_NO_PROGRESS');
  return flags;
}

// ─── Post-loop aggregations ─────────────────────────────────────────

export function computeChargeParTechnicien(
  parProjet: ChargeTravauxProjet[],
  users: any[]
): ChargeTechnicien[] {
  const techMap = new Map<
    number,
    { nbDossiers: number; heures: number; ca: number }
  >();

  for (const p of parProjet) {
    for (const tid of p.technicienIds) {
      if (!techMap.has(tid)) techMap.set(tid, { nbDossiers: 0, heures: 0, ca: 0 });
      const t = techMap.get(tid)!;
      t.nbDossiers++;
      t.heures += p.totalHeuresTech / Math.max(1, p.technicienIds.length);
      t.ca += p.devisHT / Math.max(1, p.technicienIds.length);
    }
  }

  // Build user name map
  const nameMap = new Map<number, string>();
  for (const u of users) {
    const id = Number(u?.id);
    if (!Number.isFinite(id)) continue;
    const first = u?.firstName || u?.prenom || '';
    const last = u?.lastName || u?.nom || '';
    nameMap.set(id, `${first} ${last}`.trim() || `Tech #${id}`);
  }

  const result: ChargeTechnicien[] = [];
  for (const [techId, data] of techMap) {
    result.push({
      techId,
      techName: nameMap.get(techId) || `Tech #${techId}`,
      nbDossiers: data.nbDossiers,
      heuresPlanifiees: Math.round(data.heures * 10) / 10,
      caPrevu: Math.round(data.ca),
      tauxCharge: Math.round((data.heures / (35 * 4)) * 100) / 100,
    });
  }

  return result.sort((a, b) => b.heuresPlanifiees - a.heuresPlanifiees);
}

export function computePipelineAge(
  parProjet: ChargeTravauxProjet[]
): PipelineAgeBucket[] {
  const buckets: Record<string, { nbDossiers: number; caTotal: number }> = {
    '0-7j': { nbDossiers: 0, caTotal: 0 },
    '8-15j': { nbDossiers: 0, caTotal: 0 },
    '16-30j': { nbDossiers: 0, caTotal: 0 },
    '30+j': { nbDossiers: 0, caTotal: 0 },
  };

  for (const p of parProjet) {
    let key: string;
    if (p.ageJours <= 7) key = '0-7j';
    else if (p.ageJours <= 15) key = '8-15j';
    else if (p.ageJours <= 30) key = '16-30j';
    else key = '30+j';
    buckets[key].nbDossiers++;
    buckets[key].caTotal += p.devisHT;
  }

  return (['0-7j', '8-15j', '16-30j', '30+j'] as const).map((bucket) => ({
    bucket,
    nbDossiers: buckets[bucket].nbDossiers,
    caTotal: Math.round(buckets[bucket].caTotal),
  }));
}

export function computeChargeParSemaine(
  parProjet: ChargeTravauxProjet[],
  interventions: any[],
  nbTechs: number
): ChargeParSemaine[] {
  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const heuresDispoParSemaine = nbTechs * 35;

  // Build week keys S, S+1, S+2, S+3
  const weekKeys: string[] = [];
  const weekStarts: Date[] = [];
  for (let i = 0; i < 4; i++) {
    const ws = addWeeks(currentWeekStart, i);
    weekStarts.push(ws);
    const isoWeek = getISOWeek(ws);
    const isoYear = getISOWeekYear(ws);
    weekKeys.push(`${isoYear}-W${String(isoWeek).padStart(2, '0')}`);
  }

  // Collect eligible project IDs
  const eligibleProjectIds = new Set(
    parProjet.filter((p) => p.hasPlannedDate).map((p) => Number(p.projectId))
  );

  // Sum hours per week from interventions
  const heuresParSemaine = new Map<string, number>();
  for (const key of weekKeys) heuresParSemaine.set(key, 0);

  for (const itv of interventions) {
    const pid = Number(itv?.projectId ?? itv?.project_id);
    if (!eligibleProjectIds.has(pid)) continue;

    const plannedDate = extractPlannedDate([itv]);
    if (!plannedDate) continue;

    const isoWeek = getISOWeek(plannedDate);
    const isoYear = getISOWeekYear(plannedDate);
    const weekKey = `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;

    if (!heuresParSemaine.has(weekKey)) continue; // outside S-S+3

    const { heuresTech } = extractHoursFromIntervention(itv);
    heuresParSemaine.set(weekKey, (heuresParSemaine.get(weekKey) || 0) + heuresTech);
  }

  return weekKeys.map((week) => {
    const heuresPlanifiees = Math.round((heuresParSemaine.get(week) || 0) * 10) / 10;
    return {
      week,
      heuresPlanifiees,
      heuresDisponibles: heuresDispoParSemaine,
      tauxCharge:
        heuresDispoParSemaine > 0
          ? Math.round((heuresPlanifiees / heuresDispoParSemaine) * 100) / 100
          : 0,
    };
  });
}

export function computeForecastReliability(
  parProjet: ChargeTravauxProjet[]
): number {
  if (parProjet.length === 0) return 0;

  const n = parProjet.length;
  let withDevis = 0;
  let withHours = 0;
  let withTech = 0;
  let withDate = 0;

  for (const p of parProjet) {
    if (p.devisHT > 0) withDevis++;
    if (p.totalHeuresTech > 0) withHours++;
    if (p.technicienIds.length > 0) withTech++;
    if (p.hasPlannedDate) withDate++;
  }

  const score =
    ((withDevis / n + withHours / n + withTech / n + withDate / n) / 4) * 100;
  return Math.round(score);
}

// ─── Fonction principale ────────────────────────────────────────────

export function computeChargeTravauxAvenirParUnivers(
  projects: any[],
  interventions: any[],
  devis: any[] = [],
  users: any[] = []
): ChargeTravauxResult {
  const byProjectId = groupInterventionsByProjectId(interventions);
  const devisByProjectId = groupDevisByProjectId(devis);

  const now = new Date();
  const nowMs = now.getTime();

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
    sampleDevis:
      devis.length > 0
        ? {
            id: devis[0]?.id,
            projectId: devis[0]?.projectId,
            state: devis[0]?.state,
            totalHT: devis[0]?.totalHT,
            dataTotalHT: devis[0]?.data?.totalHT,
            keys: Object.keys(devis[0] || {}).slice(0, 10),
          }
        : null,
  };

  let totalCAPlanifie = 0;
  const projectsWithToOrderDevis = new Set<number>();

  const parProjet: ChargeTravauxProjet[] = [];
  const universMap = new Map<string, ChargeTravauxUniversStats>();
  const etatMap = new Map<string, ChargeParEtatStats>();

  // Init per-state stats
  for (const [etat, label] of Object.entries(STATE_MAPPING)) {
    etatMap.set(etat, {
      etat,
      etatLabel: label,
      nbDossiers: 0,
      totalHeuresRdv: 0,
      totalHeuresTech: 0,
      totalNbTechs: 0,
      devisHT: 0,
    });
  }

  // ─── SINGLE PASS over projects ────────────────────────────────
  for (const project of projects) {
    const state = String(project?.state || '').toLowerCase();
    if (!ETATS_ELIGIBLES.has(state)) continue;

    debug.projectsEligibleState++;

    const projectId = Number(project.id);
    const etatLabel = STATE_MAPPING[state] || state;

    // Interventions for this project
    const intervs = byProjectId.get(projectId) || [];

    let heuresRdv = 0;
    let heuresTech = 0;
    let maxNbTechs = 0;

    for (const itv of intervs) {
      const extracted = extractHoursFromIntervention(itv);
      heuresRdv += extracted.heuresRdv;
      heuresTech += extracted.heuresTech;
      maxNbTechs = Math.max(maxNbTechs, extracted.nbTechs);
      debug.rtBlocksCount += extracted.blocksCount;
    }

    if (heuresRdv > 0 || heuresTech > 0) {
      debug.projectsAvecRT++;
    }

    // Devis
    const projectDevis = devisByProjectId.get(projectId) || [];
    if (projectDevis.length > 0) {
      debug.devisMatchedToProjects += projectDevis.length;
    }
    const totalDevisHTProjet = calculateDevisHTForProject(projectDevis);
    if (totalDevisHTProjet > 0) {
      debug.devisHTCalculated += totalDevisHTProjet;
    }

    // CA Planifié
    const caPlanifieProjet = calculateCAPlanifieForProject(projectDevis);
    if (caPlanifieProjet > 0 && !projectsWithToOrderDevis.has(projectId)) {
      totalCAPlanifie += caPlanifieProjet;
      projectsWithToOrderDevis.add(projectId);
      debug.caPlanifieDevisCount++;
    }

    // ─── MVP enrichments (same loop) ──────────────────────────
    const technicienIds = extractTechnicienIds(intervs);
    const plannedDate = extractPlannedDate(intervs);
    const hasPlannedDate = plannedDate !== null;
    const multiVisits = hasMultipleVisitsNoProgress(intervs);

    // Age
    const createdAt = project?.createdAt ?? project?.created_at ?? null;
    const createdDate = createdAt ? new Date(createdAt) : null;
    const ageJours =
      createdDate && !isNaN(createdDate.getTime())
        ? Math.max(0, Math.floor((nowMs - createdDate.getTime()) / 86400000))
        : 0;

    // Pipeline maturity
    const pipelineMaturity = computePipelineMaturity(
      state,
      totalDevisHTProjet > 0,
      intervs.length > 0,
      technicienIds.length > 0,
      ageJours
    );

    // Risk 3D
    const riskScores = computeRiskScores(
      state,
      ageJours,
      heuresTech,
      technicienIds,
      totalDevisHTProjet,
      multiVisits
    );

    // Data quality flags
    const dataQualityFlags = computeDataQualityFlags(
      totalDevisHTProjet,
      technicienIds,
      heuresTech,
      hasPlannedDate,
      multiVisits
    );

    // Inclusion flags
    const includedInForecastCalc =
      totalDevisHTProjet > 0 && hasPlannedDate;
    const includedInChargeCalc = heuresTech > 0 && technicienIds.length > 0;

    // Universes
    const universes = (project?.data?.universes as string[]) || ['Non classé'];
    const normalizedUniverses = universes.map(normalizeUnivers);

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
      technicienIds,
      dateCreation: createdAt ? String(createdAt) : null,
      ageJours,
      pipelineMaturity,
      ...riskScores,
      dataQualityFlags,
      includedInForecastCalc,
      includedInChargeCalc,
      hasPlannedDate,
    });

    // Per-state stats
    const etatStats = etatMap.get(state);
    if (etatStats) {
      etatStats.nbDossiers++;
      etatStats.totalHeuresRdv += heuresRdv;
      etatStats.totalHeuresTech += heuresTech;
      etatStats.totalNbTechs += maxNbTechs;
      etatStats.devisHT += totalDevisHTProjet;
    }

    // Per-universe stats
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
          totalHeuresTech_Planifie_TVX: 0,
          devisHTTotal: 0,
          devisHT_A_planifier_TVX: 0,
          devisHT_A_commander: 0,
          devisHT_En_attente_fournitures: 0,
          devisHT_Planifie_TVX: 0,
        });
      }

      const stats = universMap.get(univers)!;
      stats.nbDossiers++;
      stats.totalHeuresRdv += heuresRdvShare;
      stats.totalHeuresTech += heuresTechShare;
      stats.devisHTTotal += devisHTShare;

      if (state === 'to_planify_tvx') {
        stats.totalHeuresTech_A_planifier_TVX += heuresTechShare;
        stats.devisHT_A_planifier_TVX += devisHTShare;
      } else if (state === 'devis_to_order') {
        stats.totalHeuresTech_A_commander += heuresTechShare;
        stats.devisHT_A_commander += devisHTShare;
      } else if (state === 'wait_fourn') {
        stats.totalHeuresTech_En_attente_fournitures += heuresTechShare;
        stats.devisHT_En_attente_fournitures += devisHTShare;
      } else if (state === 'planified_tvx') {
        stats.totalHeuresTech_Planifie_TVX += heuresTechShare;
        stats.devisHT_Planifie_TVX += devisHTShare;
      }
    }
  }

  // ─── Post-loop aggregations ─────────────────────────────────────

  const parUnivers = Array.from(universMap.values()).sort(
    (a, b) => b.totalHeuresTech - a.totalHeuresTech
  );

  const parEtat = Array.from(etatMap.values())
    .filter((e) => e.nbDossiers > 0)
    .sort((a, b) => b.nbDossiers - a.nbDossiers);

  const totaux = {
    totalHeuresRdv: parProjet.reduce((sum, p) => sum + p.totalHeuresRdv, 0),
    totalHeuresTech: parProjet.reduce((sum, p) => sum + p.totalHeuresTech, 0),
    totalNbTechs: parProjet.reduce((sum, p) => sum + p.nbTechs, 0),
    nbDossiers: parProjet.length,
    totalDevisHT: parProjet.reduce((sum, p) => sum + p.devisHT, 0),
    caPlanifie: totalCAPlanifie,
  };

  // Count unique techs for weekly capacity
  const uniqueTechIds = new Set<number>();
  for (const p of parProjet) {
    for (const tid of p.technicienIds) uniqueTechIds.add(tid);
  }
  const nbTechsUniques = Math.max(1, uniqueTechIds.size);

  const parTechnicien = computeChargeParTechnicien(parProjet, users);
  const pipelineAge = computePipelineAge(parProjet);
  const chargeParSemaine = computeChargeParSemaine(
    parProjet,
    interventions,
    nbTechsUniques
  );
  const forecastReliabilityScore = computeForecastReliability(parProjet);

  const caPipelineTotal = Math.round(
    parProjet.reduce((sum, p) => sum + p.devisHT, 0)
  );

  const dossiersRisque = [...parProjet]
    .filter((p) => p.riskScoreGlobal > 0)
    .sort((a, b) => b.riskScoreGlobal - a.riskScoreGlobal);

  return {
    parUnivers,
    parEtat,
    parProjet,
    totaux,
    parTechnicien,
    pipelineAge,
    dossiersRisque,
    chargeParSemaine,
    forecastReliabilityScore,
    caPipelineTotal,
    debug,
  };
}
