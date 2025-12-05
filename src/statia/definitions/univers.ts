/**
 * StatIA V1 - Définitions des métriques par Univers
 * UTILISE LE MOTEUR technicienUniversEngine pour garantir la cohérence
 * avec ca_par_technicien_univers
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { 
  normalizeUniversSlug, 
  isFactureStateIncluded,
  normalizeApporteurId
} from '../engine/normalizers';
import { extractFactureMeta } from '../rules/rules';
import { indexProjectsById } from '../engine/loaders';
import { computeTechUniversStatsForAgency } from '@/shared/utils/technicienUniversEngine';

// Univers à exclure (identique au moteur technicien)
const EXCLUDED_UNIVERSES = new Set([
  'mobilier',
  'travaux_xterieurs',
  'travaux_exterieurs',
]);

/**
 * CA par Univers
 * RÉÉCRIT pour utiliser le même moteur que ca_par_technicien_univers
 * Agrège les stats technicien×univers en ignorant la dimension technicien
 */
export const caParUnivers: StatDefinition = {
  id: 'ca_par_univers',
  label: 'CA par Univers',
  description: 'Chiffre d\'affaires HT ventilé par univers métier',
  category: 'univers',
  source: ['factures', 'projects', 'interventions', 'users'],
  dimensions: ['univers'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, interventions, users } = data;
    
    // Utiliser le moteur technicien×univers comme source de vérité
    const techUniversStats = computeTechUniversStatsForAgency(
      factures,
      projects,
      interventions,
      users,
      params.dateRange
    );
    
    // Agréger le CA par univers en ignorant la dimension technicien
    const byUnivers: Record<string, number> = {};
    let totalCA = 0;
    
    for (const techStat of techUniversStats) {
      for (const [universKey, universData] of Object.entries(techStat.universes)) {
        byUnivers[universKey] = (byUnivers[universKey] || 0) + universData.caHT;
        totalCA += universData.caHT;
      }
    }
    
    // Arrondir les valeurs
    for (const key of Object.keys(byUnivers)) {
      byUnivers[key] = Math.round(byUnivers[key] * 100) / 100;
    }
    
    return {
      value: byUnivers,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: factures.length,
      },
      breakdown: {
        total: Math.round(totalCA * 100) / 100,
        universCount: Object.keys(byUnivers).length,
        technicienCount: techUniversStats.length,
      }
    };
  }
};

/**
 * Helper: Extrait les univers d'un projet avec la même logique que technicienUniversEngine
 */
function extractUniversesFromProject(project: any): string[] {
  const universesRaw: string[] = 
    project?.data?.universes || 
    project?.data?.univers || 
    project?.universes || 
    project?.univers || 
    [];
  
  // Normaliser et filtrer les univers exclus
  const universes = universesRaw
    .map((u: string) => normalizeUniversSlug(u))
    .filter((u: string) => !EXCLUDED_UNIVERSES.has(u));
  
  return universes.length > 0 ? universes : [];
}

/**
 * Nombre de dossiers par Univers
 * Utilise la même normalisation que le moteur technicien
 */
export const dossiersParUnivers: StatDefinition = {
  id: 'dossiers_par_univers',
  label: 'Dossiers par Univers',
  description: 'Nombre de dossiers/projets par univers métier',
  category: 'univers',
  source: 'projects',
  dimensions: ['univers'],
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects } = data;
    
    const byUnivers: Record<string, number> = {};
    let totalCount = 0;
    
    for (const project of projects) {
      // Filtrer par date de création du projet
      const dateStr = project.date || project.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (date < params.dateRange.start || date > params.dateRange.end) continue;
      }
      
      const universes = extractUniversesFromProject(project);
      
      // Si aucun univers valide, ignorer (même logique que technicienUniversEngine)
      if (universes.length === 0) continue;
      
      // Compter 1 dossier par univers (pas de prorata pour le count)
      for (const univers of universes) {
        byUnivers[univers] = (byUnivers[univers] || 0) + 1;
      }
      
      totalCount++;
    }
    
    return {
      value: byUnivers,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: totalCount,
      },
      breakdown: {
        total: totalCount,
      }
    };
  }
};

/**
 * Panier Moyen par Univers
 * Agrège depuis le moteur technicien×univers puis calcule les moyennes
 */
export const panierMoyenParUnivers: StatDefinition = {
  id: 'panier_moyen_par_univers',
  label: 'Panier Moyen par Univers',
  description: 'Montant moyen par dossier ventilé par univers',
  category: 'univers',
  source: ['factures', 'projects', 'interventions', 'users'],
  dimensions: ['univers'],
  aggregation: 'avg',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, projects, interventions, users } = data;
    
    // Utiliser le moteur technicien×univers comme source de vérité
    const techUniversStats = computeTechUniversStatsForAgency(
      factures,
      projects,
      interventions,
      users,
      params.dateRange
    );
    
    // Agréger CA et nbDossiers par univers
    const caByUnivers: Record<string, number> = {};
    const dossiersParUnivers: Record<string, Set<string>> = {};
    
    for (const techStat of techUniversStats) {
      for (const [universKey, universData] of Object.entries(techStat.universes)) {
        caByUnivers[universKey] = (caByUnivers[universKey] || 0) + universData.caHT;
        
        // Compter les dossiers uniques (nbDossiers dans techUniversStats est déjà par technicien)
        // On ne peut pas juste additionner car le même dossier peut être compté plusieurs fois
        // On utilise plutôt le nombre de dossiers directement
        if (!dossiersParUnivers[universKey]) {
          dossiersParUnivers[universKey] = new Set();
        }
      }
    }
    
    // Pour le panier moyen, on utilise nbDossiers depuis le techUniversStats
    // Mais comme c'est comptabilisé par technicien, on doit agréger différemment
    // Utilisons le CA total / nombre d'univers comme approximation
    // Ou mieux: agréger les nbDossiers max par univers
    const nbDossiersParUnivers: Record<string, number> = {};
    for (const techStat of techUniversStats) {
      for (const [universKey, universData] of Object.entries(techStat.universes)) {
        // Prendre le max des nbDossiers car ils peuvent se chevaucher entre techniciens
        nbDossiersParUnivers[universKey] = Math.max(
          nbDossiersParUnivers[universKey] || 0,
          universData.nbDossiers
        );
      }
    }
    
    // Calculer les moyennes
    const avgByUnivers: Record<string, number> = {};
    for (const univers of Object.keys(caByUnivers)) {
      const nb = nbDossiersParUnivers[univers] || 1;
      avgByUnivers[univers] = Math.round((caByUnivers[univers] / nb) * 100) / 100;
    }
    
    return {
      value: avgByUnivers,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: factures.length,
      },
      breakdown: {
        caByUnivers,
        nbDossiersParUnivers,
      }
    };
  }
};

export const universDefinitions = {
  ca_par_univers: caParUnivers,
  dossiers_par_univers: dossiersParUnivers,
  panier_moyen_par_univers: panierMoyenParUnivers,
};
