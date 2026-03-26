/**
 * Financial Calculations Engine — Pure functions for recouvrement/aging/risk
 * V2: Snapshot mode, renamed "âge moyen encours", avoir ambiguity, reliability score
 */

import { parseISO, differenceInDays } from 'date-fns';
import type { Facture, Project, Client } from '@/apogee-connect/types';
import type {
  FinancialInvoice,
  FinancialEntityStats,
  FinancialKPIs,
  FinancialAnalysis,
  FinancialAlert,
  AgingBreakdown,
  AgingBucket,
  EntityType,
  InvoicePaymentStatus,
  DebtRiskLevel,
  DataQualityFlags,
  AvoirMatchStatus,
  FiabiliteScore,
  FiabiliteLevel,
} from '@/apogee-connect/types/financial';

// ─── Helpers ──────────────────────────────────────────────

function safeNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = Number(String(val).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseDateSafe(raw: unknown): Date | null {
  if (!raw) return null;
  try {
    const d = typeof raw === 'string' ? parseISO(raw) : raw instanceof Date ? raw : null;
    return d && !isNaN(d.getTime()) ? d : null;
  } catch {
    return null;
  }
}

function classifyAgingBucket(days: number): AgingBucket {
  if (days <= 30) return '0_30';
  if (days <= 60) return '31_60';
  if (days <= 90) return '61_90';
  return '90_plus';
}

function classifyPaymentStatus(resteDu: number, agingDays: number, isAvoir: boolean): InvoicePaymentStatus {
  if (isAvoir) return 'paid';
  if (resteDu <= 0.01) return 'paid';
  if (agingDays > 90) return 'critical';
  if (agingDays > 60) return 'overdue_90';
  if (agingDays > 30) return 'overdue_60';
  if (resteDu > 0) return 'pending';
  return 'paid';
}

function classifyDebtRisk(entity: { resteDu: number; aging: AgingBreakdown; tauxRecouvrement: number }): DebtRiskLevel {
  if (entity.resteDu <= 0.01) return 'healthy';
  // Classify by the OLDEST bucket that has any outstanding debt
  if (entity.aging['90_plus'] > 0.01) return 'critical';    // + de 90 jours
  if (entity.aging['61_90'] > 0.01) return 'warning';       // 60–90 jours
  if (entity.aging['31_60'] > 0.01) return 'watch';          // 30–60 jours
  return 'healthy';                                           // < 30 jours (RAS)
}

function emptyAging(): AgingBreakdown {
  return { '0_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 };
}

// ─── Avoir matching ─────────────────────────────────────

function classifyAvoirMatch(
  facture: Facture,
  projectsMap: Map<string, Project>
): AvoirMatchStatus {
  const projectId = String(facture.projectId || '');
  const project = projectsMap.get(projectId);
  // Avoir linked to a real project = matched
  if (project && projectId) return 'matched';
  // Avoir with projectId but no matching project = ambiguous
  if (projectId && projectId !== '' && !project) return 'ambiguous';
  // Avoir without any link = unmatched
  return 'unmatched';
}

// ─── Core: resolve entity from project ──────────────────

export function resolveEntityFromProject(
  project: Project | undefined,
  clientsMap: Map<string, Client>
): { entityType: EntityType; entityId: string; entityLabel: string } {
  if (!project) return { entityType: 'unknown', entityId: 'unknown', entityLabel: 'Inconnu' };

  const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
  if (commanditaireId) {
    const cid = String(commanditaireId);
    const client = clientsMap.get(cid);
    const label = client?.raisonSociale || client?.nom || `Apporteur #${cid}`;
    return { entityType: 'apporteur', entityId: cid, entityLabel: label };
  }

  const clientId = String(project.clientId || '');
  if (clientId) {
    const client = clientsMap.get(clientId);
    const label = client?.raisonSociale || client?.nom || `Client #${clientId}`;
    return { entityType: 'client_direct', entityId: clientId, entityLabel: label };
  }

  return { entityType: 'unknown', entityId: 'unknown', entityLabel: 'Non classé' };
}

// ─── Core: extract invoice financial data ────────────────

function extractInvoiceMontantRegle(facture: Facture): { amount: number; isRealData: boolean } {
  const data = (facture as any).data ?? {};

  // Priority 1: calcReglementsTotal (true API field)
  const calcTotal = data.calcReglementsTotal;
  if (calcTotal !== undefined && calcTotal !== null) {
    return { amount: Math.abs(safeNumber(calcTotal)), isRealData: true };
  }

  // Priority 2: sommesPercues array
  const sommesPercues = data.financier?.sommesPercues;
  if (Array.isArray(sommesPercues) && sommesPercues.length > 0) {
    return {
      amount: sommesPercues.reduce((sum: number, sp: any) => sum + Math.abs(safeNumber(sp?.amount)), 0),
      isRealData: true,
    };
  }

  // Priority 3: calc.paidTTC from typed interface
  if (facture.calc?.paidTTC !== undefined) {
    return { amount: Math.abs(safeNumber(facture.calc.paidTTC)), isRealData: true };
  }

  // Priority 4: payment state fallback (NOT real data)
  const state = (facture as any).state;
  const paymentStatus = (facture as any).paymentStatus;
  if (paymentStatus === 'paid' || (state === 'paid' && paymentStatus !== 'partially_paid')) {
    return {
      amount: Math.abs(safeNumber(data.totalTTC ?? (facture as any).totalTTC)),
      isRealData: false,
    };
  }

  return { amount: 0, isRealData: false };
}

// ─── Fiability Score ────────────────────────────────────

function computeFiabiliteScore(quality: DataQualityFlags): FiabiliteScore {
  const total = quality.totalFacturesAnalysees + quality.totalFacturesExclues;
  if (total === 0) return { score: 100, level: 'forte', details: [] };

  const details: FiabiliteScore['details'] = [];

  if (quality.facturesSansDate > 0) {
    details.push({ label: 'Factures sans date', count: quality.facturesSansDate, severity: 'error' });
  }
  if (quality.facturesSansMontant > 0) {
    details.push({ label: 'Factures sans montant', count: quality.facturesSansMontant, severity: 'error' });
  }
  if (quality.facturesSansProject > 0) {
    details.push({ label: 'Factures sans projet', count: quality.facturesSansProject, severity: 'warn' });
  }
  if (quality.projectsSansCommanditaire > 0) {
    details.push({ label: 'Projets sans commanditaire', count: quality.projectsSansCommanditaire, severity: 'warn' });
  }
  if (quality.avoirsNonRapproches > 0) {
    details.push({ label: 'Avoirs non rapprochés', count: quality.avoirsNonRapproches, severity: 'warn' });
  }
  if (quality.reglementsViaFallbackStatut > 0) {
    details.push({ label: 'Règlements estimés (fallback)', count: quality.reglementsViaFallbackStatut, severity: 'warn' });
  }

  // Score: penalize each issue
  const excludedPenalty = total > 0 ? (quality.totalFacturesExclues / total) * 40 : 0;
  const fallbackPenalty = quality.totalFacturesAnalysees > 0
    ? (quality.reglementsViaFallbackStatut / quality.totalFacturesAnalysees) * 20
    : 0;
  const avoirPenalty = quality.avoirsNonRapproches * 2;
  const noProjectPenalty = quality.facturesSansProject * 1;

  const rawScore = Math.max(0, 100 - excludedPenalty - fallbackPenalty - avoirPenalty - noProjectPenalty);
  const score = Math.round(rawScore);

  let level: FiabiliteLevel = 'forte';
  if (score < 75) level = 'fragile';
  else if (score < 90) level = 'moyenne';

  if (quality.reglementsViaDonneeReelle > 0) {
    details.push({
      label: 'Règlements via donnée réelle',
      count: quality.reglementsViaDonneeReelle,
      severity: 'ok',
    });
  }

  return { score, level, details };
}

// ─── Main: build full financial analysis ─────────────────

export function buildFinancialAnalysis(
  factures: Facture[],
  projects: Project[],
  clients: Client[],
  referenceDate: Date = new Date()
): FinancialAnalysis {
  const projectsMap = new Map<string, Project>();
  projects.forEach(p => projectsMap.set(String(p.id), p));

  const clientsMap = new Map<string, Client>();
  clients.forEach(c => clientsMap.set(String(c.id), c));

  const quality: DataQualityFlags = {
    facturesSansDate: 0,
    facturesSansMontant: 0,
    facturesSansProject: 0,
    projectsSansCommanditaire: 0,
    avoirsNonRapproches: 0,
    montantAvoirsAmbigus: 0,
    reglementsViaDonneeReelle: 0,
    reglementsViaFallbackStatut: 0,
    totalFacturesAnalysees: 0,
    totalFacturesExclues: 0,
  };

  const allInvoices: FinancialInvoice[] = [];

  for (const facture of factures) {
    const data = (facture as any).data ?? {};
    const isAvoir = ((facture as any).typeFacture || '').toLowerCase() === 'avoir';

    // Date: for aging, use dateEmission (invoice date) NOT dateReelle (intervention date)
    const dateRaw = (facture as any).dateEmission || (facture as any).date || (facture as any).dateReelle || (facture as any).created_at;
    const dateEmission = parseDateSafe(dateRaw);
    if (!dateEmission) {
      quality.facturesSansDate++;
      quality.totalFacturesExclues++;
      continue;
    }

    // Montant TTC
    const montantTTCRaw = data.totalTTC ?? (facture as any).totalTTC ?? 0;
    const montantTTCBase = safeNumber(montantTTCRaw);
    if (montantTTCBase === 0) {
      quality.facturesSansMontant++;
      quality.totalFacturesExclues++;
      continue;
    }

    quality.totalFacturesAnalysees++;

    const montantTTC = isAvoir ? -Math.abs(montantTTCBase) : Math.abs(montantTTCBase);
    const { amount: montantRegleBrut, isRealData } = extractInvoiceMontantRegle(facture);
    const montantRegle = isAvoir ? -Math.min(montantRegleBrut, Math.abs(montantTTCBase)) : Math.min(montantRegleBrut, Math.abs(montantTTCBase));
    const resteDu = montantTTC - montantRegle;

    // Track data quality for règlements
    if (isRealData) {
      quality.reglementsViaDonneeReelle++;
    } else if (montantRegleBrut > 0) {
      quality.reglementsViaFallbackStatut++;
    }

    // Avoir ambiguity
    let avoirMatchStatus: AvoirMatchStatus | undefined;
    if (isAvoir) {
      avoirMatchStatus = classifyAvoirMatch(facture, projectsMap);
      if (avoirMatchStatus === 'unmatched') {
        quality.avoirsNonRapproches++;
        quality.montantAvoirsAmbigus += Math.abs(montantTTCBase);
      } else if (avoirMatchStatus === 'ambiguous') {
        quality.montantAvoirsAmbigus += Math.abs(montantTTCBase);
      }
    }

    // Aging
    const agingDays = Math.max(0, differenceInDays(referenceDate, dateEmission));
    const agingBucket = classifyAgingBucket(agingDays);
    const paymentStatus = classifyPaymentStatus(resteDu, agingDays, isAvoir);

    // Entity resolution
    const projectId = String(facture.projectId || '');
    const project = projectsMap.get(projectId);
    if (!project) quality.facturesSansProject++;
    const entity = resolveEntityFromProject(project, clientsMap);

    // Project label
    const projectLabel = project?.nom || `Dossier #${projectId}`;
    const clientLabel = clientsMap.get(String(facture.clientId))?.raisonSociale
      || clientsMap.get(String(facture.clientId))?.nom
      || `Client #${facture.clientId}`;

    allInvoices.push({
      id: facture.id,
      numeroFacture: (facture as any).numeroFacture || facture.id,
      projectId,
      projectLabel,
      clientId: String(facture.clientId || ''),
      clientLabel,
      dateEmission,
      montantTTC,
      montantRegle,
      resteDu,
      isAvoir,
      avoirMatchStatus,
      paymentStatus,
      agingDays,
      agingBucket,
      ...entity,
    });
  }

  // ─── Aggregate by entity ───────────────────────────────

  const entityMap = new Map<string, FinancialEntityStats>();

  function getOrCreateEntity(inv: FinancialInvoice): FinancialEntityStats {
    const key = `${inv.entityType}:${inv.entityId}`;
    if (!entityMap.has(key)) {
      entityMap.set(key, {
        entityId: inv.entityId,
        entityLabel: inv.entityLabel,
        entityType: inv.entityType,
        nbDossiers: 0,
        nbFactures: 0,
        totalFactureTTC: 0,
        totalEncaisse: 0,
        resteDu: 0,
        tauxRecouvrement: 0,
        ageMoyenEncours: null,
        partDuGlobal: 0,
        riskLevel: 'healthy',
        aging: emptyAging(),
        invoices: [],
      });
    }
    return entityMap.get(key)!;
  }

  const projectsPerEntity = new Map<string, Set<string>>();

  for (const inv of allInvoices) {
    const entity = getOrCreateEntity(inv);
    entity.nbFactures++;
    entity.totalFactureTTC += inv.montantTTC;
    entity.totalEncaisse += inv.montantRegle;
    entity.resteDu += inv.resteDu;
    entity.invoices.push(inv);

    if (inv.resteDu > 0.01) {
      entity.aging[inv.agingBucket] += inv.resteDu;
    }

    const key = `${inv.entityType}:${inv.entityId}`;
    if (!projectsPerEntity.has(key)) projectsPerEntity.set(key, new Set());
    projectsPerEntity.get(key)!.add(inv.projectId);
  }

  // Finalize entities
  const totalDuGlobal = Array.from(entityMap.values()).reduce((s, e) => s + Math.max(0, e.resteDu), 0);
  const allAgingDelays: number[] = [];

  for (const [key, entity] of entityMap) {
    entity.nbDossiers = projectsPerEntity.get(key)?.size || 0;
    entity.tauxRecouvrement = entity.totalFactureTTC > 0
      ? Math.round((entity.totalEncaisse / entity.totalFactureTTC) * 1000) / 10
      : 100;
    entity.partDuGlobal = totalDuGlobal > 0
      ? Math.round((Math.max(0, entity.resteDu) / totalDuGlobal) * 1000) / 10
      : 0;
    entity.riskLevel = classifyDebtRisk(entity);

    // Âge moyen des encours (NOT a real payment delay)
    const unpaidInvs = entity.invoices.filter(i => i.resteDu > 0.01 && !i.isAvoir);
    if (unpaidInvs.length > 0) {
      const avgAge = Math.round(unpaidInvs.reduce((s, i) => s + i.agingDays, 0) / unpaidInvs.length);
      entity.ageMoyenEncours = avgAge;
      allAgingDelays.push(avgAge);
    }
  }

  // Split by type
  const byApporteur = Array.from(entityMap.values())
    .filter(e => e.entityType === 'apporteur')
    .sort((a, b) => b.resteDu - a.resteDu);

  const byClient = Array.from(entityMap.values())
    .filter(e => e.entityType === 'client_direct' || e.entityType === 'unknown')
    .sort((a, b) => b.resteDu - a.resteDu);

  // ─── Global KPIs ──────────────────────────────────────

  const totalFacture = allInvoices.reduce((s, i) => s + i.montantTTC, 0);
  const totalEncaisse = allInvoices.reduce((s, i) => s + i.montantRegle, 0);
  const duTotal = totalFacture - totalEncaisse;
  const duApporteurs = byApporteur.reduce((s, e) => s + Math.max(0, e.resteDu), 0);
  const duUnknown = Array.from(entityMap.values())
    .filter(e => e.entityType === 'unknown')
    .reduce((s, e) => s + Math.max(0, e.resteDu), 0);
  const duClientsDirects = duTotal - duApporteurs - duUnknown;

  const globalAging = emptyAging();
  for (const inv of allInvoices) {
    if (inv.resteDu > 0.01) {
      globalAging[inv.agingBucket] += inv.resteDu;
    }
  }

  const kpis: FinancialKPIs = {
    duTotal: Math.max(0, duTotal),
    duClientsDirects: Math.max(0, duClientsDirects),
    duApporteurs: Math.max(0, duApporteurs),
    duUnknown: Math.max(0, duUnknown),
    totalEncaisse: Math.max(0, totalEncaisse),
    totalFacture,
    tauxRecouvrement: totalFacture > 0 ? Math.round((totalEncaisse / totalFacture) * 1000) / 10 : 100,
    nbFacturesAvecSolde: allInvoices.filter(i => i.resteDu > 0.01).length,
    ageMoyenEncours: allAgingDelays.length > 0
      ? Math.round(allAgingDelays.reduce((a, b) => a + b, 0) / allAgingDelays.length)
      : null,
    montantRetard30: globalAging['31_60'] + globalAging['61_90'] + globalAging['90_plus'],
    montantRetard60: globalAging['61_90'] + globalAging['90_plus'],
    montantRetard90: globalAging['90_plus'],
  };

  // ─── Alerts ────────────────────────────────────────────

  const alerts = buildFinancialAlerts(kpis, byApporteur, byClient, allInvoices, globalAging);

  // ─── Fiability ─────────────────────────────────────────

  const fiabilite = computeFiabiliteScore(quality);

  return {
    kpis,
    byApporteur,
    byClient,
    allInvoices,
    aging: globalAging,
    alerts,
    dataQuality: quality,
    fiabilite,
  };
}

// ─── Alert Builder ───────────────────────────────────────

function buildFinancialAlerts(
  kpis: FinancialKPIs,
  byApporteur: FinancialEntityStats[],
  byClient: FinancialEntityStats[],
  invoices: FinancialInvoice[],
  aging: AgingBreakdown
): FinancialAlert[] {
  const alerts: FinancialAlert[] = [];
  let id = 0;

  const inv30 = invoices.filter(i => i.resteDu > 0.01 && i.agingDays > 30 && !i.isAvoir);
  const inv60 = invoices.filter(i => i.resteDu > 0.01 && i.agingDays > 60 && !i.isAvoir);
  const inv90 = invoices.filter(i => i.resteDu > 0.01 && i.agingDays > 90 && !i.isAvoir);

  if (inv90.length > 0) {
    alerts.push({
      id: String(++id),
      severity: 'critical',
      icon: 'AlertTriangle',
      title: `${inv90.length} facture${inv90.length > 1 ? 's' : ''} > 90 jours`,
      description: `Montant critique : ${Math.round(aging['90_plus']).toLocaleString('fr-FR')} €`,
      value: aging['90_plus'],
    });
  }
  if (inv60.length > 0) {
    alerts.push({
      id: String(++id),
      severity: 'warning',
      icon: 'Clock',
      title: `${inv60.length} facture${inv60.length > 1 ? 's' : ''} > 60 jours`,
      description: `Encours vieillissant à surveiller`,
      value: kpis.montantRetard60,
    });
  }
  if (inv30.length > 0) {
    alerts.push({
      id: String(++id),
      severity: 'info',
      icon: 'Clock',
      title: `${inv30.length} facture${inv30.length > 1 ? 's' : ''} > 30 jours`,
      description: `Relances à prévoir`,
      value: kpis.montantRetard30,
    });
  }

  const topDebtors = byApporteur.filter(e => e.resteDu > 0).slice(0, 5);
  if (topDebtors.length > 0) {
    const top3Names = topDebtors.slice(0, 3).map(e => e.entityLabel).join(', ');
    const totalTop5 = topDebtors.reduce((s, e) => s + e.resteDu, 0);
    const concentration = kpis.duTotal > 0 ? Math.round((totalTop5 / kpis.duTotal) * 100) : 0;
    alerts.push({
      id: String(++id),
      severity: concentration > 70 ? 'critical' : 'warning',
      icon: 'Users',
      title: `Top ${topDebtors.length} apporteurs = ${concentration}% du dû`,
      description: top3Names,
      value: totalTop5,
    });
  }

  const criticalEntities = [...byApporteur, ...byClient].filter(e => e.riskLevel === 'critical');
  if (criticalEntities.length > 0) {
    alerts.push({
      id: String(++id),
      severity: 'critical',
      icon: 'ShieldAlert',
      title: `${criticalEntities.length} tiers en risque critique`,
      description: criticalEntities.slice(0, 3).map(e => e.entityLabel).join(', '),
    });
  }

  return alerts;
}
