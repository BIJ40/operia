/**
 * StatIA V2 - Définitions des métriques SAV
 * Consolidation complète des métriques SAV depuis savCalculations et autres sources
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { 
  normalizeUniversSlug,
  isFactureStateIncluded
} from '../engine/normalizers';
import { extractFactureMeta } from '../rules/rules';
import { indexProjectsById } from '../engine/loaders';
import { parseISO, isWithinInterval } from 'date-fns';

// ============================================================================
// HELPERS COMMUNS SAV
// ============================================================================

/**
 * Date dossier unifiée - extraction robuste de la date projet
 */
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
 * Détection SAV robuste - vérifie si un projet est un SAV
 * Vérifie multiples champs possibles dans Apogée
 */
function isSavProject(project: any): boolean {
  const d = project.data || {};

  // Flags explicites (plusieurs variantes)
  if (d.isSav === true || d.is_sav === true || d.isSAV === true) return true;
  if (project.isSav === true || project.is_sav === true) return true;

  // Parent project ID (dossier enfant = SAV)
  if (project.parentProjectId || project.parent_project_id || d.parentId || d.parent_id) return true;
  if (project.parentId || project.parent_id) return true;
  
  // Dossier lié (linked dossier = potentiel SAV)
  if (d.linkedProjectId || d.linkedDossierId || d.dossierId) return true;

  // Origine / type / catégorie / state === 'SAV' (égalité stricte, pas includes)
  const fieldsToCheck = [
    d.origineDossier,
    d.origine,
    d.typeDossier,
    d.categorie,
    d.type,
    d.sinistre,
    d.nature,
    project.type,
    project.state,
  ];
  
  for (const field of fieldsToCheck) {
    if (field && String(field).toLowerCase().trim() === 'sav') {
      return true;
    }
  }

  // Pictos === 'SAV' (égalité stricte)
  const pictos = d.pictosInterv || d.pictos || project.pictosInterv || [];
  if (Array.isArray(pictos) && pictos.some((p: any) => String(p).toLowerCase().trim() === 'sav')) {
    return true;
  }

  // Tags === 'SAV' (égalité stricte)
  const tags = (d.tags || project.tags || []) as any[];
  if (Array.isArray(tags) && tags.some((t) => String(t).toLowerCase().trim() === 'sav')) {
    return true;
  }

  return false;
}

// Debug: Log sample projects to understand data structure (temporary)
let _savDebugLogged = false;
function debugSavDetection(projects: any[]): void {
  if (_savDebugLogged || projects.length === 0) return;
  _savDebugLogged = true;
  
  const samples = projects.slice(0, 3);
  console.log('[StatIA SAV DEBUG] Sample projects structure:', samples.map(p => ({
    id: p.id,
    ref: p.ref,
    label: p.label,
    state: p.state,
    type: p.type,
    parentId: p.parentId,
    parentProjectId: p.parentProjectId,
    data_keys: p.data ? Object.keys(p.data).slice(0, 20) : [],
    data_parentId: p.data?.parentId,
    data_isSav: p.data?.isSav,
    data_origine: p.data?.origineDossier || p.data?.origine,
    data_sinistre: p.data?.sinistre,
    data_pictosInterv: p.data?.pictosInterv,
    isSav: isSavProject(p),
  })));
  
  // Count SAV
  const savCount = projects.filter(p => isSavProject(p)).length;
  console.log(`[StatIA SAV DEBUG] Total projects: ${projects.length}, SAV detected: ${savCount}`);
}

/**
 * Extraction des univers d'un projet
 */
function extractUniversesFromProject(project: any): string[] {
  if (!project) return [];
  const d = project.data || {};

  let universes: string[] = [];

  if (Array.isArray(d.universes)) {
    universes = d.universes;
  } else if (typeof d.univers === 'string') {
    universes = [d.univers];
  } else if (Array.isArray(project.universes)) {
    universes = project.universes;
  }

  return universes
    .map((u) => String(u).trim())
    .filter((u) => u.length > 0);
}

/**
 * Mapping apporteurId → Nom lisible
 */
function mapApporteurs(clients: any[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const c of clients) {
    const id = String(c.id);
    const nom =
      c.displayName ||
      c.raisonSociale ||
      c.nom ||
      c.name ||
      c.label ||
      c.data?.nom ||
      c.data?.name ||
      c.data?.raisonSociale ||
      `Apporteur ${id}`;

    map.set(id, nom);
  }

  return map;
}

// ============================================================================
// HELPERS POUR TYPE D'APPORTEUR
// ============================================================================

type ApporteurInfo = {
  id: string;
  name: string;
  type: string;
};

/**
 * Normalise le type d'apporteur en catégorie standardisée
 */
function normalizeApporteurType(raw: any): string {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return 'Clients Directs';

  if (['assureur', 'assurance', 'assureurs'].includes(v)) return 'Assureurs';
  if (['bailleur', 'bailleurs', 'bailleur_social'].includes(v)) return 'Bailleurs';
  if (['syndic', 'copro', 'copropriete'].includes(v)) return 'Syndics';
  if (['maintenance', 'mainteneur'].includes(v)) return 'Maintenance';
  if (['gestion', 'gestionnaire'].includes(v)) return 'Gestionnaires';
  if (['pro', 'professionnel', 'professionnels'].includes(v)) return 'Professionnels';

  // fallback générique: capitalize first letter
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/**
 * Mapping apporteurId → ApporteurInfo (nom + type)
 */
function mapApporteurInfos(clients: any[]): Map<string, ApporteurInfo> {
  const map = new Map<string, ApporteurInfo>();

  for (const c of clients) {
    const id = String(c.id);
    const name =
      c.displayName ||
      c.raisonSociale ||
      c.nom ||
      c.name ||
      c.label ||
      c.data?.nom ||
      c.data?.name ||
      c.data?.raisonSociale ||
      `Apporteur ${id}`;

    const rawType =
      c.data?.type ||
      c.data?.typeApporteur ||
      c.data?.categorie ||
      c.categorie ||
      null;

    const type = normalizeApporteurType(rawType);

    map.set(id, { id, name, type });
  }

  return map;
}

// ============================================================================
// HELPERS INTERVENTIONS SAV
// ============================================================================

/**
 * Détecte si une intervention est de type SAV
 * RÈGLE STRICTE: type === "SAV" OU picto === "SAV" (égalité exacte)
 */
function isSAVIntervention(intervention: any): boolean {
  const type2 = (intervention.data?.type2 || intervention.type2 || '').toLowerCase().trim();
  const type = (intervention.data?.type || intervention.type || '').toLowerCase().trim();
  const pictos = intervention.data?.pictosInterv || [];
  
  return (
    type2 === 'sav' || 
    type === 'sav' || 
    (Array.isArray(pictos) && pictos.some((p: any) => String(p).toLowerCase().trim() === 'sav'))
  );
}

/**
 * Détecte si un projet a eu un SAV (via interventions ou pictos)
 */
function projectHasSAV(project: any, interventions: any[]): boolean {
  const projectId = project.id;
  
  // Via interventions
  const hasSAVIntervention = interventions.some(
    i => i.projectId === projectId && isSAVIntervention(i)
  );
  
  // Via picto projet
  const pictos = project.data?.pictoInterv || [];
  const hasSAVPicto = pictos.includes('SAV');
  
  // Via sinistre
  const sinistre = (project.data?.sinistre || '').toLowerCase();
  const hasSAVSinistre = sinistre === 'sav';
  
  // Via relation parent ou flags
  const isChildSAV = isSavProject(project);
  
  return hasSAVIntervention || hasSAVPicto || hasSAVSinistre || isChildSAV;
}

/**
 * Identifie si une intervention est "réalisée" (terminée)
 */
function isInterventionRealisee(intervention: any): boolean {
  const state = (intervention.state || intervention.statut || intervention.data?.state || '').toLowerCase();
  return ['done', 'finished', 'validated', 'completed', 'réalisée', 'terminée'].includes(state);
}

/**
 * Taux SAV Global (basé interventions)
 * taux = nb_interventions_SAV / nb_interventions_initiales
 * Intervention initiale = première intervention réalisée par dossier (min date)
 */
export const tauxSavGlobal: StatDefinition = {
  id: 'taux_sav_global',
  label: 'Taux SAV Global',
  description: 'Taux de SAV = nb interventions SAV / nb interventions initiales (par dossier)',
  category: 'sav',
  source: ['interventions'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions } = data;
    
    console.log('[StatIA] TAUX_SAV_GLOBAL - START', { nbInterventions: interventions.length });
    
    // 1. Filtrer interventions réalisées dans la période
    const interventionsRealisees: any[] = [];
    
    for (const intervention of interventions) {
      if (!isInterventionRealisee(intervention)) continue;
      
      const dateStr = intervention.dateReelle || intervention.date || intervention.data?.dateReelle || intervention.created_at;
      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          if (!isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      interventionsRealisees.push(intervention);
    }
    
    console.log('[StatIA] TAUX_SAV_GLOBAL - Interventions réalisées:', interventionsRealisees.length);
    
    // 2. Grouper par dossier et identifier intervention initiale
    const parDossier = new Map<string | number, { interventions: any[], dateMin: Date | null }>();
    
    for (const intervention of interventionsRealisees) {
      const projectId = intervention.projectId || intervention.project_id;
      if (!projectId) continue;
      
      if (!parDossier.has(projectId)) {
        parDossier.set(projectId, { interventions: [], dateMin: null });
      }
      
      const group = parDossier.get(projectId)!;
      group.interventions.push(intervention);
      
      const dateStr = intervention.dateReelle || intervention.date || intervention.data?.dateReelle;
      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          if (!group.dateMin || date < group.dateMin) {
            group.dateMin = date;
          }
        } catch {}
      }
    }
    
    // 3. Compter interventions initiales et SAV
    let nbInterventionsInitiales = 0;
    let nbInterventionsSAV = 0;
    
    for (const [projectId, group] of parDossier) {
      // Chaque dossier a une intervention initiale
      nbInterventionsInitiales++;
      
      // Compter les SAV dans ce dossier
      for (const intervention of group.interventions) {
        if (isSAVIntervention(intervention)) {
          nbInterventionsSAV++;
        }
      }
    }
    
    console.log('[StatIA] TAUX_SAV_GLOBAL - Résultat:', { 
      nbDossiers: parDossier.size,
      nbInterventionsInitiales, 
      nbInterventionsSAV 
    });
    
    // 4. Calculer taux
    const taux = nbInterventionsInitiales > 0 
      ? (nbInterventionsSAV / nbInterventionsInitiales) * 100 
      : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'interventions',
        recordCount: interventionsRealisees.length,
      },
      breakdown: {
        nbInterventionsInitiales,
        nbInterventionsSAV,
        nbDossiers: parDossier.size,
        taux: Math.round(taux * 10) / 10,
      }
    };
  }
};

/**
 * Taux SAV par Univers
 * Proportion de dossiers SAV par univers
 */
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

    // Debug SAV detection
    debugSavDetection(projects);

    const totalByUnivers: Record<string, number> = {};
    const savByUnivers: Record<string, number> = {};

    for (const project of projects) {
      const date = getProjectDate(project);
      if (!date) continue;

      if (params.dateRange && (date < params.dateRange.start || date > params.dateRange.end)) {
        continue;
      }

      const universes = extractUniversesFromProject(project);
      const finalUniverses = universes.length > 0 ? universes : ['non-classe'];

      const isSav = isSavProject(project);

      for (const u of finalUniverses) {
        totalByUnivers[u] = (totalByUnivers[u] || 0) + 1;
        if (isSav) {
          savByUnivers[u] = (savByUnivers[u] || 0) + 1;
        }
      }
    }

    const result: Record<string, number> = {};
    const details: Record<string, { total: number; sav: number; taux: number }> = {};

    for (const u of Object.keys(totalByUnivers)) {
      const total = totalByUnivers[u] || 0;
      const sav = savByUnivers[u] || 0;
      const taux = total > 0 ? (sav / total) * 100 : 0;
      const tauxRounded = Math.round(taux * 10) / 10;

      result[u] = tauxRounded;
      details[u] = { total, sav, taux: tauxRounded };
    }

    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: projects.length,
      },
      breakdown: { details },
    };
  },
};

/**
 * Taux SAV par Apporteur
 * Proportion de dossiers SAV par apporteur/commanditaire
 */
export const tauxSavParApporteur: StatDefinition = {
  id: 'taux_sav_par_apporteur',
  label: 'Taux de SAV par Apporteur',
  description: 'Proportion de dossiers SAV par apporteur/commanditaire',
  category: 'sav',
  source: ['projects', 'clients'],
  unit: '%',
  dimensions: ['apporteur'],
  aggregation: 'ratio',

  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, clients } = data;

    // Debug SAV detection
    debugSavDetection(projects);

    const apporteursById = mapApporteurs(clients);

    const totalByApporteur: Record<string, number> = {};
    const savByApporteur: Record<string, number> = {};

    for (const project of projects) {
      const date = getProjectDate(project);
      if (!date) continue;

      if (params.dateRange && (date < params.dateRange.start || date > params.dateRange.end)) {
        continue;
      }

      const apporteurIdRaw = project.data?.commanditaireId || project.commanditaireId;

      const keyNom = (() => {
        if (!apporteurIdRaw) {
          return 'Clients Directs';
        }
        const idStr = String(apporteurIdRaw);
        return apporteursById.get(idStr) || `Apporteur ${idStr}`;
      })();

      const isSav = isSavProject(project);

      totalByApporteur[keyNom] = (totalByApporteur[keyNom] || 0) + 1;
      if (isSav) {
        savByApporteur[keyNom] = (savByApporteur[keyNom] || 0) + 1;
      }
    }

    const result: Record<string, number> = {};
    const details: Record<string, { total: number; sav: number; taux: number }> = {};

    for (const nom of Object.keys(totalByApporteur)) {
      const total = totalByApporteur[nom] || 0;
      const sav = savByApporteur[nom] || 0;
      const taux = total > 0 ? (sav / total) * 100 : 0;
      const tauxRounded = Math.round(taux * 10) / 10;

      result[nom] = tauxRounded;
      details[nom] = { total, sav, taux: tauxRounded };
    }

    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: projects.length,
      },
      breakdown: { details },
    };
  },
};

/**
 * Taux de SAV par type d'apporteur
 * Proportion de dossiers SAV par type d'apporteur (Assureurs, Bailleurs, etc.)
 */
export const tauxSavParTypeApporteur: StatDefinition = {
  id: 'taux_sav_par_type_apporteur',
  label: "Taux de SAV par type d'apporteur",
  description: "Proportion de dossiers SAV par type d'apporteur/commanditaire",
  category: 'sav',
  source: ['projects', 'clients'],
  unit: '%',
  dimensions: ['type_apporteur'],
  aggregation: 'ratio',

  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, clients } = data;

    const apporteursInfoById = mapApporteurInfos(clients);

    const totalByType: Record<string, number> = {};
    const savByType: Record<string, number> = {};

    for (const project of projects) {
      const date = getProjectDate(project);
      if (!date) continue;

      if (params.dateRange && (date < params.dateRange.start || date > params.dateRange.end)) {
        continue;
      }

      const cmdIdRaw = project.data?.commanditaireId || project.commanditaireId;

      let typeApporteur: string;

      if (!cmdIdRaw) {
        typeApporteur = 'Clients Directs';
      } else {
        const info = apporteursInfoById.get(String(cmdIdRaw));
        typeApporteur = info?.type || 'Clients Directs';
      }

      const isSav = isSavProject(project);

      totalByType[typeApporteur] = (totalByType[typeApporteur] || 0) + 1;
      if (isSav) {
        savByType[typeApporteur] = (savByType[typeApporteur] || 0) + 1;
      }
    }

    const result: Record<string, number> = {};
    const details: Record<string, { total: number; sav: number; taux: number }> = {};

    for (const type of Object.keys(totalByType)) {
      const total = totalByType[type] || 0;
      const sav = savByType[type] || 0;
      const taux = total > 0 ? (sav / total) * 100 : 0;
      const tauxRounded = Math.round(taux * 10) / 10;

      result[type] = tauxRounded;
      details[type] = { total, sav, taux: tauxRounded };
    }

    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: projects.length,
      },
      breakdown: { details },
    };
  },
};

/**
 * Nombre de SAV sur la période
 * Compte les dossiers SAV (projets enfants/liés)
 */
export const nbSavGlobal: StatDefinition = {
  id: 'nb_sav_global',
  label: 'Nombre de SAV',
  description: 'Nombre de dossiers SAV sur la période',
  category: 'sav',
  source: ['projects'],
  unit: '',
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    // Debug SAV detection
    debugSavDetection(projects);
    
    let nbSav = 0;
    
    for (const project of projects) {
      const date = getProjectDate(project);
      if (!date) continue;
      
      if (params.dateRange && (date < params.dateRange.start || date > params.dateRange.end)) {
        continue;
      }
      
      if (isSavProject(project)) {
        nbSav++;
      }
    }
    
    return {
      value: nbSav,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: nbSav,
      }
    };
  }
};

/**
 * Nombre d'interventions SAV
 */
export const nbInterventionsSav: StatDefinition = {
  id: 'nb_interventions_sav',
  label: 'Nb interventions SAV',
  description: 'Nombre total d\'interventions SAV sur la période',
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
          if (!isWithinInterval(interventionDate, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      if (isSAVIntervention(intervention)) {
        count++;
      }
    }
    
    return {
      value: count,
      metadata: {
        computedAt: new Date(),
        source: 'interventions',
        recordCount: count,
      }
    };
  }
};

/**
 * CA impacté par SAV (estimation)
 * CA des dossiers ayant eu un SAV (potentiel impacté)
 */
export const caImpacteSav: StatDefinition = {
  id: 'ca_impacte_sav',
  label: 'CA impacté par SAV',
  description: 'Chiffre d\'affaires des dossiers ayant généré un SAV',
  category: 'sav',
  source: ['factures', 'projects', 'interventions'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, interventions } = data;
    
    const projectsMap = new Map(projects.map(p => [p.id, p]));
    
    // Identifier les projets avec SAV
    const projetsSAV = new Set<number | string>();
    for (const project of projects) {
      if (projectHasSAV(project, interventions)) {
        projetsSAV.add(project.id);
      }
    }
    
    let caImpacte = 0;
    let nbFactures = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      if (!meta.date) continue;
      if (!isWithinInterval(meta.date, { start: params.dateRange.start, end: params.dateRange.end })) {
        continue;
      }
      
      if (projetsSAV.has(facture.projectId)) {
        caImpacte += meta.montantNetHT;
        nbFactures++;
      }
    }
    
    return {
      value: Math.round(caImpacte * 100) / 100,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: nbFactures,
      },
      breakdown: {
        nbProjetsSAV: projetsSAV.size,
        nbFactures,
      }
    };
  }
};

/**
 * Coût SAV estimé (20% du CA des dossiers parents)
 * Pour chaque SAV, on prend 20% du CA facturé du dossier parent
 * Règle métier: le SAV représente un coût de reprise estimé à 20% de la facture initiale
 */
export const coutSavEstime: StatDefinition = {
  id: 'cout_sav_estime',
  label: 'Coût SAV estimé (20%)',
  description: 'Estimation du coût SAV = 20% du CA des dossiers ayant généré un SAV',
  category: 'sav',
  source: ['factures', 'projects', 'interventions'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, interventions } = data;
    
    // Index des projets par ID (multi-type pour robustesse)
    const projectsById = new Map<string, any>();
    for (const p of projects) {
      projectsById.set(String(p.id), p);
      if (typeof p.id === 'number') projectsById.set(String(p.id), p);
    }
    
    // Index des factures par projectId
    const facturesByProjectId = new Map<string, number>();
    for (const f of factures) {
      const meta = extractFactureMeta(f);
      if (!meta.date) continue;
      
      const pid = String(f.projectId || f.project_id || f.data?.projectId || '');
      if (!pid) continue;
      
      const current = facturesByProjectId.get(pid) || 0;
      facturesByProjectId.set(pid, current + meta.montantNetHT);
    }
    
    // Identifier les projets SAV et leur parent
    let coutTotalSAV = 0;
    let nbDossiersSAV = 0;
    let nbDossiersAvecParent = 0;
    
    for (const project of projects) {
      // Ce projet est-il un SAV ?
      if (!isSavProject(project)) continue;
      
      // Filtre période sur date du projet SAV
      const dateSAV = getProjectDate(project);
      if (!dateSAV) continue;
      if (params.dateRange && (dateSAV < params.dateRange.start || dateSAV > params.dateRange.end)) {
        continue;
      }
      
      nbDossiersSAV++;
      
      // Trouver le parent du SAV
      const parentIdRaw = 
        project.parentProjectId || 
        project.parent_project_id || 
        project.parentId || 
        project.parent_id ||
        project.data?.parentId ||
        project.data?.parent_id ||
        project.data?.parentProjectId ||
        project.data?.linkedProjectId ||
        project.data?.dossierId;
      
      if (!parentIdRaw) continue;
      
      const parentId = String(parentIdRaw);
      
      // CA facturé du dossier parent
      const caParent = facturesByProjectId.get(parentId) || 0;
      if (caParent <= 0) continue;
      
      nbDossiersAvecParent++;
      
      // 20% du CA parent = coût SAV estimé
      const coutSAV = caParent * 0.20;
      coutTotalSAV += coutSAV;
    }
    
    return {
      value: Math.round(coutTotalSAV * 100) / 100,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: nbDossiersAvecParent,
      },
      breakdown: {
        nbDossiersSAV,
        nbDossiersAvecParent,
        pourcentageApplique: 20,
      }
    };
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
