/**
 * StatIA - Définitions des métriques Devis Avancées
 * Métriques liées aux devis par technicien, univers, acceptation
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { normalizeUniversSlug } from '../engine/normalizers';
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

// ============= METRIC: Délai Acceptation Devis par Univers =============

export const delaiAcceptationDevisParUnivers: StatDefinition = {
  id: 'delai_acceptation_devis_par_univers',
  label: 'Délai Acceptation Devis par Univers',
  description: 'Délai d\'acceptation des devis ventilé par univers métier',
  category: 'devis',
  source: ['devis', 'projects'],
  dimensions: ['univers'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis, projects } = data;
    
    const projectsById = indexProjectsById(projects || []);
    const delaisByUnivers: Record<string, number[]> = {};
    
    for (const d of devis || []) {
      // Vérifier état accepté
      const state = (d.state || d.statut || d.data?.state || '').toString().toLowerCase();
      if (state !== 'accepted' && state !== 'accepte') continue;
      
      const dateEmission = parseDate(d.date || d.dateReelle || d.data?.date);
      const dateAcceptation = parseDate(d.dateAcceptation || d.data?.dateAcceptation);
      
      if (!dateEmission || !dateAcceptation) continue;
      
      // Filtre période
      if (params.dateRange) {
        if (dateAcceptation < params.dateRange.start || dateAcceptation > params.dateRange.end) continue;
      }
      
      const delaiJours = (dateAcceptation.getTime() - dateEmission.getTime()) / (1000 * 60 * 60 * 24);
      if (delaiJours < 0 || delaiJours > 365) continue; // Exclure valeurs aberrantes
      
      const projectId = String(d.projectId || d.data?.projectId || '');
      const project = projectsById.get(projectId) || projectsById.get(Number(projectId));
      const universes = extractUniverses(project);
      
      const delaiParUnivers = delaiJours / universes.length;
      
      for (const univers of universes) {
        if (!delaisByUnivers[univers]) delaisByUnivers[univers] = [];
        delaisByUnivers[univers].push(delaiParUnivers);
      }
    }
    
    const result: Record<string, number> = {};
    for (const [univers, delais] of Object.entries(delaisByUnivers)) {
      const moyenne = delais.reduce((a, b) => a + b, 0) / delais.length;
      result[univers] = Math.round(moyenne * 10) / 10;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'devis', recordCount: Object.keys(result).length }
    };
  }
};

// ============= METRIC: Taux Conversion Devis par Technicien =============

export const tauxConversionDevisParTechnicien: StatDefinition = {
  id: 'taux_conversion_devis_par_technicien',
  label: 'Taux Conversion Devis par Technicien',
  description: 'Taux de devis acceptés par technicien',
  category: 'devis',
  source: ['devis', 'interventions', 'users'],
  dimensions: ['technicien'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { devis, interventions, users } = data;
    
    const usersById = indexUsersById(users || []);
    
    // Index première intervention (RT) par projet → technicien
    const techByProject: Record<string, string> = {};
    for (const interv of interventions || []) {
      const projectId = String(interv.projectId || interv.project_id || '');
      if (!projectId) continue;
      
      // Prendre le technicien de la première intervention
      if (!techByProject[projectId]) {
        const techId = String(interv.userId || interv.user_id || '');
        if (techId) techByProject[projectId] = techId;
      }
    }
    
    // Compter devis par technicien
    const totalByTech: Record<string, number> = {};
    const acceptesByTech: Record<string, number> = {};
    
    for (const d of devis || []) {
      const dateStr = d.dateReelle || d.date || d.data?.date || d.created_at;
      const date = parseDate(dateStr);
      if (params.dateRange && date) {
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      // Récupérer technicien via projet
      const projectId = String(d.projectId || d.data?.projectId || '');
      const techId = techByProject[projectId];
      if (!techId) continue;
      
      const state = (d.state || d.statut || d.data?.state || '').toString().toLowerCase();
      const isSent = ['sent', 'accepted', 'invoice'].includes(state);
      if (!isSent) continue;
      
      totalByTech[techId] = (totalByTech[techId] || 0) + 1;
      
      if (state === 'accepted' || state === 'invoice') {
        acceptesByTech[techId] = (acceptesByTech[techId] || 0) + 1;
      }
    }
    
    const result: Record<string, number> = {};
    for (const [techId, total] of Object.entries(totalByTech)) {
      const acceptes = acceptesByTech[techId] || 0;
      const taux = total > 0 ? (acceptes / total) * 100 : 0;
      
      const user = usersById.get(techId) || usersById.get(Number(techId));
      const name = user ? `${user.firstname || ''} ${user.name || user.lastname || ''}`.trim() : `Tech ${techId}`;
      
      result[name] = Math.round(taux * 10) / 10;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'devis', recordCount: Object.keys(result).length }
    };
  }
};

// ============= METRIC: CA par Heure par Technicien =============

export const caParHeureParTechnicien: StatDefinition = {
  id: 'ca_par_heure_par_technicien',
  label: 'CA/Heure par Technicien',
  description: 'CA par heure ventilé par technicien',
  category: 'productivite',
  source: ['factures', 'interventions', 'projects', 'users'],
  dimensions: ['technicien'],
  aggregation: 'ratio',
  unit: '€/h',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, interventions, projects, users } = data;
    
    const projectsById = indexProjectsById(projects || []);
    const usersById = indexUsersById(users || []);
    
    // Calculer temps par technicien par projet
    const tempsByTechByProject: Record<string, Record<string, number>> = {};
    const tempsTotalByProject: Record<string, number> = {};
    
    for (const interv of interventions || []) {
      const state = (interv.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'draft') continue;
      
      const projectId = String(interv.projectId || interv.project_id || '');
      if (!projectId) continue;
      
      const techId = String(interv.userId || interv.user_id || '');
      if (!techId) continue;
      
      const dureeMinutes = interv.duree || interv.data?.duree || 60; // Default 1h
      
      if (!tempsByTechByProject[projectId]) tempsByTechByProject[projectId] = {};
      tempsByTechByProject[projectId][techId] = (tempsByTechByProject[projectId][techId] || 0) + dureeMinutes;
      tempsTotalByProject[projectId] = (tempsTotalByProject[projectId] || 0) + dureeMinutes;
    }
    
    // Répartir CA par technicien
    const caByTech: Record<string, number> = {};
    const heuresByTech: Record<string, number> = {};
    
    for (const f of factures || []) {
      const meta = { montantNetHT: f.data?.totalHT ?? f.totalHT ?? 0 };
      const fState = f.state || f.status || '';
      if (!['sent', 'paid', 'partially_paid', 'partial', 'overdue', 'validated', 'invoice'].includes(fState.toLowerCase())) continue;
      
      const dateStr = f.dateReelle || f.date || f.data?.date;
      const date = parseDate(dateStr);
      if (params.dateRange && date) {
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const projectId = String(f.projectId || f.project_id || f.data?.projectId || '');
      const techsForProject = tempsByTechByProject[projectId];
      const totalTime = tempsTotalByProject[projectId] || 0;
      
      if (!techsForProject || totalTime === 0) continue;
      
      const montant = typeof meta.montantNetHT === 'string' ? parseFloat(meta.montantNetHT) || 0 : Number(meta.montantNetHT) || 0;
      
      for (const [techId, temps] of Object.entries(techsForProject)) {
        const proportion = temps / totalTime;
        caByTech[techId] = (caByTech[techId] || 0) + montant * proportion;
        heuresByTech[techId] = (heuresByTech[techId] || 0) + temps / 60;
      }
    }
    
    const result: Record<string, number> = {};
    for (const [techId, ca] of Object.entries(caByTech)) {
      const heures = heuresByTech[techId] || 1;
      const caParHeure = ca / heures;
      
      const user = usersById.get(techId) || usersById.get(Number(techId));
      const name = user ? `${user.firstname || ''} ${user.name || user.lastname || ''}`.trim() : `Tech ${techId}`;
      
      result[name] = Math.round(caParHeure * 100) / 100;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: Object.keys(result).length }
    };
  }
};

// ============= METRIC: Productivité par Univers =============

export const productiviteParUnivers: StatDefinition = {
  id: 'productivite_par_univers',
  label: 'Productivité par Univers',
  description: 'CA par heure ventilé par univers métier',
  category: 'productivite',
  source: ['factures', 'interventions', 'projects'],
  dimensions: ['univers'],
  aggregation: 'ratio',
  unit: '€/h',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, interventions, projects } = data;
    
    const projectsById = indexProjectsById(projects || []);
    
    // Calculer heures par projet
    const heuresByProject: Record<string, number> = {};
    for (const interv of interventions || []) {
      const state = (interv.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'canceled' || state === 'draft') continue;
      
      const projectId = String(interv.projectId || interv.project_id || '');
      if (!projectId) continue;
      
      const dureeMinutes = interv.duree || interv.data?.duree || 0;
      const nbTechs = interv.nbTechs || interv.data?.nbTechs || 1;
      heuresByProject[projectId] = (heuresByProject[projectId] || 0) + (dureeMinutes * nbTechs) / 60;
    }
    
    // Répartir CA et heures par univers
    const caByUnivers: Record<string, number> = {};
    const heuresByUnivers: Record<string, number> = {};
    
    for (const f of factures || []) {
      const fState = f.state || f.status || '';
      if (!['sent', 'paid', 'partially_paid', 'partial', 'overdue', 'validated', 'invoice'].includes(fState.toLowerCase())) continue;
      
      const dateStr = f.dateReelle || f.date || f.data?.date;
      const date = parseDate(dateStr);
      if (params.dateRange && date) {
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const projectId = String(f.projectId || f.project_id || f.data?.projectId || '');
      const project = projectsById.get(projectId) || projectsById.get(Number(projectId));
      const universes = extractUniverses(project);
      
      const montant = f.data?.totalHT ?? f.totalHT ?? 0;
      const montantNum = typeof montant === 'string' ? parseFloat(montant) || 0 : Number(montant) || 0;
      const heures = heuresByProject[projectId] || 0;
      
      const caParUnivers = montantNum / universes.length;
      const heuresParUnivers = heures / universes.length;
      
      for (const univers of universes) {
        caByUnivers[univers] = (caByUnivers[univers] || 0) + caParUnivers;
        heuresByUnivers[univers] = (heuresByUnivers[univers] || 0) + heuresParUnivers;
      }
    }
    
    const result: Record<string, number> = {};
    for (const [univers, ca] of Object.entries(caByUnivers)) {
      const heures = heuresByUnivers[univers] || 1;
      result[univers] = Math.round((ca / heures) * 100) / 100;
    }
    
    return {
      value: result,
      metadata: { computedAt: new Date(), source: 'factures', recordCount: Object.keys(result).length }
    };
  }
};

// ============= EXPORT =============

export const devisAdvancedDefinitions: Record<string, StatDefinition> = {
  delai_acceptation_devis_par_univers: delaiAcceptationDevisParUnivers,
  taux_conversion_devis_par_technicien: tauxConversionDevisParTechnicien,
  ca_par_heure_par_technicien: caParHeureParTechnicien,
  productivite_par_univers: productiviteParUnivers,
};
