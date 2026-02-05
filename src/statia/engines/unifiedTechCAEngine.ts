/**
 * MOTEUR UNIFIÉ : Calcul CA par Technicien
 * 
 * ⚠️ SOURCE DE VÉRITÉ UNIQUE ⚠️
 * 
 * Ce fichier contient la logique métier canonique pour le calcul du CA par technicien.
 * Il remplace les moteurs dupliqués (caParTechnicienCore.ts, technicienUniversEngine.ts)
 * pour garantir une cohérence totale entre toutes les vues.
 * 
 * RÈGLE MÉTIER OFFICIELLE (validée):
 * - Répartition AU PRORATA DU TEMPS (pas égale)
 * - Lissage pour les factures sans temps productif
 * - États de factures inclus: tout sauf annulées/pro-forma
 * 
 * @version 2.0.0
 * @author StatIA Team
 */

import { isWithinInterval } from 'date-fns';
import { extractFactureMeta } from '@/statia/rules/rules';
import { isFactureStateIncluded } from '@/statia/engine/normalizers';
import { 
  EXCLUDED_USER_TYPES,
  EXCLUDED_INTERVENTION_TYPES,
  ALWAYS_PRODUCTIVE_TYPES,
  EXCLUDED_FACTURE_STATES,
  RT_TYPES,
  TH_TYPES,
} from '@/statia/domain/rules';
import { logDebug } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface TechCAResult {
  techId: string;
  ca: number;
  duree: number; // en minutes
}

export interface InvoiceTechAllocation {
  allocations: Map<string, TechCAResult>;
  unallocatedCA: number; // CA non attribué (facture sans temps productif)
}

export interface TechCAStats {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  totalCA: number;
  totalDuree: number; // en minutes
  caParHeure: number;
  nbDossiers: number;
}

export interface ComputeParams {
  dateRange: { start: Date; end: Date };
  topN?: number;
  applySmoothing?: boolean; // Lissage pour que total CA tech = total CA factures
}

// ============================================================================
// HELPERS D'IDENTIFICATION TECHNICIEN
// ============================================================================

/**
 * Vérifie si un type utilisateur est exclu (non-technicien)
 */
export function isExcludedUserType(userType: string): boolean {
  const normalized = (userType || '').toLowerCase().trim();
  return EXCLUDED_USER_TYPES.some(t => normalized.includes(t.toLowerCase()));
}

/**
 * Détermine si un utilisateur est un technicien actif
 * Règle: isTechnicien=true OU type="technicien" OU (type="utilisateur" ET universes non vide)
 * ET actif (is_on=true)
 */
export function isActiveTechnician(user: any): boolean {
  if (!user) return false;
  
  // Exclure les types non-techniciens
  const userType = (user?.type || '').toString().toLowerCase();
  if (isExcludedUserType(userType)) return false;
  
  // Vérifier universes à plusieurs niveaux
  const hasUniverses = 
    (Array.isArray(user?.data?.universes) && user.data.universes.length > 0) ||
    (Array.isArray(user?.universes) && user.universes.length > 0);
  
  // Critères d'identification technicien
  const isTechnicien =
    user?.isTechnicien === true ||
    user?.isTechnicien === 1 ||
    user?.type === 'technicien' ||
    userType === 'technicien' ||
    (user?.type === 'utilisateur' && hasUniverses) ||
    (userType === 'utilisateur' && hasUniverses);
  
  // Vérification is_on/isActive avec normalisation
  const isActive = normalizeIsOn(user?.is_on) || normalizeIsOn(user?.isActive) ||
    (user?.is_on === undefined && user?.isActive === undefined);
  
  return isTechnicien && isActive;
}

/**
 * Normalise la valeur is_on (peut être boolean, number, string)
 */
function normalizeIsOn(value: any): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return false;
}

// ============================================================================
// HELPERS D'IDENTIFICATION INTERVENTION
// ============================================================================

/**
 * Vérifie si une intervention est de type RT (Relevé Technique) - NON PRODUCTIF
 */
export function isRTIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase().trim();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase().trim();
  
  // RT explicite via type2
  if (RT_TYPES.some(rt => type2 === rt.toLowerCase() || type2.includes(rt.toLowerCase()))) return true;
  
  // RT via biRt seul (sans travaux)
  const hasBiRt = intervention.data?.biRt?.isValidated === true || intervention.data?.isRT === true;
  const hasBiDepan = intervention.data?.biDepan;
  const hasBiTvx = intervention.data?.biTvx;
  
  if (hasBiRt && !hasBiDepan && !hasBiTvx) return true;
  
  return false;
}

/**
 * Vérifie si une intervention est de type TH (Taux d'Humidité) - NON PRODUCTIF
 */
export function isTHIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase().trim();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase().trim();
  
  return TH_TYPES.some(th => type2 === th.toLowerCase() || type === th.toLowerCase());
}

/**
 * Vérifie si une intervention est de type SAV - NON PRODUCTIF
 * RÈGLE STRICTE: type2 === "SAV" (égalité exacte)
 */
export function isSAVIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase().trim();
  return type2 === 'sav';
}

/**
 * Vérifie si une intervention est de type diagnostic - NON PRODUCTIF
 */
export function isDiagnosticIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase();
  return type2.includes('diagnostic') || type.includes('diagnostic');
}

/**
 * Vérifie si une intervention "A DÉFINIR" a du travail productif réalisé
 */
export function hasProductiveWorkDone(intervention: any): boolean {
  const hasDepanWork = intervention.data?.biDepan?.isWorkDone || intervention.data?.biDepan?.tvxEffectues;
  const hasTvxWork = intervention.data?.biTvx?.isWorkDone || intervention.data?.biTvx?.tvxEffectues;
  const hasV3Work = intervention.data?.biV3?.items?.length > 0;
  return hasDepanWork || hasTvxWork || hasV3Work;
}

/**
 * Vérifie si le type2 est "recherche de fuite" (cas spécial toujours productif)
 */
export function isRechercheFuite(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase();
  return ALWAYS_PRODUCTIVE_TYPES.some(rf => 
    type2.includes(rf.toLowerCase()) || type.includes(rf.toLowerCase())
  );
}

/**
 * Vérifie si une intervention est productive pour le calcul CA technicien
 */
export function isProductiveIntervention(intervention: any): boolean {
  // Exclure les RT, TH, SAV, diagnostics
  if (isRTIntervention(intervention)) return false;
  if (isTHIntervention(intervention)) return false;
  if (isSAVIntervention(intervention)) return false;
  if (isDiagnosticIntervention(intervention)) return false;
  
  // "Recherche de fuite" = TOUJOURS productif
  if (isRechercheFuite(intervention)) return true;
  
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  
  // Cas "RDV à définir" : inclure seulement si travaux réalisés
  if (type2.includes('définir') || type2.includes('a définir') || type2.includes('à définir')) {
    return hasProductiveWorkDone(intervention);
  }
  
  // RÈGLE STRICTE: Doit avoir biDepan ou biTvx pour être productif
  const hasBiDepan = intervention.data?.biDepan;
  const hasBiTvx = intervention.data?.biTvx;
  const hasBiV3 = intervention.data?.biV3?.items?.length > 0;
  
  return hasBiDepan || hasBiTvx || hasBiV3;
}

// ============================================================================
// CALCUL TEMPS PAR TECHNICIEN PAR PROJET
// ============================================================================

export interface TimeByProject {
  dureeTechParProjet: Map<string, Map<string, number>>; // projectId -> (techId -> durée minutes)
  dureeTotaleParProjet: Map<string, number>; // projectId -> durée totale minutes
}

/**
 * Calcule le temps passé par chaque technicien sur chaque projet
 * Source unique de vérité pour l'attribution temps
 */
export function calculateTechTimeByProject(
  interventions: any[],
  usersMap: Map<number, any>
): TimeByProject {
  const dureeTechParProjet = new Map<string, Map<string, number>>();
  const dureeTotaleParProjet = new Map<string, number>();
  
  for (const intervention of interventions) {
    const projectId = String(intervention.projectId || intervention.refProjectId);
    if (!projectId) continue;
    
    // Filtrer les interventions non-productives
    if (!isProductiveIntervention(intervention)) continue;
    
    // Initialiser le projet
    if (!dureeTechParProjet.has(projectId)) {
      dureeTechParProjet.set(projectId, new Map());
      dureeTotaleParProjet.set(projectId, 0);
    }
    
    // Parcourir les visites VALIDÉES uniquement
    const visites = intervention.data?.visites || intervention.visites || [];
    for (const visite of visites) {
      if (visite.state !== 'validated') continue;
      
      const duree = Number(visite.duree) || 0;
      if (duree <= 0) continue;
      
      const usersIds = visite.usersIds || [];
      
      // Ne compter que les techniciens actifs
      const technicienIds = usersIds.filter((userId: number) => {
        const user = usersMap.get(userId);
        const isActive = isActiveTechnician(user);
        // DEBUG: Log les exclusions
        if (!isActive && user && import.meta.env.DEV) {
          const name = `${user.firstname || ''} ${user.name || user.lastname || ''}`.trim();
          if (name.toLowerCase().includes('caron')) {
            logDebug('[UNIFIED TECH CA] Caron EXCLU des visites car non-technicien:', {
              userId,
              name,
              type: user.type,
              isTechnicien: user.isTechnicien,
              is_on: user.is_on,
            });
          }
        }
        return isActive;
      });
      
      if (technicienIds.length === 0) continue;
      
      for (const techId of technicienIds) {
        const techKey = String(techId);
        const projectTechMap = dureeTechParProjet.get(projectId)!;
        projectTechMap.set(techKey, (projectTechMap.get(techKey) || 0) + duree);
        dureeTotaleParProjet.set(projectId, (dureeTotaleParProjet.get(projectId) || 0) + duree);
      }
    }
  }
  
  return { dureeTechParProjet, dureeTotaleParProjet };
}

// ============================================================================
// MOTEUR PRINCIPAL - CALCUL CA PAR TECHNICIEN (PRORATA TEMPS + LISSAGE)
// ============================================================================

/**
 * Calcule le CA par technicien avec répartition AU PRORATA DU TEMPS
 * C'est LA fonction de référence à utiliser partout.
 */
export function computeUnifiedTechCA(
  factures: any[],
  projects: any[],
  interventions: any[],
  users: any[],
  params: ComputeParams
): {
  techStats: Map<string, TechCAStats>;
  totalCA: number;
  totalCAReparti: number;
  ecartLissage: number;
  facturesTraitees: number;
  facturesSansTemps: number;
} {
  // Index structures
  const usersMap = new Map<number, any>(users.map(u => [u.id, u]));
  const projectsById = new Map<string | number, any>(projects.map(p => [p.id, p]));
  
  // DEBUG: Vérifier si Caron est dans les users et son profil
  if (import.meta.env.DEV) {
    for (const user of users) {
      const name = `${user.firstname || ''} ${user.name || user.lastname || ''}`.trim().toLowerCase();
      if (name.includes('caron')) {
        const isTech = isActiveTechnician(user);
        const hasUniverses = (Array.isArray(user?.data?.universes) && user.data.universes.length > 0) ||
          (Array.isArray(user?.universes) && user.universes.length > 0);
        logDebug('[UNIFIED TECH CA] Profil Caron trouvé:', {
          id: user.id,
          fullName: name,
          type: user.type,
          isTechnicien: user.isTechnicien,
          is_on: user.is_on,
          hasUniverses,
          universes: user.data?.universes || user.universes,
          isActiveTechnician: isTech,
        });
      }
    }
  }
  
  // Calculer le temps par technicien par projet
  const { dureeTechParProjet, dureeTotaleParProjet } = calculateTechTimeByProject(interventions, usersMap);
  
  // Stats par technicien
  const techStats = new Map<string, TechCAStats>();
  const techDossiers = new Map<string, Set<string>>(); // Pour compter les dossiers uniques
  
  // Compteurs
  let totalCA = 0;
  let totalCAReparti = 0;
  let facturesTraitees = 0;
  let facturesSansTemps = 0;
  let caSansTemps = 0;
  
  // Helper pour récupérer info user
  const getUserInfo = (techId: string | number): { name: string; color: string; isActive: boolean; exists: boolean } => {
    let user = usersMap.get(Number(techId));
    if (!user) {
      for (const [, u] of usersMap) {
        if (String(u.id) === String(techId)) { user = u; break; }
      }
    }
    
    if (user) {
      const prenom = (user.firstname || '').trim();
      const nom = (user.name || user.lastname || '').trim();
      const fullName = [prenom, nom].filter(Boolean).join(' ') || `Tech ${techId}`;
      const color = user.data?.bgcolor?.hex || user.bgcolor?.hex || user.data?.color?.hex || user.color?.hex || '#808080';
      const isActive = normalizeIsOn(user?.is_on) || normalizeIsOn(user?.isActive);
      return { name: fullName, color, isActive, exists: true };
    }
    
    // Technicien fantôme : userId sans profil valide
    logDebug('[UNIFIED TECH CA] Technicien fantôme détecté (sans profil API):', { techId });
    return { name: `Tech ${techId}`, color: '#808080', isActive: false, exists: false };
  };
  
  // Traiter chaque facture
  for (const facture of factures) {
    const meta = extractFactureMeta(facture);
    
    // Vérifier état facture
    const factureState = facture.state || facture.status || facture.data?.state || '';
    if (EXCLUDED_FACTURE_STATES.some(s => factureState.toLowerCase().includes(s))) continue;
    if (!isFactureStateIncluded(factureState)) continue;
    
    // Filtrer par période
    if (!meta.date) continue;
    if (!isWithinInterval(meta.date, { start: params.dateRange.start, end: params.dateRange.end })) continue;
    
    // Exclure proforma
    const typeFacture = (facture.typeFacture || facture.type || facture.data?.type || '').toLowerCase();
    if (typeFacture === 'proforma' || typeFacture === 'pro_forma') continue;
    
    // Montant net (avoirs en négatif)
    if (meta.montantNetHT === 0) continue;
    
    const projectId = String(facture.projectId || facture.project_id);
    if (!projectId) continue;
    
    totalCA += meta.montantNetHT;
    facturesTraitees++;
    
    // Récupérer le temps des techniciens sur ce projet
    const projectTechTime = dureeTechParProjet.get(projectId);
    const totalProjectTime = dureeTotaleParProjet.get(projectId) || 0;
    
    if (!projectTechTime || totalProjectTime === 0) {
      // Facture sans temps productif → comptabiliser pour le lissage
      facturesSansTemps++;
      caSansTemps += meta.montantNetHT;
      continue;
    }
    
    // RÈGLE: Répartir le CA AU PRORATA DU TEMPS
    for (const [techId, techTime] of projectTechTime.entries()) {
      const userInfo = getUserInfo(techId);
      
      // CORRECTION: Ignorer les techniciens fantômes (sans profil valide)
      if (!userInfo.exists) {
        logDebug('[UNIFIED TECH CA] Technicien fantôme ignoré du calcul CA:', { techId, projectId, montant: meta.montantNetHT });
        continue; // Son CA sera redistribué via le lissage
      }
      
      const proportion = techTime / totalProjectTime;
      const techCA = meta.montantNetHT * proportion;
      
      totalCAReparti += techCA;
      
      // Initialiser ou mettre à jour les stats
      if (!techStats.has(techId)) {
        techStats.set(techId, {
          id: techId,
          name: userInfo.name,
          color: userInfo.color,
          isActive: userInfo.isActive,
          totalCA: 0,
          totalDuree: 0,
          caParHeure: 0,
          nbDossiers: 0,
        });
        techDossiers.set(techId, new Set());
      }
      
      const stats = techStats.get(techId)!;
      stats.totalCA += techCA;
      stats.totalDuree += techTime;
      
      // Tracker les dossiers uniques
      techDossiers.get(techId)!.add(projectId);
    }
  }
  
  // LISSAGE: Répartir l'écart équitablement entre les techniciens
  const ecartBrut = totalCA - totalCAReparti;
  
  if (params.applySmoothing !== false && techStats.size > 0 && Math.abs(ecartBrut) > 0.01) {
    const ajustementParTech = ecartBrut / techStats.size;
    
    for (const [, stats] of techStats) {
      stats.totalCA += ajustementParTech;
    }
    
    if (import.meta.env.DEV) {
      logDebug('[UNIFIED TECH CA] Lissage appliqué:', {
        ecartBrut: Math.round(ecartBrut * 100) / 100,
        ajustementParTech: Math.round(ajustementParTech * 100) / 100,
        nbTechniciens: techStats.size,
      });
    }
  }
  
  // Finaliser les stats (arrondir, calculer CA/heure, nbDossiers)
  for (const [techId, stats] of techStats) {
    stats.totalCA = Math.round(stats.totalCA * 100) / 100;
    stats.totalDuree = Math.round(stats.totalDuree);
    stats.caParHeure = stats.totalDuree > 0 ? Math.round(stats.totalCA / (stats.totalDuree / 60)) : 0;
    stats.nbDossiers = techDossiers.get(techId)?.size || 0;
  }
  
  return {
    techStats,
    totalCA: Math.round(totalCA * 100) / 100,
    totalCAReparti: Math.round(totalCAReparti * 100) / 100,
    ecartLissage: Math.round(ecartBrut * 100) / 100,
    facturesTraitees,
    facturesSansTemps,
  };
}

// ============================================================================
// EXPORTS COMPATIBLES AVEC L'ANCIEN API
// ============================================================================

/**
 * Wrapper pour compatibilité avec l'API StatResult
 */
export function computeUnifiedTechCAAsStatResult(
  data: { factures: any[]; projects: any[]; interventions: any[]; users: any[] },
  params: ComputeParams
): {
  value: Record<string, { name: string; ca: number; color: string; isActive?: boolean }>;
  breakdown: {
    total: number;
    technicianCount: number;
    facturesTraitees: number;
    facturesSansTemps: number;
    ecartLissage: number;
    formule: string;
  };
} {
  const result = computeUnifiedTechCA(
    data.factures,
    data.projects,
    data.interventions,
    data.users,
    params
  );
  
  // Convertir en format attendu
  const value: Record<string, { name: string; ca: number; color: string; isActive?: boolean }> = {};
  for (const [techId, stats] of result.techStats) {
    value[techId] = {
      name: stats.name,
      ca: stats.totalCA,
      color: stats.color,
      isActive: stats.isActive,
    };
  }
  
  return {
    value,
    breakdown: {
      total: result.totalCA,
      technicianCount: result.techStats.size,
      facturesTraitees: result.facturesTraitees,
      facturesSansTemps: result.facturesSansTemps,
      ecartLissage: result.ecartLissage,
      formule: 'CA_HT × (dureeTech / dureeTotale) + lissage équitable',
    },
  };
}
