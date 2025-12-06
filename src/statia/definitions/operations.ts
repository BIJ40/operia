/**
 * StatIA - Définitions des métriques Opérations
 * Métriques liées aux interventions, dossiers, délais
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { isFactureStateIncluded, normalizeUniversSlug } from '../engine/normalizers';
import { extractFactureMeta } from '../rules/rules';
import { indexProjectsById, indexUsersById } from '../engine/loaders';

// ============= HELPERS =============

function parseDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function extractUniverses(project: any): string[] {
  const universes = project?.data?.universes || project?.universes || [];
  if (Array.isArray(universes) && universes.length > 0) {
    return universes.map((u: string) => normalizeUniversSlug(u)).filter(Boolean);
  }
  return ['non-classe'];
}

function getAgencyId(item: any): string {
  return String(item.agencyId || item.agency_id || item.data?.agencyId || 'unknown');
}

function isProductiveIntervention(intervention: any): boolean {
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase();
  const type = (intervention.type || intervention.data?.type || '').toLowerCase();
  
  // Exclure RT, SAV, diagnostic
  if (type2.includes('rt') || type2.includes('relev') || type2.includes('technique')) return false;
  if (type2.includes('sav') || type.includes('sav')) return false;
  if (type2.includes('diagnostic') || type.includes('diagnostic')) return false;
  
  return true;
}

// ============= METRIC: Cycle Moyen Dossier par Univers =============

export const cycleMoyenDossierParUnivers: StatDefinition = {
  id: 'cycle_moyen_dossier_par_univers',
  label: 'Cycle Moyen Dossier par Univers',
  description: 'Durée moyenne d\'un dossier de sa création à sa clôture pour chaque univers',
  category: 'dossiers',
  source: 'projects',
  dimensions: ['univers'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    const dureesByUnivers: Record<string, number[]> = {};
    
    for (const p of projects || []) {
      // Vérifier que le dossier est clos
      const state = (p.state || p.status || '').toLowerCase();
      if (!['clos', 'closed', 'termine', 'done', 'finished'].includes(state)) continue;
      
      const createdAt = parseDate(p.date || p.created_at || p.createdAt);
      const closedAt = parseDate(p.closedAt || p.closed_at || p.data?.closedAt);
      
      if (!createdAt || !closedAt) continue;
      
      // Filtre période sur closedAt
      if (params.dateRange) {
        if (closedAt < params.dateRange.start || closedAt > params.dateRange.end) continue;
      }
      
      const dureeJours = (closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (dureeJours < 0 || dureeJours > 730) continue; // Exclure valeurs aberrantes
      
      const universes = extractUniverses(p);
      const dureeParUnivers = dureeJours / universes.length;
      
      for (const univers of universes) {
        if (!dureesByUnivers[univers]) dureesByUnivers[univers] = [];
        dureesByUnivers[univers].push(dureeParUnivers);
      }
    }
    
    const result: Record<string, number> = {};
    for (const [univers, durees] of Object.entries(dureesByUnivers)) {
      const moyenne = durees.reduce((a, b) => a + b, 0) / durees.length;
      result[univers] = Math.round(moyenne * 10) / 10;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: Object.keys(result).length }
    };
  }
};

// ============= METRIC: Nb Moyen Interventions par Dossier =============

export const nbMoyenInterventionsDossier: StatDefinition = {
  id: 'nb_moyen_interventions_dossier',
  label: 'Nb Moyen Interventions/Dossier',
  description: 'Nombre moyen d\'interventions par dossier',
  category: 'dossiers',
  source: ['projects', 'interventions'],
  aggregation: 'avg',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, interventions } = data;
    
    // Compter interventions par projet
    const intervByProject: Record<string, number> = {};
    
    for (const interv of interventions || []) {
      const state = (interv.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'draft') continue;
      
      const projectId = String(interv.projectId || interv.project_id || '');
      if (!projectId) continue;
      
      intervByProject[projectId] = (intervByProject[projectId] || 0) + 1;
    }
    
    // Filtrer projets de la période
    let nbProjets = 0;
    let totalInterv = 0;
    
    for (const p of projects || []) {
      const dateStr = p.date || p.created_at || p.createdAt;
      const date = parseDate(dateStr);
      
      if (params.dateRange && date) {
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const projectId = String(p.id);
      const nbInterv = intervByProject[projectId] || 0;
      
      nbProjets++;
      totalInterv += nbInterv;
    }
    
    const moyenne = nbProjets > 0 ? totalInterv / nbProjets : 0;
    
    return {
      value: Math.round(moyenne * 10) / 10,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: nbProjets },
      breakdown: { nbProjets, totalInterv }
    };
  }
};

// ============= METRIC: Taux Dossiers Sans Devis par Agence =============

export const tauxDossiersSansDevisParAgence: StatDefinition = {
  id: 'taux_dossiers_sans_devis_par_agence',
  label: 'Taux Dossiers Sans Devis par Agence',
  description: 'Proportion de dossiers sans aucun devis, par agence',
  category: 'devis',
  source: ['projects', 'devis'],
  dimensions: ['agence'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, devis } = data;
    
    // Index projets avec devis
    const projetsAvecDevis = new Set<string>();
    for (const d of devis || []) {
      const projectId = String(d.projectId || d.data?.projectId || '');
      if (projectId) projetsAvecDevis.add(projectId);
    }
    
    // Compter par agence
    const totalByAgence: Record<string, number> = {};
    const sansDevisByAgence: Record<string, number> = {};
    
    for (const p of projects || []) {
      const dateStr = p.date || p.created_at || p.createdAt;
      const date = parseDate(dateStr);
      
      if (params.dateRange && date) {
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const agencyId = getAgencyId(p);
      const projectId = String(p.id);
      
      totalByAgence[agencyId] = (totalByAgence[agencyId] || 0) + 1;
      
      if (!projetsAvecDevis.has(projectId)) {
        sansDevisByAgence[agencyId] = (sansDevisByAgence[agencyId] || 0) + 1;
      }
    }
    
    const result: Record<string, number> = {};
    for (const agencyId of Object.keys(totalByAgence)) {
      const total = totalByAgence[agencyId] || 1;
      const sansDevis = sansDevisByAgence[agencyId] || 0;
      result[agencyId] = Math.round((sansDevis / total) * 1000) / 10;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: Object.keys(result).length }
    };
  }
};

// ============= METRIC: Taux Dossiers Sans Facture par Agence =============

export const tauxDossiersSansFactureParAgence: StatDefinition = {
  id: 'taux_dossiers_sans_facture_par_agence',
  label: 'Taux Dossiers Sans Facture par Agence',
  description: 'Proportion de dossiers clôturés sans facture émise, par agence',
  category: 'ca',
  source: ['projects', 'factures'],
  dimensions: ['agence'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, factures } = data;
    
    // Index projets facturés
    const projetsFactures = new Set<string>();
    for (const f of factures || []) {
      if (!isFactureStateIncluded(f.state)) continue;
      const projectId = String(f.projectId || f.project_id || f.data?.projectId || '');
      if (projectId) projetsFactures.add(projectId);
    }
    
    // Compter par agence (dossiers clos)
    const totalByAgence: Record<string, number> = {};
    const sansFactureByAgence: Record<string, number> = {};
    
    for (const p of projects || []) {
      const state = (p.state || p.status || '').toLowerCase();
      if (!['clos', 'closed', 'termine', 'done', 'finished'].includes(state)) continue;
      
      const closedAt = parseDate(p.closedAt || p.closed_at || p.data?.closedAt);
      if (params.dateRange && closedAt) {
        if (closedAt < params.dateRange.start || closedAt > params.dateRange.end) continue;
      }
      
      const agencyId = getAgencyId(p);
      const projectId = String(p.id);
      
      totalByAgence[agencyId] = (totalByAgence[agencyId] || 0) + 1;
      
      if (!projetsFactures.has(projectId)) {
        sansFactureByAgence[agencyId] = (sansFactureByAgence[agencyId] || 0) + 1;
      }
    }
    
    const result: Record<string, number> = {};
    for (const agencyId of Object.keys(totalByAgence)) {
      const total = totalByAgence[agencyId] || 1;
      const sansFacture = sansFactureByAgence[agencyId] || 0;
      result[agencyId] = Math.round((sansFacture / total) * 1000) / 10;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: Object.keys(result).length }
    };
  }
};

// ============= METRIC: Taux Annulations Interventions =============

export const tauxAnnulationsInterventions: StatDefinition = {
  id: 'taux_annulations_interventions',
  label: 'Taux Annulations Interventions',
  description: 'Proportion d\'interventions annulées par rapport aux interventions planifiées',
  category: 'productivite',
  source: 'interventions',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions } = data;
    
    let nbPlanifiees = 0;
    let nbAnnulees = 0;
    
    for (const interv of interventions || []) {
      const dateStr = interv.date || interv.created_at;
      const date = parseDate(dateStr);
      
      if (params.dateRange && date) {
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      nbPlanifiees++;
      
      const state = (interv.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'annule') {
        nbAnnulees++;
      }
    }
    
    const taux = nbPlanifiees > 0 ? (nbAnnulees / nbPlanifiees) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: { computedAt: new Date(), source: 'interventions', recordCount: nbPlanifiees },
      breakdown: { nbPlanifiees, nbAnnulees }
    };
  }
};

// ============= METRIC: Nb Interventions/Jour par Technicien =============

export const nbInterventionsJourParTechnicien: StatDefinition = {
  id: 'nb_interventions_jour_par_technicien',
  label: 'Nb Interventions/Jour par Technicien',
  description: 'Volume moyen d\'interventions réalisées par jour ouvré pour chaque technicien',
  category: 'productivite',
  source: ['interventions', 'users'],
  dimensions: ['technicien'],
  aggregation: 'avg',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, users } = data;
    
    const usersById = indexUsersById(users || []);
    
    // Interventions par technicien par jour
    const intervByTechByDay: Record<string, Set<string>> = {};
    const intervCountByTech: Record<string, number> = {};
    
    for (const interv of interventions || []) {
      const state = (interv.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'draft') continue;
      
      const dateStr = interv.date || interv.created_at;
      const date = parseDate(dateStr);
      if (!date) continue;
      
      if (params.dateRange) {
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const dateKey = date.toISOString().split('T')[0];
      const techId = String(interv.userId || interv.user_id || '');
      if (!techId) continue;
      
      // Compter les jours
      if (!intervByTechByDay[techId]) intervByTechByDay[techId] = new Set();
      intervByTechByDay[techId].add(dateKey);
      
      intervCountByTech[techId] = (intervCountByTech[techId] || 0) + 1;
    }
    
    const result: Record<string, number> = {};
    for (const [techId, days] of Object.entries(intervByTechByDay)) {
      const nbJours = days.size;
      const nbInterv = intervCountByTech[techId] || 0;
      const moyenne = nbJours > 0 ? nbInterv / nbJours : 0;
      
      const user = usersById.get(techId) || usersById.get(Number(techId));
      const name = user ? `${user.firstname || ''} ${user.name || user.lastname || ''}`.trim() : `Tech ${techId}`;
      
      result[name] = Math.round(moyenne * 10) / 10;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'interventions', recordCount: Object.keys(result).length }
    };
  }
};

// ============= METRIC: Durée Moyenne par Univers =============

export const dureeMoyenneParUnivers: StatDefinition = {
  id: 'duree_moyenne_par_univers',
  label: 'Durée Moyenne par Univers',
  description: 'Temps moyen passé par intervention, ventilé par univers',
  category: 'productivite',
  source: ['interventions', 'projects'],
  dimensions: ['univers'],
  aggregation: 'avg',
  unit: 'h',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, projects } = data;
    
    const projectsById = indexProjectsById(projects || []);
    const dureesByUnivers: Record<string, number[]> = {};
    
    for (const interv of interventions || []) {
      const state = (interv.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'draft') continue;
      
      const dateStr = interv.date || interv.created_at;
      const date = parseDate(dateStr);
      if (params.dateRange && date) {
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      // Récupérer durée
      const dureeMinutes = interv.duree || interv.data?.duree || 0;
      const dureeHeures = dureeMinutes / 60;
      if (dureeHeures <= 0) continue;
      
      const projectId = String(interv.projectId || interv.project_id || '');
      const project = projectsById.get(projectId) || projectsById.get(Number(projectId));
      const universes = extractUniverses(project);
      
      const dureeParUnivers = dureeHeures / universes.length;
      
      for (const univers of universes) {
        if (!dureesByUnivers[univers]) dureesByUnivers[univers] = [];
        dureesByUnivers[univers].push(dureeParUnivers);
      }
    }
    
    const result: Record<string, number> = {};
    for (const [univers, durees] of Object.entries(dureesByUnivers)) {
      const moyenne = durees.reduce((a, b) => a + b, 0) / durees.length;
      result[univers] = Math.round(moyenne * 10) / 10;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'interventions', recordCount: Object.keys(result).length }
    };
  }
};

// ============= METRIC: CA par Heure Global =============

export const caParHeureGlobal: StatDefinition = {
  id: 'ca_par_heure_global',
  label: 'CA/Heure Global',
  description: 'Chiffre d\'affaires moyen par heure travaillée (tous techniciens)',
  category: 'productivite',
  source: ['factures', 'interventions'],
  aggregation: 'ratio',
  unit: '€/h',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, interventions } = data;
    
    // Calculer CA total
    let caTotal = 0;
    for (const f of factures || []) {
      const meta = extractFactureMeta(f);
      if (!isFactureStateIncluded(f.state)) continue;
      
      if (params.dateRange && meta.date) {
        if (meta.date < params.dateRange.start || meta.date > params.dateRange.end) continue;
      }
      
      caTotal += meta.montantNetHT;
    }
    
    // Calculer heures totales
    let heuresTotales = 0;
    for (const interv of interventions || []) {
      const state = (interv.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'draft') continue;
      if (!isProductiveIntervention(interv)) continue;
      
      const dateStr = interv.date || interv.created_at;
      const date = parseDate(dateStr);
      if (params.dateRange && date) {
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const dureeMinutes = interv.duree || interv.data?.duree || 0;
      const nbTechs = interv.nbTechs || interv.data?.nbTechs || 1;
      heuresTotales += (dureeMinutes * nbTechs) / 60;
    }
    
    const caParHeure = heuresTotales > 0 ? caTotal / heuresTotales : 0;
    
    return {
      value: Math.round(caParHeure * 100) / 100,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: 0 },
      breakdown: { caTotal: Math.round(caTotal * 100) / 100, heuresTotales: Math.round(heuresTotales * 10) / 10 }
    };
  }
};

// ============= METRIC: Encaissements par Mois =============

export const encaissementsParMois: StatDefinition = {
  id: 'encaissements_par_mois',
  label: 'Encaissements par Mois',
  description: 'Montants encaissés par mois sur la période',
  category: 'recouvrement',
  source: 'factures',
  dimensions: ['mois'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    const encaissementsByMonth: Record<string, number> = {};
    
    for (const f of factures || []) {
      // Parcourir les paiements
      const payments = f.data?.payments || f.payments || [];
      
      for (const payment of payments) {
        const dateStr = payment.date || payment.dateEncaissement;
        const date = parseDate(dateStr);
        if (!date) continue;
        
        if (params.dateRange) {
          if (date < params.dateRange.start || date > params.dateRange.end) continue;
        }
        
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const montant = typeof payment.montant === 'string' ? parseFloat(payment.montant) || 0 : Number(payment.montant) || 0;
        
        encaissementsByMonth[monthKey] = (encaissementsByMonth[monthKey] || 0) + montant;
      }
    }
    
    // Arrondir
    for (const key of Object.keys(encaissementsByMonth)) {
      encaissementsByMonth[key] = Math.round(encaissementsByMonth[key] * 100) / 100;
    }
    
    return {
      value: encaissementsByMonth,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: Object.keys(encaissementsByMonth).length }
    };
  }
};

// ============= METRIC: Taux Recouvrement Moyen Réseau =============

export const tauxRecouvrementMoyenReseau: StatDefinition = {
  id: 'taux_recouvrement_moyen_reseau',
  label: 'Taux Recouvrement Moyen Réseau',
  description: 'Taux de recouvrement moyen sur l\'ensemble des agences',
  category: 'recouvrement',
  source: 'factures',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    let totalDu = 0;
    let totalEncaisse = 0;
    
    for (const f of factures || []) {
      if (!isFactureStateIncluded(f.state)) continue;
      
      const dateStr = f.date || f.dateReelle || f.data?.date;
      const date = parseDate(dateStr);
      if (params.dateRange && date) {
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const montantDu = f.data?.totalTTC ?? f.totalTTC ?? 0;
      const montantEncaisse = f.data?.amountPaid ?? f.amountPaid ?? 0;
      
      totalDu += typeof montantDu === 'string' ? parseFloat(montantDu) || 0 : Number(montantDu) || 0;
      totalEncaisse += typeof montantEncaisse === 'string' ? parseFloat(montantEncaisse) || 0 : Number(montantEncaisse) || 0;
    }
    
    const taux = totalDu > 0 ? (totalEncaisse / totalDu) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: factures?.length || 0 },
      breakdown: { totalDu: Math.round(totalDu * 100) / 100, totalEncaisse: Math.round(totalEncaisse * 100) / 100 }
    };
  }
};

// ============= METRIC: Top Univers SAV =============

export const topUniversGenerantSav: StatDefinition = {
  id: 'top_univers_generant_sav',
  label: 'Top Univers SAV',
  description: 'Classement des univers par volume de SAV',
  category: 'sav',
  source: ['interventions', 'projects'],
  dimensions: ['univers'],
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, projects } = data;
    
    const projectsById = indexProjectsById(projects || []);
    const savByUnivers: Record<string, number> = {};
    
    for (const interv of interventions || []) {
      const type2 = (interv.type2 || interv.data?.type2 || '').toLowerCase();
      const type = (interv.type || interv.data?.type || '').toLowerCase();
      const pictos = interv.data?.pictosInterv ?? [];
      
      // Est-ce un SAV ?
      const isSAV = type2.includes('sav') || type.includes('sav') || pictos.includes('SAV');
      if (!isSAV) continue;
      
      const dateStr = interv.date || interv.created_at;
      const date = parseDate(dateStr);
      if (params.dateRange && date) {
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const projectId = String(interv.projectId || interv.project_id || '');
      const project = projectsById.get(projectId) || projectsById.get(Number(projectId));
      const universes = extractUniverses(project);
      
      for (const univers of universes) {
        savByUnivers[univers] = (savByUnivers[univers] || 0) + 1;
      }
    }
    
    return {
      value: savByUnivers,
      metadata: { computedAt: new Date(), source: 'interventions', recordCount: Object.keys(savByUnivers).length }
    };
  }
};

// ============= METRIC: Taux Interventions Urgentes =============

export const tauxInterventionsUrgentes: StatDefinition = {
  id: 'taux_interventions_urgentes',
  label: 'Taux Interventions Urgentes',
  description: 'Proportion d\'interventions marquées urgentes',
  category: 'productivite',
  source: 'interventions',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions } = data;
    
    let nbTotal = 0;
    let nbUrgentes = 0;
    
    for (const interv of interventions || []) {
      const dateStr = interv.date || interv.created_at;
      const date = parseDate(dateStr);
      
      if (params.dateRange && date) {
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      nbTotal++;
      
      const isUrgent = interv.data?.isUrgent || interv.isUrgent || 
                       (interv.typeUrgence || '').toLowerCase().includes('urgent') ||
                       (interv.data?.typeUrgence || '').toLowerCase().includes('h24');
      
      if (isUrgent) nbUrgentes++;
    }
    
    const taux = nbTotal > 0 ? (nbUrgentes / nbTotal) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: { computedAt: new Date(), source: 'interventions', recordCount: nbTotal },
      breakdown: { nbTotal, nbUrgentes }
    };
  }
};

// ============= METRIC: Nb Dossiers Complexes =============

export const nbDossiersComplexes: StatDefinition = {
  id: 'nb_dossiers_complexes',
  label: 'Nb Dossiers Complexes',
  description: 'Nombre de dossiers répondant aux critères de complexité (≥6 visites, ≥2500€ HT, ≥2 univers)',
  category: 'dossiers',
  source: ['projects', 'interventions', 'factures'],
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, interventions, factures } = data;
    
    // Index visites par projet
    const visitesParProjet: Record<string, number> = {};
    for (const interv of interventions || []) {
      const state = (interv.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'draft') continue;
      const projectId = String(interv.projectId || interv.project_id || '');
      if (projectId) visitesParProjet[projectId] = (visitesParProjet[projectId] || 0) + 1;
    }
    
    // Index CA par projet
    const caParProjet: Record<string, number> = {};
    for (const f of factures || []) {
      if (!isFactureStateIncluded(f.state)) continue;
      const meta = extractFactureMeta(f);
      const projectId = String(f.projectId || f.project_id || f.data?.projectId || '');
      if (projectId) caParProjet[projectId] = (caParProjet[projectId] || 0) + meta.montantNetHT;
    }
    
    let nbComplexes = 0;
    
    for (const p of projects || []) {
      const dateStr = p.date || p.created_at || p.createdAt;
      const date = parseDate(dateStr);
      
      if (params.dateRange && date) {
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const projectId = String(p.id);
      const nbVisites = visitesParProjet[projectId] || 0;
      const ca = caParProjet[projectId] || 0;
      const universes = extractUniverses(p);
      const nbUnivers = universes.filter(u => u !== 'non-classe').length;
      
      // Critères de complexité
      if (nbVisites >= 6 && ca >= 2500 && nbUnivers >= 2) {
        nbComplexes++;
      }
    }
    
    return {
      value: nbComplexes,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: nbComplexes }
    };
  }
};

// ============= METRIC: Taux Dossiers Complexes =============

export const tauxDossiersComplexes: StatDefinition = {
  id: 'taux_dossiers_complexes',
  label: 'Taux Dossiers Complexes',
  description: 'Pourcentage de dossiers répondant aux critères de complexité',
  category: 'dossiers',
  source: ['projects', 'interventions', 'factures'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, interventions, factures } = data;
    
    // Index visites par projet
    const visitesParProjet: Record<string, number> = {};
    for (const interv of interventions || []) {
      const state = (interv.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'draft') continue;
      const projectId = String(interv.projectId || interv.project_id || '');
      if (projectId) visitesParProjet[projectId] = (visitesParProjet[projectId] || 0) + 1;
    }
    
    // Index CA par projet
    const caParProjet: Record<string, number> = {};
    for (const f of factures || []) {
      if (!isFactureStateIncluded(f.state)) continue;
      const meta = extractFactureMeta(f);
      const projectId = String(f.projectId || f.project_id || f.data?.projectId || '');
      if (projectId) caParProjet[projectId] = (caParProjet[projectId] || 0) + meta.montantNetHT;
    }
    
    let nbTotal = 0;
    let nbComplexes = 0;
    
    for (const p of projects || []) {
      const dateStr = p.date || p.created_at || p.createdAt;
      const date = parseDate(dateStr);
      
      if (params.dateRange && date) {
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      nbTotal++;
      
      const projectId = String(p.id);
      const nbVisites = visitesParProjet[projectId] || 0;
      const ca = caParProjet[projectId] || 0;
      const universes = extractUniverses(p);
      const nbUnivers = universes.filter(u => u !== 'non-classe').length;
      
      if (nbVisites >= 6 && ca >= 2500 && nbUnivers >= 2) {
        nbComplexes++;
      }
    }
    
    const taux = nbTotal > 0 ? (nbComplexes / nbTotal) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: nbTotal },
      breakdown: { nbTotal, nbComplexes }
    };
  }
};

// ============= METRIC: Délai Dossier Premier Devis =============

export const delaiDossierPremierDevis: StatDefinition = {
  id: 'delai_dossier_premier_devis',
  label: 'Délai 1er Devis',
  description: 'Nombre de jours moyen entre création du dossier et premier devis envoyé',
  category: 'devis',
  source: ['projects', 'devis'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, devis } = data;
    
    // Index premier devis par projet
    const premierDevisParProjet = new Map<string, Date>();
    
    for (const d of devis || []) {
      const state = (d.state || d.status || '').toLowerCase();
      if (state === 'draft' || state === 'cancelled') continue;
      
      const projectId = String(d.projectId || d.data?.projectId || '');
      if (!projectId) continue;
      
      const dateStr = d.date || d.dateReelle || d.created_at;
      const date = parseDate(dateStr);
      if (!date) continue;
      
      const existing = premierDevisParProjet.get(projectId);
      if (!existing || date < existing) {
        premierDevisParProjet.set(projectId, date);
      }
    }
    
    const delais: number[] = [];
    
    for (const p of projects || []) {
      const dateCreationStr = p.date || p.created_at || p.createdAt;
      const dateCreation = parseDate(dateCreationStr);
      if (!dateCreation) continue;
      
      if (params.dateRange) {
        if (dateCreation < params.dateRange.start || dateCreation > params.dateRange.end) continue;
      }
      
      const projectId = String(p.id);
      const premierDevis = premierDevisParProjet.get(projectId);
      
      if (premierDevis) {
        const delaiJours = (premierDevis.getTime() - dateCreation.getTime()) / (1000 * 60 * 60 * 24);
        if (delaiJours >= 0 && delaiJours <= 60) {
          delais.push(delaiJours);
        }
      }
    }
    
    const moyenne = delais.length > 0 ? delais.reduce((a, b) => a + b, 0) / delais.length : 0;
    
    return {
      value: moyenne > 0 ? Math.round(moyenne * 10) / 10 : null,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: delais.length },
      breakdown: { nbProjetsAvecDevis: delais.length }
    };
  }
};

// ============= EXPORT =============

export const operationsDefinitions: Record<string, StatDefinition> = {
  cycle_moyen_dossier_par_univers: cycleMoyenDossierParUnivers,
  nb_moyen_interventions_dossier: nbMoyenInterventionsDossier,
  taux_dossiers_sans_devis_par_agence: tauxDossiersSansDevisParAgence,
  taux_dossiers_sans_facture_par_agence: tauxDossiersSansFactureParAgence,
  taux_annulations_interventions: tauxAnnulationsInterventions,
  nb_interventions_jour_par_technicien: nbInterventionsJourParTechnicien,
  duree_moyenne_par_univers: dureeMoyenneParUnivers,
  ca_par_heure_global: caParHeureGlobal,
  encaissements_par_mois: encaissementsParMois,
  taux_recouvrement_moyen_reseau: tauxRecouvrementMoyenReseau,
  top_univers_generant_sav: topUniversGenerantSav,
  taux_interventions_urgentes: tauxInterventionsUrgentes,
  nb_dossiers_complexes: nbDossiersComplexes,
  taux_dossiers_complexes: tauxDossiersComplexes,
  delai_dossier_premier_devis: delaiDossierPremierDevis,
};
