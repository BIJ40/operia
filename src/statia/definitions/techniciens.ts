/**
 * StatIA V1 - Définitions des métriques par Technicien
 * Réutilise les formules existantes Classe A de technicienUniversEngine
 * 
 * SOURCES UTILISÉES:
 * - apiGetFactures (via loaders.ts)
 * - apiGetProjects (via loaders.ts)
 * - apiGetInterventions (via loaders.ts)
 * - apiGetUsers (via loaders.ts)
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { 
  normalizeUniversSlug,
  isFactureStateIncluded
} from '../engine/normalizers';
import { extractFactureMeta } from '../rules/rules';
import { indexProjectsById, indexUsersById } from '../engine/loaders';

/**
 * Interface pour les stats technicien
 */
interface TechnicianStats {
  technicianId: string | number;
  technicianName: string;
  totalCA: number;
  totalHeures: number;
  caParHeure: number;
  byUnivers: Record<string, { ca: number; heures: number }>;
}

/**
 * Vérifie si une intervention est de type RT (Relevé Technique) - NON PRODUCTIF
 * Logique alignée sur DataService.calculateCAByTechnician
 */
function isRTIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase();
  
  // RT explicite via type2
  if (type2.includes('relevé') || type2.includes('releve') || type2.includes('technique')) return true;
  if (type2 === 'rt') return true;
  
  // RT explicite via type
  if (type.includes('rt')) return true;
  
  // RT via flags bi (biRt seul = RT)
  if (intervention.data?.biRt && !intervention.data?.biDepan && !intervention.data?.biTvx && !intervention.data?.biV3) return true;
  if (intervention.data?.isRT) return true;
  
  return false;
}

/**
 * Vérifie si une intervention est de type SAV - NON PRODUCTIF pour les stats technicien
 */
function isSAVIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase();
  
  return type2.includes('sav') || type.includes('sav');
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
 * Logique alignée sur DataService.calculateCAByTechnician (FONCTIONNEL)
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
  
  // Par défaut : inclure (dépannages, travaux, etc.)
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
 * Calcule le temps passé par technicien par projet
 * Logique alignée sur DataService.calculateCAByTechnician (lignes 339-414)
 * Utilisé pour la métrique pondérée au temps
 */
function calculateTechTimeByProject(
  interventions: any[],
  projectsById: Map<string | number, any>
): { 
  dureeTechParProjet: Map<string, Map<string | number, number>>; 
  dureeTotaleParProjet: Map<string, number>;
} {
  const dureeTechParProjet = new Map<string, Map<string | number, number>>();
  const dureeTotaleParProjet = new Map<string, number>();
  
  for (const intervention of interventions) {
    // Filtrer les interventions non-productives
    if (!isProductiveIntervention(intervention)) continue;
    
    const projectId = String(intervention.projectId || intervention.project_id);
    if (!projectId) continue;
    
    let tempsReparti = false;
    
    // Priorité 1: biV3.items avec techTimeStart/techTimeEnd
    if (intervention.data?.biV3?.items && Array.isArray(intervention.data.biV3.items)) {
      for (const item of intervention.data.biV3.items) {
        if (item.techTimeStart && item.techTimeEnd && item.usersIds) {
          const start = new Date(item.techTimeStart).getTime();
          const end = new Date(item.techTimeEnd).getTime();
          const dureeMinutes = (end - start) / (1000 * 60);
          const nbTechs = item.usersIds.length || 1;
          const dureeParTech = dureeMinutes / nbTechs;
          
          for (const techId of item.usersIds) {
            if (!techId) continue;
            if (!dureeTechParProjet.has(projectId)) {
              dureeTechParProjet.set(projectId, new Map());
            }
            const projectTechMap = dureeTechParProjet.get(projectId)!;
            projectTechMap.set(techId, (projectTechMap.get(techId) || 0) + dureeParTech);
            dureeTotaleParProjet.set(projectId, (dureeTotaleParProjet.get(projectId) || 0) + dureeParTech);
          }
          tempsReparti = true;
        }
      }
    }
    
    // Priorité 2: data.visites avec duree + usersIds
    if (!tempsReparti) {
      const visites = intervention.visites || intervention.data?.visites || [];
      for (const visite of visites) {
        if (visite.duree && visite.usersIds) {
          const dureeMinutes = visite.duree;
          const nbTechs = visite.usersIds.length || 1;
          const dureeParTech = dureeMinutes / nbTechs;
          
          for (const techId of visite.usersIds) {
            if (!techId) continue;
            if (!dureeTechParProjet.has(projectId)) {
              dureeTechParProjet.set(projectId, new Map());
            }
            const projectTechMap = dureeTechParProjet.get(projectId)!;
            projectTechMap.set(techId, (projectTechMap.get(techId) || 0) + dureeParTech);
            dureeTotaleParProjet.set(projectId, (dureeTotaleParProjet.get(projectId) || 0) + dureeParTech);
          }
          tempsReparti = true;
        }
      }
    }
    
    // Priorité 3 (mode dégradé): collecter tous les techniciens avec 1 minute chacun
    if (!tempsReparti) {
      const techIds = getProductiveTechnicians(intervention);
      for (const techId of techIds) {
        const dureeMinutes = 1; // Mode dégradé: 1 minute par tech
        if (!dureeTechParProjet.has(projectId)) {
          dureeTechParProjet.set(projectId, new Map());
        }
        const projectTechMap = dureeTechParProjet.get(projectId)!;
        projectTechMap.set(techId, (projectTechMap.get(techId) || 0) + dureeMinutes);
        dureeTotaleParProjet.set(projectId, (dureeTotaleParProjet.get(projectId) || 0) + dureeMinutes);
      }
    }
  }
  
  return { dureeTechParProjet, dureeTotaleParProjet };
}

/**
 * CA par Technicien × Univers
 * Conforme à computeTechUniversStatsForAgency de technicienUniversEngine
 */
export const caParTechnicienUnivers: StatDefinition = {
  id: 'ca_par_technicien_univers',
  label: 'CA par Technicien × Univers',
  description: 'Répartition du CA entre techniciens ventilée par univers',
  category: 'technicien',
  source: ['factures', 'projects', 'interventions', 'users'],
  dimensions: ['technicien', 'univers'],
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
    
    // Calculer le temps par technicien par projet
    const { dureeTechParProjet, dureeTotaleParProjet } = calculateTechTimeByProject(
      interventions, 
      projectsById
    );
    
    // Structure pour accumuler les stats
    const techStats = new Map<string | number, TechnicianStats>();
    
    // Parcourir les factures
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      // Vérifier état facture - extraire depuis plusieurs sources comme dans ca.ts
      const factureState = facture.state || facture.status || facture.statut 
        || facture.data?.state || facture.data?.status || facture.paymentStatus || '';
      if (!isFactureStateIncluded(factureState)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = String(facture.projectId || facture.project_id);
      const project = projectId ? projectsById.get(projectId) : null;
      
      // Récupérer les univers du projet
      const universes = project?.data?.universes || project?.universes || ['non-classe'];
      const normalizedUniverses = universes.map(normalizeUniversSlug);
      
      // Récupérer le temps des techniciens sur ce projet
      const projectTechTime = dureeTechParProjet.get(projectId);
      const totalProjectTime = dureeTotaleParProjet.get(projectId) || 0;
      
      if (!projectTechTime || totalProjectTime === 0) {
        continue;
      }
      
      // Répartir le CA proportionnellement au temps
      for (const [techId, techTime] of projectTechTime.entries()) {
        const proportion = techTime / totalProjectTime;
        const techCA = meta.montantNetHT * proportion;
        
        // Initialiser les stats du technicien si nécessaire
        if (!techStats.has(techId)) {
          const user = usersById.get(techId);
          techStats.set(techId, {
            technicianId: techId,
            technicianName: user ? `${user.firstname || ''} ${user.lastname || ''}`.trim() : `Tech ${techId}`,
            totalCA: 0,
            totalHeures: 0,
            caParHeure: 0,
            byUnivers: {},
          });
        }
        
        const stats = techStats.get(techId)!;
        stats.totalCA += techCA;
        stats.totalHeures += techTime;
        
        // Répartir par univers
        const caParUnivers = techCA / normalizedUniverses.length;
        const heuresParUnivers = techTime / normalizedUniverses.length;
        
        for (const univers of normalizedUniverses) {
          if (!stats.byUnivers[univers]) {
            stats.byUnivers[univers] = { ca: 0, heures: 0 };
          }
          stats.byUnivers[univers].ca += caParUnivers;
          stats.byUnivers[univers].heures += heuresParUnivers;
        }
      }
    }
    
    // Calculer CA/heure pour chaque technicien
    for (const stats of techStats.values()) {
      stats.caParHeure = stats.totalHeures > 0 ? stats.totalCA / stats.totalHeures : 0;
    }
    
    // Formater le résultat
    const result: Record<string, any> = {};
    let totalCA = 0;
    
    for (const [techId, stats] of techStats.entries()) {
      result[String(techId)] = {
        name: stats.technicianName,
        ca: stats.totalCA,
        heures: stats.totalHeures,
        caParHeure: stats.caParHeure,
        byUnivers: stats.byUnivers,
      };
      totalCA += stats.totalCA;
    }
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: techStats.size,
      },
      breakdown: {
        total: totalCA,
        technicianCount: techStats.size,
      }
    };
  }
};

/**
 * CA par Technicien
 * 
 * RÈGLE MÉTIER (conforme spec CA_PAR_TECHNICIEN):
 * - Pour chaque facture de la période, récupérer le projectId
 * - Identifier les techniciens productifs uniques (set de usersIds des visites + productives)
 * - Répartir CA_HT_total / nbTechsProductifs de manière ÉGALE (pas au prorata du temps)
 * - Avoirs intégrés en négatif
 * - Exclure RT, SAV non-facturant, visites annulées
 * 
 * SOURCES:
 * - apiGetFactures: CA HT, date, type facture
 * - apiGetProjects: lien facture → interventions
 * - apiGetInterventions: visites, usersIds, types
 * - apiGetUsers: noms techniciens
 */
export const caParTechnicien: StatDefinition = {
  id: 'ca_par_technicien',
  label: 'CA par Technicien',
  description: 'Répartition du CA HT facturé par technicien productif, en divisant le CA des dossiers par le nombre de techniciens intervenus en production.',
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
    
    console.log(`[StatIA ca_par_technicien] Données reçues: ${factures.length} factures, ${projects.length} projets, ${interventions.length} interventions, ${users.length} users`);
    
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
    
    // Structure pour accumuler CA par technicien
    const techCA = new Map<string | number, number>();
    const techNames = new Map<string | number, string>();
    
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
      
      // Récupérer les interventions du projet
      const projectInterventions = interventionsByProject.get(projectId) || [];
      
      // Construire le SET des techniciens productifs uniques
      const techsProductifs = new Set<string | number>();
      
      for (const intervention of projectInterventions) {
        // Filtrer les interventions non-productives (RT, SAV, diagnostic)
        if (!isProductiveIntervention(intervention)) continue;
        
        // Collecter les techniciens de cette intervention
        const interventionTechs = getProductiveTechnicians(intervention);
        for (const techId of interventionTechs) {
          techsProductifs.add(techId);
        }
      }
      
      // Nombre de techniciens productifs uniques
      const nbTechsProductifs = techsProductifs.size;
      
      // Si aucun technicien productif identifié, ignorer ce dossier
      if (nbTechsProductifs === 0) {
        dossiersIgnores++;
        continue;
      }
      
      // CA HT de la facture (avoirs en négatif via extractFactureMeta)
      const caHT = meta.montantNetHT;
      
      // Quote-part égale pour chaque technicien
      const quotePart = caHT / nbTechsProductifs;
      
      // Attribuer à chaque technicien du set
      for (const techId of techsProductifs) {
        techCA.set(techId, (techCA.get(techId) || 0) + quotePart);
        
        // Stocker le nom si pas encore fait
        if (!techNames.has(techId)) {
          const user = usersById.get(techId);
          techNames.set(techId, user ? `${user.firstname || ''} ${user.lastname || ''}`.trim() : `Tech ${techId}`);
        }
      }
      
      totalCADistribue += caHT;
      facturesTraitees++;
    }
    
    console.log(`[StatIA ca_par_technicien] Résultat: ${facturesTraitees} factures traitées, ${techCA.size} techniciens, ${dossiersIgnores} dossiers ignorés, CA total ${totalCADistribue}€`);
    
    // Formater le résultat
    const result: Record<string, number> = {};
    const names: Record<string, string> = {};
    
    for (const [techId, ca] of techCA.entries()) {
      result[String(techId)] = ca;
      names[String(techId)] = techNames.get(techId) || `Tech ${techId}`;
    }
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: techCA.size,
      },
      breakdown: {
        names,
        total: totalCADistribue,
        technicianCount: techCA.size,
        facturesTraitees,
        dossiersIgnores,
        formule: 'CA_HT / nbTechsProductifs (répartition égale)',
      }
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
    
    // Trier par CA décroissant
    const entries = Object.entries(baseResult.value as Record<string, number>);
    entries.sort((a, b) => b[1] - a[1]);
    
    const topN = params.filters?.topN || 10;
    const topEntries = entries.slice(0, topN);
    
    const result: Record<string, number> = {};
    for (const [id, ca] of topEntries) {
      result[id] = ca;
    }
    
    return {
      value: result,
      metadata: baseResult.metadata,
      breakdown: {
        ...baseResult.breakdown,
        ranking: topEntries.map(([id], index) => ({ 
          rank: index + 1, 
          id, 
          name: baseResult.breakdown?.names?.[id] 
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
    const caByTech = baseResult.value as Record<string, number>;
    
    // Filtrer les techniciens actifs (CA > 0)
    const techsActifs = Object.entries(caByTech).filter(([, ca]) => ca > 0);
    const nbTechActifs = techsActifs.length;
    
    // Calculer CA total productif
    const caTotal = techsActifs.reduce((sum, [, ca]) => sum + ca, 0);
    
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
        techniciens: techsActifs.map(([id, ca]) => ({
          id,
          name: baseResult.breakdown?.names?.[id] || `Tech ${id}`,
          ca,
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
    
    console.log(`[StatIA ca_par_technicien_temps] Données reçues: ${factures.length} factures, ${projects.length} projets, ${interventions.length} interventions, ${users.length} users`);
    
    const projectsById = indexProjectsById(projects);
    const usersById = indexUsersById(users);
    
    // Calculer le temps par technicien par projet
    const { dureeTechParProjet, dureeTotaleParProjet } = calculateTechTimeByProject(
      interventions, 
      projectsById
    );
    
    // Structure pour accumuler CA et temps par technicien
    const techStats = new Map<string | number, { caHt: number; temps: number }>();
    const techNames = new Map<string | number, string>();
    
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
          const user = usersById.get(techId);
          techNames.set(techId, user ? `${user.firstname || ''} ${user.lastname || ''}`.trim() : `Tech ${techId}`);
        }
        
        const stats = techStats.get(techId)!;
        stats.caHt += techCA;
        stats.temps += techTime;
      }
      
      totalCADistribue += caHT;
      facturesTraitees++;
    }
    
    console.log(`[StatIA ca_par_technicien_temps] Résultat: ${facturesTraitees} factures traitées, ${techStats.size} techniciens, ${dossiersIgnores} dossiers ignorés, CA total ${totalCADistribue}€`);
    
    // Formater le résultat : { techId: caHt }
    const result: Record<string, number> = {};
    const names: Record<string, string> = {};
    const details: Array<{ techId: string; techName: string; caHt: number; temps: number }> = [];
    
    for (const [techId, stats] of techStats.entries()) {
      const id = String(techId);
      result[id] = stats.caHt;
      names[id] = techNames.get(techId) || `Tech ${techId}`;
      details.push({
        techId: id,
        techName: names[id],
        caHt: stats.caHt,
        temps: stats.temps, // en heures
      });
    }
    
    // Trier par CA décroissant
    details.sort((a, b) => b.caHt - a.caHt);
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: techStats.size,
      },
      breakdown: {
        names,
        details,
        total: totalCADistribue,
        technicianCount: techStats.size,
        facturesTraitees,
        dossiersIgnores,
        formule: 'CA_HT × (temps_technicien / temps_total_dossier)',
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
};
