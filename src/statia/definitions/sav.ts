/**
 * StatIA V1 - Définitions des métriques SAV
 * Réutilise les formules existantes de savCalculations
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { 
  normalizeUniversSlug,
  extractProjectUniverses
} from '../engine/normalizers';
import { indexProjectsById } from '../engine/loaders';

/**
 * Détecte si un projet est un SAV (dossier enfant/lié)
 */
function isSAVProject(project: any): boolean {
  // Un SAV est identifié par un dossier lié/enfant du dossier parent
  return !!(
    project.parentProjectId || 
    project.parent_project_id ||
    project.data?.parentId ||
    project.data?.isSAV ||
    (project.type && project.type.toLowerCase().includes('sav'))
  );
}

/**
 * Taux SAV Global
 * Conforme aux règles STATIA: SAV = impact CA 0€, excludeFromTechStats
 */
export const tauxSavGlobal: StatDefinition = {
  id: 'taux_sav_global',
  label: 'Taux SAV Global',
  description: 'Pourcentage de dossiers ayant généré un SAV',
  category: 'sav',
  source: 'projects',
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    let totalProjects = 0;
    let savProjects = 0;
    const savProjectIds: string[] = [];
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      totalProjects++;
      
      if (isSAVProject(project)) {
        savProjects++;
        savProjectIds.push(project.id);
      }
    }
    
    const taux = totalProjects > 0 ? (savProjects / totalProjects) * 100 : 0;
    
    return {
      value: taux,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: totalProjects,
      },
      breakdown: {
        totalProjects,
        savProjects,
        savProjectIds,
      }
    };
  }
};

/**
 * Taux SAV par Univers
 */
export const tauxSavParUnivers: StatDefinition = {
  id: 'taux_sav_par_univers',
  label: 'Taux SAV par Univers',
  description: 'Pourcentage de SAV ventilé par univers métier',
  category: 'sav',
  source: 'projects',
  dimensions: ['univers'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    const totalByUnivers: Record<string, number> = {};
    const savByUnivers: Record<string, number> = {};
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const universes = extractProjectUniverses(project);
      const isSav = isSAVProject(project);
      
      for (const univers of universes) {
        totalByUnivers[univers] = (totalByUnivers[univers] || 0) + 1;
        if (isSav) {
          savByUnivers[univers] = (savByUnivers[univers] || 0) + 1;
        }
      }
    }
    
    // Calculer les taux
    const tauxByUnivers: Record<string, number> = {};
    for (const univers of Object.keys(totalByUnivers)) {
      const total = totalByUnivers[univers];
      const sav = savByUnivers[univers] || 0;
      tauxByUnivers[univers] = total > 0 ? (sav / total) * 100 : 0;
    }
    
    return {
      value: tauxByUnivers,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: Object.values(totalByUnivers).reduce((a, b) => a + b, 0),
      },
      breakdown: {
        totalByUnivers,
        savByUnivers,
      }
    };
  }
};

/**
 * Nombre de SAV
 */
export const nombreSav: StatDefinition = {
  id: 'nombre_sav',
  label: 'Nombre de SAV',
  description: 'Nombre total de dossiers SAV',
  category: 'sav',
  source: 'projects',
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    let savCount = 0;
    
    for (const project of projects) {
      const dateStr = project.date || project.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      if (isSAVProject(project)) {
        savCount++;
      }
    }
    
    return {
      value: savCount,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: savCount,
      }
    };
  }
};

export const savDefinitions = {
  taux_sav_global: tauxSavGlobal,
  taux_sav_par_univers: tauxSavParUnivers,
  nombre_sav: nombreSav,
};
