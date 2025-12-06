/**
 * StatIA V2 - Définitions des métriques SAV
 * 
 * IMPORTANT: Le tableau de gestion SAV (/hc-agency/indicateurs/sav) est la SOURCE DE VÉRITÉ.
 * Les overrides sont passés via params.savOverrides par le hook useStatiaSAVMetrics.
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { extractFactureMeta } from '../rules/rules';
import { parseISO, isWithinInterval } from 'date-fns';

// ============================================================================
// HELPERS SAV
// ============================================================================

function getProjectDate(project: any): Date | null {
  const dateStr =
    project.dateReelle ||
    project.date ||
    project.created_at ||
    project.data?.dateReelle ||
    project.data?.date ||
    null;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Détection SAV automatique
 */
export function isSavProjectAutoDetect(project: any): boolean {
  const d = project.data || {};

  if (d.isSav === true || d.is_sav === true || d.isSAV === true) return true;
  if (project.isSav === true || project.is_sav === true) return true;
  if (project.parentProjectId || project.parent_project_id || d.parentId || d.parent_id) return true;
  if (project.parentId || project.parent_id) return true;
  if (d.linkedProjectId || d.linkedDossierId || d.dossierId) return true;

  const fieldsToCheck = [d.origineDossier, d.origine, d.typeDossier, d.categorie, d.type, d.sinistre, d.nature, project.type, project.state];
  for (const field of fieldsToCheck) {
    if (field && String(field).toLowerCase().trim() === 'sav') return true;
  }

  const pictos = d.pictosInterv || d.pictos || project.pictosInterv || [];
  if (Array.isArray(pictos) && pictos.some((p: any) => String(p).toLowerCase().trim() === 'sav')) return true;

  const tags = (d.tags || project.tags || []) as any[];
  if (Array.isArray(tags) && tags.some((t) => String(t).toLowerCase().trim() === 'sav')) return true;

  return false;
}

/**
 * Vérifie si un projet est SAV confirmé (respecte les overrides)
 */
export function isProjectConfirmedSAV(
  projectId: number,
  isAutoDetectedSAV: boolean,
  savOverrides?: Map<number, { is_confirmed_sav: boolean | null }>
): boolean {
  if (savOverrides) {
    const override = savOverrides.get(projectId);
    if (override) {
      if (override.is_confirmed_sav === false) return false;
      if (override.is_confirmed_sav === true) return true;
    }
  }
  return isAutoDetectedSAV;
}

function extractUniversesFromProject(project: any): string[] {
  const d = project.data || {};
  let universes: string[] = [];
  if (Array.isArray(d.universes)) universes = d.universes;
  else if (typeof d.univers === 'string') universes = [d.univers];
  else if (Array.isArray(project.universes)) universes = project.universes;
  return universes.map((u) => String(u).trim()).filter((u) => u.length > 0);
}

function mapApporteurs(clients: any[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of clients) {
    const id = String(c.id);
    const nom = c.displayName || c.raisonSociale || c.nom || c.name || c.label || c.data?.nom || `Apporteur ${id}`;
    map.set(id, nom);
  }
  return map;
}

function normalizeApporteurType(raw: any): string {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return 'Clients Directs';
  if (['assureur', 'assurance', 'assureurs'].includes(v)) return 'Assureurs';
  if (['bailleur', 'bailleurs', 'bailleur_social'].includes(v)) return 'Bailleurs';
  if (['syndic', 'copro', 'copropriete'].includes(v)) return 'Syndics';
  if (['maintenance', 'mainteneur'].includes(v)) return 'Maintenance';
  if (['gestion', 'gestionnaire'].includes(v)) return 'Gestionnaires';
  if (['pro', 'professionnel', 'professionnels'].includes(v)) return 'Professionnels';
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function mapApporteurInfos(clients: any[]): Map<string, { id: string; name: string; type: string }> {
  const map = new Map();
  for (const c of clients) {
    const id = String(c.id);
    const name = c.displayName || c.raisonSociale || c.nom || c.name || `Apporteur ${id}`;
    const rawType = c.data?.type || c.data?.typeApporteur || c.data?.categorie || c.categorie || null;
    map.set(id, { id, name, type: normalizeApporteurType(rawType) });
  }
  return map;
}

function isSAVIntervention(intervention: any): boolean {
  const type2 = (intervention.data?.type2 || intervention.type2 || '').toLowerCase().trim();
  const type = (intervention.data?.type || intervention.type || '').toLowerCase().trim();
  const pictos = intervention.data?.pictosInterv || [];
  return type2 === 'sav' || type === 'sav' || (Array.isArray(pictos) && pictos.some((p: any) => String(p).toLowerCase().trim() === 'sav'));
}

// ============================================================================
// MÉTRIQUES SAV
// ============================================================================

export const tauxSavGlobal: StatDefinition = {
  id: 'taux_sav_global',
  label: 'Taux SAV Global',
  description: 'Taux de SAV = nb dossiers SAV confirmés / nb dossiers total',
  category: 'sav',
  source: ['projects'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    const savOverrides = (params as any).savOverrides as Map<number, { is_confirmed_sav: boolean | null }> | undefined;
    
    let nbDossiersTotal = 0;
    let nbDossiersSAV = 0;
    
    for (const project of projects) {
      const date = getProjectDate(project);
      if (!date) continue;
      if (params.dateRange && (date < params.dateRange.start || date > params.dateRange.end)) continue;
      
      nbDossiersTotal++;
      const isAutoSav = isSavProjectAutoDetect(project);
      if (isProjectConfirmedSAV(Number(project.id), isAutoSav, savOverrides)) {
        nbDossiersSAV++;
      }
    }
    
    const taux = nbDossiersTotal > 0 ? (nbDossiersSAV / nbDossiersTotal) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: { computedAt: new Date(), source: 'projects', recordCount: projects.length },
      breakdown: { nbDossiersTotal, nbDossiersSAV, taux: Math.round(taux * 10) / 10 }
    };
  }
};

export const tauxSavParUnivers: StatDefinition = {
  id: 'taux_sav_par_univers',
  label: 'Taux SAV par Univers',
  description: 'Proportion de dossiers SAV par univers',
  category: 'sav',
  source: ['projects'],
  unit: '%',
  dimensions: ['univers'],
  aggregation: 'ratio',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    const savOverrides = (params as any).savOverrides as Map<number, { is_confirmed_sav: boolean | null }> | undefined;
    
    const totalByUnivers: Record<string, number> = {};
    const savByUnivers: Record<string, number> = {};

    for (const project of projects) {
      const date = getProjectDate(project);
      if (!date) continue;
      if (params.dateRange && (date < params.dateRange.start || date > params.dateRange.end)) continue;

      const universes = extractUniversesFromProject(project);
      const finalUniverses = universes.length > 0 ? universes : ['non-classe'];
      const isAutoSav = isSavProjectAutoDetect(project);
      const isSav = isProjectConfirmedSAV(Number(project.id), isAutoSav, savOverrides);

      for (const u of finalUniverses) {
        totalByUnivers[u] = (totalByUnivers[u] || 0) + 1;
        if (isSav) savByUnivers[u] = (savByUnivers[u] || 0) + 1;
      }
    }

    const result: Record<string, number> = {};
    const details: Record<string, { total: number; sav: number; taux: number }> = {};

    for (const u of Object.keys(totalByUnivers)) {
      const total = totalByUnivers[u] || 0;
      const sav = savByUnivers[u] || 0;
      const taux = total > 0 ? (sav / total) * 100 : 0;
      result[u] = Math.round(taux * 10) / 10;
      details[u] = { total, sav, taux: Math.round(taux * 10) / 10 };
    }

    return { value: result, metadata: { computedAt: new Date(), source: 'projects', recordCount: projects.length }, breakdown: { details } };
  },
};

export const tauxSavParApporteur: StatDefinition = {
  id: 'taux_sav_par_apporteur',
  label: 'Taux de SAV par Apporteur',
  description: 'Proportion de dossiers SAV par apporteur',
  category: 'sav',
  source: ['projects', 'clients'],
  unit: '%',
  dimensions: ['apporteur'],
  aggregation: 'ratio',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, clients } = data;
    const savOverrides = (params as any).savOverrides as Map<number, { is_confirmed_sav: boolean | null }> | undefined;
    const apporteursById = mapApporteurs(clients);

    const totalByApporteur: Record<string, number> = {};
    const savByApporteur: Record<string, number> = {};

    for (const project of projects) {
      const date = getProjectDate(project);
      if (!date) continue;
      if (params.dateRange && (date < params.dateRange.start || date > params.dateRange.end)) continue;

      const apporteurIdRaw = project.data?.commanditaireId || project.commanditaireId;
      const keyNom = apporteurIdRaw ? (apporteursById.get(String(apporteurIdRaw)) || `Apporteur ${apporteurIdRaw}`) : 'Clients Directs';
      const isAutoSav = isSavProjectAutoDetect(project);
      const isSav = isProjectConfirmedSAV(Number(project.id), isAutoSav, savOverrides);

      totalByApporteur[keyNom] = (totalByApporteur[keyNom] || 0) + 1;
      if (isSav) savByApporteur[keyNom] = (savByApporteur[keyNom] || 0) + 1;
    }

    const result: Record<string, number> = {};
    const details: Record<string, { total: number; sav: number; taux: number }> = {};

    for (const nom of Object.keys(totalByApporteur)) {
      const total = totalByApporteur[nom] || 0;
      const sav = savByApporteur[nom] || 0;
      const taux = total > 0 ? (sav / total) * 100 : 0;
      result[nom] = Math.round(taux * 10) / 10;
      details[nom] = { total, sav, taux: Math.round(taux * 10) / 10 };
    }

    return { value: result, metadata: { computedAt: new Date(), source: 'projects', recordCount: projects.length }, breakdown: { details } };
  },
};

export const tauxSavParTypeApporteur: StatDefinition = {
  id: 'taux_sav_par_type_apporteur',
  label: "Taux de SAV par type d'apporteur",
  description: "Proportion de dossiers SAV par type d'apporteur",
  category: 'sav',
  source: ['projects', 'clients'],
  unit: '%',
  dimensions: ['type_apporteur'],
  aggregation: 'ratio',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, clients } = data;
    const savOverrides = (params as any).savOverrides as Map<number, { is_confirmed_sav: boolean | null }> | undefined;
    const apporteursInfoById = mapApporteurInfos(clients);

    const totalByType: Record<string, number> = {};
    const savByType: Record<string, number> = {};

    for (const project of projects) {
      const date = getProjectDate(project);
      if (!date) continue;
      if (params.dateRange && (date < params.dateRange.start || date > params.dateRange.end)) continue;

      const cmdIdRaw = project.data?.commanditaireId || project.commanditaireId;
      const typeApporteur = cmdIdRaw ? (apporteursInfoById.get(String(cmdIdRaw))?.type || 'Clients Directs') : 'Clients Directs';
      const isAutoSav = isSavProjectAutoDetect(project);
      const isSav = isProjectConfirmedSAV(Number(project.id), isAutoSav, savOverrides);

      totalByType[typeApporteur] = (totalByType[typeApporteur] || 0) + 1;
      if (isSav) savByType[typeApporteur] = (savByType[typeApporteur] || 0) + 1;
    }

    const result: Record<string, number> = {};
    const details: Record<string, { total: number; sav: number; taux: number }> = {};

    for (const type of Object.keys(totalByType)) {
      const total = totalByType[type] || 0;
      const sav = savByType[type] || 0;
      const taux = total > 0 ? (sav / total) * 100 : 0;
      result[type] = Math.round(taux * 10) / 10;
      details[type] = { total, sav, taux: Math.round(taux * 10) / 10 };
    }

    return { value: result, metadata: { computedAt: new Date(), source: 'projects', recordCount: projects.length }, breakdown: { details } };
  },
};

export const nbSavGlobal: StatDefinition = {
  id: 'nb_sav_global',
  label: 'Nombre de SAV',
  description: 'Nombre de dossiers SAV confirmés sur la période',
  category: 'sav',
  source: ['projects'],
  unit: '',
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    const savOverrides = (params as any).savOverrides as Map<number, { is_confirmed_sav: boolean | null }> | undefined;
    
    let nbSav = 0;
    for (const project of projects) {
      const date = getProjectDate(project);
      if (!date) continue;
      if (params.dateRange && (date < params.dateRange.start || date > params.dateRange.end)) continue;
      
      const isAutoSav = isSavProjectAutoDetect(project);
      if (isProjectConfirmedSAV(Number(project.id), isAutoSav, savOverrides)) nbSav++;
    }
    
    return { value: nbSav, metadata: { computedAt: new Date(), source: 'projects', recordCount: nbSav } };
  }
};

export const nbInterventionsSav: StatDefinition = {
  id: 'nb_interventions_sav',
  label: 'Nb interventions SAV',
  description: "Nombre total d'interventions SAV sur la période",
  category: 'sav',
  source: 'interventions',
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions } = data;
    let count = 0;
    
    for (const intervention of interventions) {
      const date = intervention.date || intervention.created_at;
      if (date) {
        try {
          const interventionDate = parseISO(date);
          if (!isWithinInterval(interventionDate, { start: params.dateRange.start, end: params.dateRange.end })) continue;
        } catch { continue; }
      }
      if (isSAVIntervention(intervention)) count++;
    }
    
    return { value: count, metadata: { computedAt: new Date(), source: 'interventions', recordCount: count } };
  }
};

export const caImpacteSav: StatDefinition = {
  id: 'ca_impacte_sav',
  label: 'CA impacté par SAV',
  description: "CA des dossiers SAV confirmés",
  category: 'sav',
  source: ['factures', 'projects'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    const savOverrides = (params as any).savOverrides as Map<number, { is_confirmed_sav: boolean | null }> | undefined;
    
    const projetsSAV = new Set<string>();
    for (const project of projects) {
      const isAutoSav = isSavProjectAutoDetect(project);
      if (isProjectConfirmedSAV(Number(project.id), isAutoSav, savOverrides)) {
        projetsSAV.add(String(project.id));
      }
    }
    
    let caImpacte = 0;
    let nbFactures = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (!meta.date) continue;
      if (!isWithinInterval(meta.date, { start: params.dateRange.start, end: params.dateRange.end })) continue;
      
      const projectId = String(facture.projectId || facture.project_id);
      if (projetsSAV.has(projectId)) {
        caImpacte += meta.montantNetHT;
        nbFactures++;
      }
    }
    
    return { value: Math.round(caImpacte * 100) / 100, metadata: { computedAt: new Date(), source: 'factures', recordCount: nbFactures }, breakdown: { nbProjetsSAV: projetsSAV.size, nbFactures } };
  }
};

export const coutSavEstime: StatDefinition = {
  id: 'cout_sav_estime',
  label: 'Coût SAV total',
  description: 'Coût SAV = somme des coûts manuels + estimation 20% pour les autres',
  category: 'sav',
  source: ['factures', 'projects'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects } = data;
    const savOverrides = (params as any).savOverrides as Map<number, { is_confirmed_sav: boolean | null; cout_sav_manuel: number | null }> | undefined;
    
    const facturesByProjectId = new Map<string, number>();
    for (const f of factures) {
      const meta = extractFactureMeta(f);
      if (!meta.date) continue;
      const pid = String(f.projectId || f.project_id || '');
      if (!pid) continue;
      facturesByProjectId.set(pid, (facturesByProjectId.get(pid) || 0) + meta.montantNetHT);
    }
    
    let coutTotalSAV = 0;
    let nbDossiersSAV = 0;
    
    for (const project of projects) {
      const date = getProjectDate(project);
      if (!date) continue;
      if (params.dateRange && (date < params.dateRange.start || date > params.dateRange.end)) continue;
      
      const projectId = Number(project.id);
      const isAutoSav = isSavProjectAutoDetect(project);
      if (!isProjectConfirmedSAV(projectId, isAutoSav, savOverrides)) continue;
      
      nbDossiersSAV++;
      
      // Coût manuel prioritaire
      const override = savOverrides?.get(projectId);
      if (override?.cout_sav_manuel != null && override.cout_sav_manuel > 0) {
        coutTotalSAV += override.cout_sav_manuel;
        continue;
      }
      
      // Fallback: estimation 20% du CA parent
      const parentIdRaw = project.parentProjectId || project.parent_project_id || project.parentId || project.parent_id || project.data?.parentId || project.data?.linkedProjectId || project.data?.dossierId;
      if (parentIdRaw) {
        const caParent = facturesByProjectId.get(String(parentIdRaw)) || 0;
        if (caParent > 0) coutTotalSAV += caParent * 0.20;
      }
    }
    
    return { value: Math.round(coutTotalSAV * 100) / 100, metadata: { computedAt: new Date(), source: 'factures', recordCount: nbDossiersSAV }, breakdown: { nbDossiersSAV } };
  }
};

export const savDefinitions = {
  taux_sav_global: tauxSavGlobal,
  taux_sav_par_univers: tauxSavParUnivers,
  taux_sav_par_apporteur: tauxSavParApporteur,
  taux_sav_par_type_apporteur: tauxSavParTypeApporteur,
  nb_sav_global: nbSavGlobal,
  nb_interventions_sav: nbInterventionsSav,
  ca_impacte_sav: caImpacteSav,
  cout_sav_estime: coutSavEstime,
};