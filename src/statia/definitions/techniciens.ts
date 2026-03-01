/**
 * StatIA V1 - Définitions des métriques par Technicien
 * 
 * SOURCES UTILISÉES:
 * - apiGetFactures (via loaders.ts)
 * - apiGetProjects (via loaders.ts)
 * - apiGetInterventions (via loaders.ts)
 * - apiGetUsers (via loaders.ts)
 * 
 * NOTE: La logique métier principale est définie dans:
 * - src/statia/engines/unifiedTechCAEngine.ts (SOURCE DE VÉRITÉ UNIQUE)
 * 
 * Ce fichier utilise le moteur unifié pour garantir la cohérence entre
 * toutes les vues (Top Techniciens, Heatmap, CA mensuel, etc.)
 * 
 * RÈGLE MÉTIER (validée 2024):
 * - Répartition AU PRORATA DU TEMPS (pas égale)
 * - Lissage pour les factures sans temps productif
 * - États de factures inclus: tout sauf annulées/pro-forma
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { 
  normalizeUniversSlug,
  isFactureStateIncluded
} from '../engine/normalizers';
import { extractFactureMeta } from '../rules/rules';
import { indexProjectsById, indexUsersById } from '../engine/loaders';
import { 
  computeUnifiedTechCAAsStatResult,
  computeUnifiedTechCA,
  calculateTechTimeByProject as calculateTechTimeByProjectUnified,
  isProductiveIntervention as isProductiveInterventionUnified,
  isActiveTechnician,
} from '../engines/unifiedTechCAEngine';

/**
 * Interface pour les stats technicien
 */
interface TechnicianStats {
  technicianId: string | number;
  technicianName: string;
  totalCA: number;
  totalHeures: number;
  caParHeure: number;
  nbDossiers: number;
  dossiersByUnivers: Record<string, Set<string>>; // Pour compter les dossiers uniques par univers
  byUnivers: Record<string, { ca: number; heures: number; nbDossiers: number }>;
}

/**
 * Vérifie si une intervention est de type RT (Relevé Technique) - NON PRODUCTIF
 * Logique RENFORCÉE alignée sur rules.ts RT_generates_NO_CA: true
 */
function isRTIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase().trim();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase().trim();
  
  // RT explicite via type2
  if (type2 === 'rt') return true;
  if (type2.includes('relevé technique') || type2.includes('releve technique')) return true;
  if (type2.includes('rdv technique')) return true;
  
  // RT explicite via type
  if (type === 'rt') return true;
  if (type.includes('relevé technique') || type.includes('releve technique')) return true;
  
  // RT via flags bi (biRt SEUL = RT, sans travaux associés)
  const hasBiRt = intervention.data?.biRt?.isValidated === true || intervention.data?.isRT === true;
  const hasBiDepan = intervention.data?.biDepan?.isValidated === true || 
                     intervention.data?.biDepan?.isWorkDone === true ||
                     intervention.data?.biDepan?.items?.length > 0;
  const hasBiTvx = intervention.data?.biTvx?.isValidated === true || 
                   intervention.data?.biTvx?.isWorkDone === true ||
                   intervention.data?.biTvx?.items?.length > 0;
  const hasBiV3 = intervention.data?.biV3?.items?.length > 0;
  
  // RT si biRt actif ET aucun travail productif
  if (hasBiRt && !hasBiDepan && !hasBiTvx && !hasBiV3) return true;
  
  return false;
}

/**
 * Vérifie si une intervention est de type SAV - NON PRODUCTIF pour les stats technicien
 * RÈGLE MÉTIER STRICTE: type2 === "SAV" (égalité exacte, pas includes)
 */
function isSAVIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase().trim();
  return type2 === 'sav';
}

/**
 * Vérifie si une intervention est de type diagnostic - NON PRODUCTIF
 */
function isDiagnosticIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase();
  
  return type2.includes('diagnostic') || type.includes('diagnostic');
}

/**
 * Vérifie si une intervention "A DÉFINIR" a du travail productif réalisé
 * Logique alignée sur DataService.calculateCAByTechnician
 */
function hasProductiveWorkDone(intervention: any): boolean {
  const hasDepanWork = intervention.data?.biDepan?.isWorkDone || intervention.data?.biDepan?.tvxEffectues;
  const hasTvxWork = intervention.data?.biTvx?.isWorkDone || intervention.data?.biTvx?.tvxEffectues;
  const hasV3Work = intervention.data?.biV3?.items?.length > 0;
  return hasDepanWork || hasTvxWork || hasV3Work;
}

/**
 * Vérifie si une intervention est productive pour le calcul CA technicien
 * RÈGLE MÉTIER STRICTE : seules biDepan ou biTvx génèrent du CA
 * Logique alignée sur technicienUniversEngine.ts (source de vérité)
 */
function isProductiveIntervention(intervention: any): boolean {
  // Exclure les RT, SAV, diagnostics
  if (isRTIntervention(intervention)) return false;
  if (isSAVIntervention(intervention)) return false;
  if (isDiagnosticIntervention(intervention)) return false;
  
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  
  // Cas "RDV à définir" : inclure seulement si travaux réalisés
  if (type2.includes('définir') || type2.includes('a définir') || type2.includes('à définir')) {
    return hasProductiveWorkDone(intervention);
  }
  
  // RÈGLE STRICTE: Doit avoir biDepan ou biTvx pour être productif
  // (aligné sur technicienUniversEngine.ts ligne 156)
  const hasBiDepan = intervention.data?.biDepan;
  const hasBiTvx = intervention.data?.biTvx;
  const hasBiV3 = intervention.data?.biV3?.items?.length > 0;
  
  if (!hasBiDepan && !hasBiTvx && !hasBiV3) {
    return false;
  }
  
  return true;
}

/**
 * Récupère les techniciens productifs d'une intervention
 * Logique alignée sur DataService.calculateCAByTechnician (lignes 396-414)
 * Collecte de toutes les sources possibles sans filtrage strict
 */
function getProductiveTechnicians(intervention: any): Set<string | number> {
  const techIds = new Set<string | number>();
  
  // 1. Collecter depuis userId principal
  if (intervention.userId) {
    techIds.add(intervention.userId);
  }
  
  // 2. Collecter depuis usersIds au niveau intervention
  if (intervention.usersIds && Array.isArray(intervention.usersIds)) {
    intervention.usersIds.forEach((id: any) => {
      if (id) techIds.add(id);
    });
  }
  
  // 3. Collecter depuis data.visites (toutes les visites, pas de filtrage strict)
  const visites = intervention.visites || intervention.data?.visites || [];
  for (const visite of visites) {
    const userIds = visite.usersIds || visite.userIds || [];
    for (const techId of userIds) {
      if (techId) techIds.add(techId);
    }
  }
  
  // 4. Collecter depuis biV3.items (structure spécifique Apogée)
  if (intervention.data?.biV3?.items && Array.isArray(intervention.data.biV3.items)) {
    for (const item of intervention.data.biV3.items) {
      if (item.usersIds && Array.isArray(item.usersIds)) {
        item.usersIds.forEach((id: any) => {
          if (id) techIds.add(id);
        });
      }
    }
  }
  
  return techIds;
}

/**
 * Wrapper pour compatibilité: utilise le moteur unifié pour le calcul du temps
 */
function calculateTechTimeByProjectLocal(
  interventions: any[],
  projectsById: Map<string | number, any>,
  usersMap: Map<number, any>
): { 
  dureeTechParProjet: Map<string, Map<string | number, number>>; 
  dureeTotaleParProjet: Map<string, number>;
} {
  const result = calculateTechTimeByProjectUnified(interventions, usersMap);
  
  // Convertir le format Map<string, Map<string, number>> en Map<string, Map<string | number, number>>
  const dureeTechParProjet = new Map<string, Map<string | number, number>>();
  for (const [projectId, techMap] of result.dureeTechParProjet) {
    const newTechMap = new Map<string | number, number>();
    for (const [techId, duree] of techMap) {
      newTechMap.set(techId, duree);
      newTechMap.set(Number(techId), duree);
    }
    dureeTechParProjet.set(projectId, newTechMap);
  }
  
  return { dureeTechParProjet, dureeTotaleParProjet: result.dureeTotaleParProjet };
}

/**
 * CA par Technicien × Univers
 * Conforme à computeTechUniversStatsForAgency de technicienUniversEngine
 */
/**
 * Interface étendue pour inclure is_on et couleur
 */
interface TechnicianStatsExtended extends TechnicianStats {
  isOn: boolean;
  color: string;
}

/**
 * CA par Technicien × Univers
 * 
 * UTILISE LE MOTEUR UNIFIÉ pour garantir la cohérence avec ca_par_technicien et top_techniciens_ca.
 * Étape 1: Appel au moteur unifié → CA total par technicien (avec lissage)
 * Étape 2: Ventilation du CA par univers au prorata du temps par projet
 */
export const caParTechnicienUnivers: StatDefinition = {
  id: 'ca_par_technicien_univers',
  label: 'CA par Technicien × Univers',
  description: 'Répartition du CA entre techniciens ventilée par univers (moteur unifié)',
  category: 'technicien',
  source: ['factures', 'projects', 'interventions', 'users'],
  dimensions: ['technicien', 'univers'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const factures = data.factures || [];
    const projects = data.projects || [];
    const interventions = data.interventions || [];
    const users = data.users || [];

    // ── ÉTAPE 1 : CA par technicien via le moteur unifié ──
    
    const usersMap = new Map<number, any>(users.map((u: any) => [u.id, u]));
    const projectsById = indexProjectsById(projects);
    const usersById = indexUsersById(users);

    const unifiedResult = computeUnifiedTechCA(
      factures, projects, interventions, users,
      { dateRange: params.dateRange, applySmoothing: true }
    );

    // ── ÉTAPE 2 : Calculer le temps par tech par projet (même source que le moteur unifié) ──
    const { dureeTechParProjet, dureeTotaleParProjet } = calculateTechTimeByProjectUnified(interventions, usersMap);

    // ── ÉTAPE 3 : Calculer le temps par tech par UNIVERS ──
    // Pour chaque projet, récupérer ses univers et répartir le temps proportionnellement
    const techTimeByUnivers = new Map<string, Map<string, number>>(); // techId -> (univers -> durée)
    const techTotalTime = new Map<string, number>(); // techId -> durée totale
    const techDossiersByUnivers = new Map<string, Map<string, Set<string>>>(); // techId -> (univers -> Set<projectId>)

    for (const [projectId, techMap] of dureeTechParProjet) {
      const project = projectsById.get(projectId);
      const projectUniverses = (project?.data?.universes || project?.universes || ['non-classe'])
        .map(normalizeUniversSlug);

      for (const [techId, duree] of techMap) {
        if (!techTimeByUnivers.has(techId)) {
          techTimeByUnivers.set(techId, new Map());
          techTotalTime.set(techId, 0);
          techDossiersByUnivers.set(techId, new Map());
        }
        techTotalTime.set(techId, (techTotalTime.get(techId) || 0) + duree);

        const timePerUnivers = duree / projectUniverses.length;
        const universMap = techTimeByUnivers.get(techId)!;
        const dossierMap = techDossiersByUnivers.get(techId)!;

        for (const univers of projectUniverses) {
          universMap.set(univers, (universMap.get(univers) || 0) + timePerUnivers);
          if (!dossierMap.has(univers)) dossierMap.set(univers, new Set());
          dossierMap.get(univers)!.add(projectId);
        }
      }
    }

    // ── ÉTAPE 4 : Ventiler le CA unifié par univers au prorata du temps ──
    const result: Record<string, any> = {};
    let totalCA = 0;

    for (const [techId, stats] of unifiedResult.techStats) {
      const universTimeMap = techTimeByUnivers.get(techId);
      const totalTime = techTotalTime.get(techId) || 0;
      const dossierMap = techDossiersByUnivers.get(techId);

      // Infos utilisateur
      let userInfo = usersById.get(techId) || usersById.get(Number(techId)) || usersById.get(String(techId));
      const color = stats.color;
      const isOn = stats.isActive;

      const byUnivers: Record<string, { ca: number; heures: number; nbDossiers: number }> = {};

      if (universTimeMap && totalTime > 0) {
        for (const [univers, uTime] of universTimeMap) {
          const proportion = uTime / totalTime;
          const dossiers = dossierMap?.get(univers) || new Set();
          byUnivers[univers] = {
            ca: stats.totalCA * proportion,
            heures: uTime / 60, // minutes → heures
            nbDossiers: dossiers.size,
          };
        }
      } else if (stats.totalCA > 0) {
        // Technicien avec CA (via lissage) mais sans temps → mettre dans "non-classe"
        byUnivers['non-classe'] = {
          ca: stats.totalCA,
          heures: 0,
          nbDossiers: stats.nbDossiers,
        };
      }

      // Compter les dossiers totaux
      const allDossiers = new Set<string>();
      if (dossierMap) {
        for (const dSet of dossierMap.values()) {
          dSet.forEach(d => allDossiers.add(d));
        }
      }

      result[String(techId)] = {
        name: stats.name,
        ca: stats.totalCA,
        heures: stats.totalDuree / 60, // minutes → heures
        caParHeure: stats.caParHeure,
        nbDossiers: allDossiers.size || stats.nbDossiers,
        byUnivers,
        color,
        isOn,
      };
      totalCA += stats.totalCA;
    }

    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: unifiedResult.techStats.size,
      },
      breakdown: {
        total: unifiedResult.totalCA,
        totalCA: unifiedResult.totalCA,
        technicianCount: unifiedResult.techStats.size,
        facturesSansTemps: unifiedResult.facturesSansTemps,
        ecartLissage: unifiedResult.ecartLissage,
      }
    };
  }
};

/**
 * CA par Technicien
 * 
 * RÈGLE MÉTIER (conforme spec UNIFIÉE v2.0):
 * - Pour chaque facture de la période, récupérer le projectId
 * - Répartition AU PRORATA DU TEMPS (pas égale)
 * - Lissage équitable pour les factures sans temps productif
 * - Avoirs intégrés en négatif
 * - Exclure RT, TH, SAV, diagnostics
 * 
 * SOURCES:
 * - apiGetFactures: CA HT, date, type facture
 * - apiGetProjects: lien facture → interventions
 * - apiGetInterventions: visites, usersIds, types
 * - apiGetUsers: noms techniciens
 * 
 * NOTE: Utilise le moteur unifié unifiedTechCAEngine.ts
 */
export const caParTechnicien: StatDefinition = {
  id: 'ca_par_technicien',
  label: 'CA par Technicien',
  description: 'Répartition du CA HT facturé par technicien au prorata du temps passé, avec lissage pour les factures sans temps productif.',
  category: 'technicien',
  source: ['factures', 'projects', 'interventions', 'users'],
  dimensions: ['technicien'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    // Utiliser le moteur unifié
    const result = computeUnifiedTechCAAsStatResult(
      {
        factures: data.factures || [],
        projects: data.projects || [],
        interventions: data.interventions || [],
        users: data.users || [],
      },
      {
        dateRange: params.dateRange,
        applySmoothing: true,
      }
    );
    
    return {
      value: result.value,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: result.breakdown.technicianCount,
      },
      breakdown: result.breakdown,
    };
  }
};

/**
 * Top N Techniciens par CA
 */
export const topTechniciensCA: StatDefinition = {
  id: 'top_techniciens_ca',
  label: 'Top Techniciens (CA)',
  description: 'Classement des meilleurs techniciens par CA',
  category: 'technicien',
  source: ['factures', 'projects', 'interventions', 'users'],
  dimensions: ['technicien'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const baseResult = caParTechnicien.compute(data, params);
    const baseValue = baseResult.value as Record<string, { name: string; ca: number; color: string }>;
    
    // Trier par CA décroissant
    const entries = Object.entries(baseValue);
    entries.sort((a, b) => b[1].ca - a[1].ca);
    
    const topN = params.filters?.topN || 10;
    const topEntries = entries.slice(0, topN);
    
    // Résultat avec nom, CA, couleur et rang
    const result: Record<string, { name: string; ca: number; color: string; rank: number }> = {};
    topEntries.forEach(([id, techData], index) => {
      result[id] = {
        name: techData.name,
        ca: techData.ca,
        color: techData.color,
        rank: index + 1,
      };
    });
    
    return {
      value: result,
      metadata: baseResult.metadata,
      breakdown: {
        ...baseResult.breakdown,
        ranking: topEntries.map(([id, techData], index) => ({ 
          rank: index + 1, 
          id, 
          name: techData.name,
          ca: techData.ca,
          color: techData.color,
        })),
      }
    };
  }
};

/**
 * CA Moyen par Technicien (mois en cours)
 * KPI simple : CA total productif / nombre de techniciens actifs
 * 
 * Règle métier :
 * - Période = dateRange fourni (typiquement mois en cours)
 * - Factures : normales + avoirs (négatifs) 
 * - Techniciens actifs = ceux ayant au moins une part de CA > 0
 * - Formule : CA_total / nb_tech_actifs
 */
export const caMoyenParTech: StatDefinition = {
  id: 'ca_moyen_par_tech',
  label: 'CA moyen par technicien',
  description: 'CA productif moyen par technicien sur la période (factures productives, visites validées, répartition égale entre techniciens)',
  category: 'technicien',
  source: ['factures', 'projects', 'interventions', 'users'],
  dimensions: [],
  aggregation: 'avg',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    // Réutiliser le calcul CA par technicien
    const baseResult = caParTechnicien.compute(data, params);
    const caByTech = baseResult.value as Record<string, { name: string; ca: number }>;
    
    // Filtrer les techniciens actifs (CA > 0)
    const techsActifs = Object.entries(caByTech).filter(([, data]) => data.ca > 0);
    const nbTechActifs = techsActifs.length;
    
    // Calculer CA total productif
    const caTotal = techsActifs.reduce((sum, [, data]) => sum + data.ca, 0);
    
    // CA moyen (éviter division par 0)
    const caMoyen = nbTechActifs > 0 ? caTotal / nbTechActifs : 0;
    
    return {
      value: caMoyen,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: nbTechActifs,
      },
      breakdown: {
        caTotal,
        nbTechActifs,
        techniciens: techsActifs.map(([id, techData]) => ({
          id,
          name: techData.name,
          ca: techData.ca,
        })),
      }
    };
  }
};

/**
 * CA par Technicien – pondéré au temps
 * 
 * RÈGLE MÉTIER:
 * - Pour chaque facture, récupérer le CA HT (avoirs en négatif)
 * - Identifier les visites productives (validated, travaux/dépannage/recherche de fuite)
 * - Calculer le temps par technicien sur chaque dossier (durée visite / nb techs présents)
 * - Répartir le CA au prorata du temps : CA_T = CA_HT × (temps_T / temps_total_dossier)
 * 
 * SOURCES:
 * - apiGetFactures: CA HT, date, type
 * - apiGetProjects: lien facture → interventions  
 * - apiGetInterventions: visites, duree, usersIds
 * - apiGetUsers: noms techniciens
 */
export const caParTechnicienTemps: StatDefinition = {
  id: 'ca_par_technicien_temps',
  label: 'CA par Technicien – pondéré au temps',
  description: 'Répartition du CA HT facturé par dossier entre les techniciens en fonction du temps productif réellement passé sur le dossier.',
  category: 'technicien',
  source: ['factures', 'projects', 'interventions', 'users'],
  dimensions: ['technicien'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    // Defensive array initialization
    const factures = data.factures || [];
    const projects = data.projects || [];
    const interventions = data.interventions || [];
    const users = data.users || [];
    
    
    
    const projectsById = indexProjectsById(projects);
    const usersById = indexUsersById(users);
    const usersMap = new Map<number, any>(users.map(u => [u.id, u]));
    
    // Calculer le temps par technicien par projet (moteur unifié)
    const { dureeTechParProjet, dureeTotaleParProjet } = calculateTechTimeByProjectLocal(
      interventions, 
      projectsById,
      usersMap
    );
    
    // Structure pour accumuler CA et temps par technicien
    const techStats = new Map<string | number, { caHt: number; temps: number }>();
    const techInfo = new Map<string | number, { name: string; color: string }>();
    
    // Helper pour récupérer info user (essayer plusieurs formats d'ID)
    const getUserInfo = (techId: string | number) => {
      let user = usersById.get(techId);
      if (!user) user = usersById.get(Number(techId));
      if (!user) user = usersById.get(String(techId));
      
      if (user) {
        const prenom = (user.firstname || '').trim();
        const nom = (user.name || user.lastname || '').trim();
        const fullName = [prenom, nom].filter(Boolean).join(' ') || `Tech ${techId}`;
        const color = user.data?.bgcolor?.hex || user.bgcolor?.hex || user.data?.color?.hex || user.color?.hex || '#808080';
        return { name: fullName, color };
      }
      return { name: `Tech ${techId}`, color: '#808080' };
    };
    
    let totalCADistribue = 0;
    let facturesTraitees = 0;
    let dossiersIgnores = 0;
    
    // Parcourir les factures
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      // Filtrer par période
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      // Exclure proforma
      const typeFacture = (facture.typeFacture || facture.type || facture.data?.type || '').toLowerCase();
      if (typeFacture === 'proforma' || typeFacture === 'pro_forma') continue;
      
      // Vérifier état facture - extraire depuis plusieurs sources comme dans ca.ts
      const factureState = facture.state || facture.status || facture.statut 
        || facture.data?.state || facture.data?.status || facture.paymentStatus || '';
      if (!isFactureStateIncluded(factureState)) continue;
      
      const projectId = String(facture.projectId || facture.project_id);
      if (!projectId) continue;
      
      // Récupérer le temps des techniciens sur ce projet
      const projectTechTime = dureeTechParProjet.get(projectId);
      const totalProjectTime = dureeTotaleParProjet.get(projectId) || 0;
      
      // Si aucun temps technicien identifié, ignorer ce dossier
      if (!projectTechTime || totalProjectTime === 0) {
        dossiersIgnores++;
        continue;
      }
      
      // CA HT de la facture (avoirs en négatif via extractFactureMeta)
      const caHT = meta.montantNetHT;
      
      // Répartir le CA au prorata du temps
      for (const [techId, techTime] of projectTechTime.entries()) {
        const proportion = techTime / totalProjectTime;
        const techCA = caHT * proportion;
        
        // Initialiser les stats du technicien si nécessaire
        if (!techStats.has(techId)) {
          techStats.set(techId, { caHt: 0, temps: 0 });
          techInfo.set(techId, getUserInfo(techId));
        }
        
        const stats = techStats.get(techId)!;
        stats.caHt += techCA;
        stats.temps += techTime;
      }
      
      totalCADistribue += caHT;
      facturesTraitees++;
    }
    
    
    
    // Formater le résultat avec nom, couleur, temps du technicien
    const result: Record<string, { name: string; ca: number; color: string; temps: number; caParHeure: number }> = {};
    
    for (const [techId, stats] of techStats.entries()) {
      const id = String(techId);
      const info = techInfo.get(techId) || { name: `Tech ${techId}`, color: '#808080' };
      const caParHeure = stats.temps > 0 ? stats.caHt / stats.temps : 0;
      result[id] = {
        name: info.name,
        ca: stats.caHt,
        color: info.color,
        temps: stats.temps, // en heures
        caParHeure,
      };
    }
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: techStats.size,
      },
      breakdown: {
        total: totalCADistribue,
        technicianCount: techStats.size,
        facturesTraitees,
        dossiersIgnores,
        formule: 'CA_HT × (temps_technicien / temps_total_dossier)',
      }
    };
  }
};

// ============= METRIC: CA moyen par heure tous techniciens =============

/**
 * CA moyen par heure travaillée (tous techniciens)
 * Ratio CA HT total techniciens / heures totales travaillées
 */
export const caMoyenParHeureTousTechniciens: StatDefinition = {
  id: 'ca_moyen_par_heure_tous_techniciens',
  label: 'CA moyen par heure travaillée (tous techniciens)',
  description:
    "Chiffre d'affaires HT moyen généré par heure travaillée, tous techniciens confondus",
  category: 'technicien',
  source: ['factures', 'interventions', 'projects', 'users'],
  unit: '€ / h',
  dimensions: [],
  aggregation: 'avg',

  compute: (data: LoadedData, params: StatParams): StatResult => {
    const factures = data.factures || [];
    const projects = data.projects || [];
    const interventions = data.interventions || [];
    const users = data.users || [];

    const projectsById = indexProjectsById(projects);
    const usersById = indexUsersById(users);
    const usersMap = new Map<number, any>(users.map(u => [u.id, u]));

    // Calculer le temps par technicien par projet (moteur unifié)
    const { dureeTechParProjet, dureeTotaleParProjet } = calculateTechTimeByProjectLocal(
      interventions,
      projectsById,
      usersMap
    );

    // Structure pour accumuler les stats par technicien
    const techStats = new Map<string | number, { ca: number; heures: number }>();

    // Parcourir les factures
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);

      // Vérifier état facture
      const factureState = facture.state || facture.status || facture.statut
        || facture.data?.state || facture.data?.status || facture.paymentStatus || '';
      if (!isFactureStateIncluded(factureState)) continue;

      // Filtrer par période
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;

      // Exclure proforma
      const typeFacture = (facture.typeFacture || facture.type || facture.data?.type || '').toLowerCase();
      if (typeFacture === 'proforma' || typeFacture === 'pro_forma') continue;

      const projectId = String(facture.projectId || facture.project_id);

      // Récupérer le temps des techniciens sur ce projet
      const projectTechTime = dureeTechParProjet.get(projectId);
      const totalProjectTime = dureeTotaleParProjet.get(projectId) || 0;

      if (!projectTechTime || totalProjectTime === 0) continue;

      // Répartir le CA proportionnellement au temps
      for (const [techId, techTime] of projectTechTime.entries()) {
        const proportion = techTime / totalProjectTime;
        const techCA = meta.montantNetHT * proportion;

        if (!techStats.has(techId)) {
          techStats.set(techId, { ca: 0, heures: 0 });
        }
        const stats = techStats.get(techId)!;
        stats.ca += techCA;
        stats.heures += techTime / 60; // Convertir minutes en heures
      }
    }

    // Agréger tous techniciens
    let caTotal = 0;
    let heuresTotales = 0;
    let techCount = 0;

    for (const stats of techStats.values()) {
      caTotal += stats.ca;
      heuresTotales += stats.heures;
      techCount++;
    }

    const caParHeure = heuresTotales > 0 ? caTotal / heuresTotales : 0;
    const value = Math.round(caParHeure * 100) / 100;

    return {
      value,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: techCount,
      },
      breakdown: {
        caTotalHT: Math.round(caTotal * 100) / 100,
        heuresTotales: Math.round(heuresTotales * 100) / 100,
        techniciensPrisEnCompte: techCount,
      },
    };
  },
};

/**
 * CA mensuel par technicien
 * Ventile le CA par technicien et par mois pour la période donnée
 * Permet de construire un tableau avec colonnes mensuelles + évolution
 */
export const caMensuelParTechnicien: StatDefinition = {
  id: 'ca_mensuel_par_technicien',
  label: 'CA mensuel par technicien',
  description: 'Répartition du CA par technicien ventilée par mois, avec calcul des évolutions',
  category: 'technicien',
  source: ['factures', 'projects', 'interventions', 'users'],
  dimensions: ['technicien', 'mois'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const factures = data.factures || [];
    const projects = data.projects || [];
    const interventions = data.interventions || [];
    const users = data.users || [];
    
    const projectsById = indexProjectsById(projects);
    const usersById = indexUsersById(users);
    
    // Indexer les interventions par projectId
    const interventionsByProject = new Map<string, any[]>();
    for (const intervention of interventions) {
      const projectId = String(intervention.projectId || intervention.project_id);
      if (!projectId) continue;
      if (!interventionsByProject.has(projectId)) {
        interventionsByProject.set(projectId, []);
      }
      interventionsByProject.get(projectId)!.push(intervention);
    }
    
    // Structure: { techId: { name, color, isOn, months: { "2024-01": ca, "2024-02": ca, ... } } }
    const techMonthlyCA = new Map<string, {
      name: string;
      color: string;
      isOn: boolean;
      months: Record<string, number>;
    }>();
    
    // Helper pour récupérer info user
    const getUserInfo = (techId: string | number) => {
      let user = usersById.get(techId);
      if (!user) user = usersById.get(Number(techId));
      if (!user) user = usersById.get(String(techId));
      
      if (user) {
        const prenom = (user.firstname || '').trim();
        const nom = (user.name || user.lastname || '').trim();
        const fullName = [prenom, nom].filter(Boolean).join(' ') || `Tech ${techId}`;
        const color = user.data?.bgcolor?.hex || user.bgcolor?.hex || user.data?.color?.hex || user.color?.hex || '#808080';
        const isOn = user.is_on === true;
        return { name: fullName, color, isOn };
      }
      return { name: `Tech ${techId}`, color: '#808080', isOn: false };
    };
    
    // Étendre la période pour inclure les mois de comparaison (M-1 et année précédente)
    const extendedStart = new Date(params.dateRange.start);
    extendedStart.setFullYear(extendedStart.getFullYear() - 1);
    extendedStart.setDate(1);
    
    // Parcourir les factures
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      // Vérifier état facture
      const factureState = facture.state || facture.status || facture.statut 
        || facture.data?.state || facture.data?.status || facture.paymentStatus || '';
      if (!isFactureStateIncluded(factureState)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < extendedStart || date > params.dateRange.end) continue;
      
      // Exclure proforma
      const typeFacture = (facture.typeFacture || facture.type || facture.data?.type || '').toLowerCase();
      if (typeFacture === 'proforma' || typeFacture === 'pro_forma') continue;
      
      const projectId = String(facture.projectId || facture.project_id);
      if (!projectId) continue;
      
      // Récupérer les interventions du projet
      const projectInterventions = interventionsByProject.get(projectId) || [];
      
      // Construire le SET des techniciens productifs uniques
      const techsProductifs = new Set<string | number>();
      
      for (const intervention of projectInterventions) {
        if (!isProductiveIntervention(intervention)) continue;
        const interventionTechs = getProductiveTechnicians(intervention);
        for (const techId of interventionTechs) {
          techsProductifs.add(techId);
        }
      }
      
      const nbTechsProductifs = techsProductifs.size;
      if (nbTechsProductifs === 0) continue;
      
      const caHT = meta.montantNetHT;
      const quotePart = caHT / nbTechsProductifs;
      
      // Clé du mois: "YYYY-MM"
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      for (const techId of techsProductifs) {
        const id = String(techId);
        
        if (!techMonthlyCA.has(id)) {
          const info = getUserInfo(techId);
          techMonthlyCA.set(id, {
            name: info.name,
            color: info.color,
            isOn: info.isOn,
            months: {},
          });
        }
        
        const techData = techMonthlyCA.get(id)!;
        techData.months[monthKey] = (techData.months[monthKey] || 0) + quotePart;
      }
    }
    
    // Construire le résultat
    const result: Record<string, {
      name: string;
      color: string;
      isOn: boolean;
      months: Record<string, number>;
    }> = {};
    
    for (const [techId, data] of techMonthlyCA.entries()) {
      // Filtrer: ne garder que les users avec is_on === true
      if (!data.isOn) continue;
      result[techId] = data;
    }
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: Object.keys(result).length,
      },
      breakdown: {
        technicianCount: Object.keys(result).length,
      }
    };
  }
};

export const techniciensDefinitions = {
  ca_par_technicien_univers: caParTechnicienUnivers,
  ca_par_technicien: caParTechnicien,
  ca_par_technicien_temps: caParTechnicienTemps,
  top_techniciens_ca: topTechniciensCA,
  ca_moyen_par_tech: caMoyenParTech,
  ca_moyen_par_heure_tous_techniciens: caMoyenParHeureTousTechniciens,
  ca_mensuel_par_technicien: caMensuelParTechnicien,
};
