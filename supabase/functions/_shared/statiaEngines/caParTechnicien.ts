/**
 * StatIA - Moteur partagé CA par Technicien (EDGE FUNCTION)
 * 
 * ✅ SYNCHRONISÉ AVEC src/statia/engines/unifiedTechCAEngine.ts ✅
 * 
 * RÈGLE MÉTIER UNIFIÉE v2.0:
 * - Répartition AU PRORATA DU TEMPS (CA × dureeTech / dureeTotale)
 * - Lissage équitable pour les factures sans temps productif
 * - États inclus: tous sauf annulées/pro-forma
 * - Exclure RT, TH, SAV, diagnostics
 * - "Recherche de fuite" = toujours productif
 * 
 * DERNIÈRE SYNCHRONISATION: 2026-02-04
 * SOURCE: src/statia/engines/unifiedTechCAEngine.ts
 */

// ============= CONSTANTES MÉTIER (miroir de rules.ts) =============

const EXCLUDED_USER_TYPES = ['commercial', 'admin', 'assistant', 'administratif'];
const EXCLUDED_INTERVENTION_TYPES = ['rt', 'th', 'sav', 'diagnostic'];
const ALWAYS_PRODUCTIVE_TYPES = ['recherche de fuite', 'recherche fuite'];
const EXCLUDED_FACTURE_STATES = ['canceled', 'cancelled', 'annulee', 'annulé', 'pro_forma', 'proforma'];

// ============= TYPES =============
export interface StatParams {
  dateRange: { start: Date; end: Date };
  agencySlug: string;
  topN?: number;
  filters?: Record<string, unknown>;
}

export interface RankingItem {
  rank: number;
  id: string | number;
  name: string;
  value: number;
  color?: string;
}

export interface StatResult {
  value: number;
  topItem?: RankingItem;
  ranking?: RankingItem[];
  unit: string;
  hasData?: boolean;
  dataCount?: number;
  breakdown?: {
    totalCAFacture: number;
    totalCAAttribue: number;
    caLisse: number;
    nbTechActifs: number;
  };
}

interface ApogeeData {
  factures: any[];
  projects: any[];
  clients: any[];
  interventions: any[];
  users: any[];
}

interface TechAccumulator {
  ca: number;
  duree: number;
  name: string;
  color: string;
}

// ============= HELPERS IDENTIFICATION TECHNICIEN =============

/**
 * Vérifie si un utilisateur est un technicien actif
 */
function isActiveTechnician(user: any): boolean {
  if (!user) return false;
  
  // Exclusion des types non-tech
  const userType = (user.type || '').toLowerCase();
  if (EXCLUDED_USER_TYPES.some(t => userType.includes(t))) return false;
  
  // Vérifier si actif
  const isOn = user.is_on ?? user.isOn ?? user.data?.is_on ?? user.data?.isOn;
  const isActive = isOn === true || isOn === 1 || isOn === '1' || isOn === 'true';
  if (!isActive) return false;
  
  // Règles d'identification technicien
  const isTechnicien = user.isTechnicien ?? user.data?.isTechnicien;
  if (isTechnicien === true || isTechnicien === 1) return true;
  if (userType === 'technicien') return true;
  
  // "utilisateur" avec univers = technicien
  if (userType === 'utilisateur') {
    const univers = user.data?.universes || user.universes || [];
    if (Array.isArray(univers) && univers.length > 0) return true;
  }
  
  return false;
}

/**
 * Vérifie si une intervention est de type exclu (RT/TH/SAV/Diagnostic)
 */
function isExcludedInterventionType(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase();
  
  // Vérifier "recherche de fuite" (toujours productif)
  if (ALWAYS_PRODUCTIVE_TYPES.some(t => type2.includes(t) || type.includes(t))) {
    return false;
  }
  
  // Vérifier types exclus
  for (const excluded of EXCLUDED_INTERVENTION_TYPES) {
    if (type2.includes(excluded) || type.includes(excluded)) return true;
  }
  
  // RT via flags bi (biRt seul = RT)
  if (intervention.data?.biRt && !intervention.data?.biDepan && !intervention.data?.biTvx && !intervention.data?.biV3) {
    return true;
  }
  
  return false;
}

/**
 * Vérifie si une intervention "A DÉFINIR" a du travail productif réalisé
 */
function hasProductiveWorkDone(intervention: any): boolean {
  const hasDepanWork = intervention.data?.biDepan?.isWorkDone || intervention.data?.biDepan?.tvxEffectues;
  const hasTvxWork = intervention.data?.biTvx?.isWorkDone || intervention.data?.biTvx?.tvxEffectues;
  const hasV3Work = intervention.data?.biV3?.items?.length > 0;
  return hasDepanWork || hasTvxWork || hasV3Work;
}

/**
 * Vérifie si une intervention est productive pour le calcul CA technicien
 */
function isProductiveIntervention(intervention: any): boolean {
  // Exclure les types non-productifs
  if (isExcludedInterventionType(intervention)) return false;
  
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  
  // Cas "RDV à définir" : inclure seulement si travaux réalisés
  if (type2.includes('définir') || type2.includes('a définir') || type2.includes('à définir')) {
    return hasProductiveWorkDone(intervention);
  }
  
  return true;
}

/**
 * Vérifie si l'état de la facture est inclus dans le CA
 */
function isFactureStateIncluded(state: string): boolean {
  const normalizedState = (state || '').toLowerCase().trim();
  if (!normalizedState) return true; // Pas d'état = inclure par défaut
  return !EXCLUDED_FACTURE_STATES.includes(normalizedState);
}

/**
 * Extrait les métadonnées d'une facture (date, montant net HT)
 */
function extractFactureMeta(facture: any): { date: Date | null; montantNetHT: number } {
  const rawDate = facture.dateReelle || facture.date || facture.data?.dateReelle || facture.data?.date;
  const date = rawDate ? new Date(rawDate) : null;
  
  const rawMontant = facture.data?.totalHT ?? facture.totalHT ?? facture.montantHT ?? facture.montant ?? 0;
  const montant = typeof rawMontant === 'string' ? parseFloat(rawMontant) || 0 : rawMontant;
  
  const typeFacture = (facture.typeFacture || facture.type || facture.data?.type || '').toLowerCase();
  const isAvoir = typeFacture === 'avoir';
  const montantNetHT = isAvoir ? -Math.abs(montant) : montant;
  
  return { date, montantNetHT };
}

/**
 * Extrait le temps par technicien depuis une intervention (visites validées uniquement)
 */
function extractTechTimeFromIntervention(
  intervention: any, 
  activeTechIds: Set<string>
): Map<string, number> {
  const techTime = new Map<string, number>();
  const visites = intervention.visites || intervention.data?.visites || [];
  
  for (const visite of visites) {
    // Uniquement visites validées
    const state = (visite.state || visite.status || '').toLowerCase();
    if (state !== 'validated' && state !== 'validée' && state !== 'done') continue;
    
    const duree = Number(visite.duree || visite.duration || 0);
    if (duree <= 0) continue;
    
    const usersIds = visite.usersIds || visite.userIds || [];
    const validTechs = usersIds.filter((id: any) => activeTechIds.has(String(id)));
    
    if (validTechs.length === 0) continue;
    
    // Répartir la durée entre les techniciens présents sur cette visite
    const timePerTech = duree / validTechs.length;
    for (const techId of validTechs) {
      const id = String(techId);
      techTime.set(id, (techTime.get(id) || 0) + timePerTech);
    }
  }
  
  return techTime;
}

// ============= MOTEUR PRINCIPAL - PRORATA TEMPS =============

/**
 * Compute CA par technicien - LOGIQUE PRORATA TEMPS AVEC LISSAGE
 */
export function computeCaParTechnicienShared(data: ApogeeData, params: StatParams): StatResult {
  const factures = data.factures || [];
  const projects = data.projects || [];
  const interventions = data.interventions || [];
  const users = data.users || [];
  
  console.log(`[EDGE StatIA ca_par_technicien] Données: ${factures.length} factures, ${projects.length} projets, ${interventions.length} interventions, ${users.length} users`);
  
  // Index projects par id
  const projectsById = new Map<string | number, any>();
  for (const p of projects) {
    projectsById.set(String(p.id), p);
  }
  
  // Identifier les techniciens actifs
  const activeTechIds = new Set<string>();
  const usersById = new Map<string, any>();
  for (const u of users) {
    const id = String(u.id);
    usersById.set(id, u);
    if (isActiveTechnician(u)) {
      activeTechIds.add(id);
    }
  }
  
  console.log(`[EDGE StatIA ca_par_technicien] Techniciens actifs identifiés: ${activeTechIds.size}`);
  
  // Index interventions par projectId
  const interventionsByProject = new Map<string, any[]>();
  for (const intervention of interventions) {
    const projectId = String(intervention.projectId || intervention.project_id);
    if (!projectId) continue;
    if (!interventionsByProject.has(projectId)) {
      interventionsByProject.set(projectId, []);
    }
    interventionsByProject.get(projectId)!.push(intervention);
  }
  
  // Accumulateur par technicien
  const techAccum = new Map<string, TechAccumulator>();
  
  // Helper pour récupérer info user
  const getUserInfo = (techId: string) => {
    const user = usersById.get(techId);
    if (user) {
      const prenom = (user.firstname || '').trim();
      const nom = (user.name || user.lastname || '').trim();
      const fullName = [prenom, nom].filter(Boolean).join(' ') || `Tech ${techId}`;
      const color = user.data?.bgcolor?.hex || user.bgcolor?.hex || user.data?.color?.hex || user.color?.hex || '#808080';
      return { name: fullName, color };
    }
    return { name: `Tech ${techId}`, color: '#808080' };
  };
  
  // Initialiser tous les techniciens actifs
  for (const techId of activeTechIds) {
    const info = getUserInfo(techId);
    techAccum.set(techId, { ca: 0, duree: 0, name: info.name, color: info.color });
  }
  
  let totalCAFacture = 0;
  let totalCAAttribue = 0;
  let facturesTraitees = 0;
  let facturesSansTemps = 0;
  
  const filterTechnicienId = params.filters?.technicienId;
  
  // Parcourir les factures
  for (const facture of factures) {
    const meta = extractFactureMeta(facture);
    
    // Filtrer par période
    if (!meta.date || meta.date < params.dateRange.start || meta.date > params.dateRange.end) continue;
    
    // Exclure proforma et états exclus
    const factureState = facture.state || facture.status || facture.statut 
      || facture.data?.state || facture.data?.status || facture.paymentStatus || '';
    if (!isFactureStateIncluded(factureState)) continue;
    
    const projectId = String(facture.projectId || facture.project_id);
    if (!projectId) continue;
    
    totalCAFacture += meta.montantNetHT;
    facturesTraitees++;
    
    // Récupérer les interventions productives du projet
    const projectInterventions = (interventionsByProject.get(projectId) || [])
      .filter(isProductiveIntervention);
    
    // Calculer le temps total par technicien pour ce projet
    const projectTechTime = new Map<string, number>();
    let projectTotalTime = 0;
    
    for (const intervention of projectInterventions) {
      const intervTime = extractTechTimeFromIntervention(intervention, activeTechIds);
      for (const [techId, time] of intervTime) {
        projectTechTime.set(techId, (projectTechTime.get(techId) || 0) + time);
        projectTotalTime += time;
      }
    }
    
    // Si pas de temps productif, cette facture sera lissée plus tard
    if (projectTotalTime <= 0) {
      facturesSansTemps++;
      continue;
    }
    
    // Répartir le CA au prorata du temps
    for (const [techId, time] of projectTechTime) {
      const ratio = time / projectTotalTime;
      const caAttribue = meta.montantNetHT * ratio;
      
      const acc = techAccum.get(techId);
      if (acc) {
        acc.ca += caAttribue;
        acc.duree += time;
        totalCAAttribue += caAttribue;
      }
    }
  }
  
  // ============= LISSAGE =============
  // Répartir le CA non attribué équitablement entre tous les techniciens actifs
  const ecartCA = totalCAFacture - totalCAAttribue;
  const nbTechsActifs = activeTechIds.size;
  let caLisse = 0;
  
  if (Math.abs(ecartCA) > 0.01 && nbTechsActifs > 0) {
    const ajustement = ecartCA / nbTechsActifs;
    caLisse = ecartCA;
    
    for (const [_, acc] of techAccum) {
      acc.ca += ajustement;
    }
    
    console.log(`[EDGE StatIA ca_par_technicien] Lissage: ${Math.round(ecartCA)}€ répartis sur ${nbTechsActifs} techniciens (${Math.round(ajustement)}€/tech)`);
  }
  
  console.log(`[EDGE StatIA ca_par_technicien] Résultat: ${facturesTraitees} factures, ${facturesSansTemps} sans temps, CA total ${Math.round(totalCAFacture)}€, CA attribué ${Math.round(totalCAAttribue)}€`);
  
  // Construire le ranking
  const sorted = Array.from(techAccum.entries())
    .map(([id, acc]) => ({
      id,
      name: acc.name,
      value: Math.round(acc.ca),
      color: acc.color,
      duree: acc.duree
    }))
    .filter(x => x.value !== 0)
    .sort((a, b) => b.value - a.value);
  
  console.log(`[EDGE StatIA ca_par_technicien] Top 3: ${sorted.slice(0, 3).map(t => `${t.name}=${t.value}€`).join(', ')}`);
  
  // MODE FILTRÉ: un seul technicien demandé
  if (filterTechnicienId) {
    const techData = sorted.find(t => String(t.id) === String(filterTechnicienId));
    
    if (techData && techData.value !== 0) {
      return {
        value: techData.value,
        topItem: { rank: 1, id: techData.id, name: techData.name, value: techData.value, color: techData.color },
        unit: '€',
        hasData: true,
        dataCount: facturesTraitees,
        breakdown: { totalCAFacture, totalCAAttribue, caLisse, nbTechActifs: nbTechsActifs }
      };
    }
    
    const techName = params.filters?.technicienName || `Tech #${filterTechnicienId}`;
    return {
      value: 0,
      topItem: { rank: 1, id: String(filterTechnicienId), name: String(techName), value: 0 },
      unit: '€',
      hasData: true,
      dataCount: facturesTraitees,
      breakdown: { totalCAFacture, totalCAAttribue, caLisse, nbTechActifs: nbTechsActifs }
    };
  }
  
  // MODE GLOBAL: classement complet
  const topN = params.topN || 10;
  const ranking = sorted.slice(0, topN).map((item, idx) => ({ 
    rank: idx + 1, 
    id: item.id, 
    name: item.name, 
    value: item.value,
    color: item.color,
  }));
  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  
  return {
    value: total,
    topItem: ranking[0],
    ranking,
    unit: '€',
    hasData: facturesTraitees > 0,
    dataCount: facturesTraitees,
    breakdown: { totalCAFacture, totalCAAttribue, caLisse, nbTechActifs: nbTechsActifs }
  };
}
