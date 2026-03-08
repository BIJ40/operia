/**
 * StatIA Builder - Configuration dynamique
 * Génère automatiquement les mesures depuis STAT_DEFINITIONS
 */

import { STAT_DEFINITIONS, listStatDefinitions, listCategories } from '../../definitions';
import { StatDefinition } from '../../definitions/types';

export type DimensionType = 'technicien' | 'apporteur' | 'univers' | 'mois' | 'agence';
export type FilterType = 'date_range' | 'univers' | 'apporteur' | 'technicien';

export interface DimensionConfig {
  id: DimensionType;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface MeasureConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  unit: string;
  description: string;
  category: string;
  dimensions: string[];
  source: string | string[];
  aggregation: string;
}

export interface FilterConfig {
  id: FilterType;
  label: string;
  icon: string;
  description: string;
}

export interface BuilderQuery {
  dimension?: DimensionType;
  measures: string[];
  filters: Record<string, unknown>;
  dateRange: {
    start: Date;
    end: Date;
  };
  agencySlug?: string;
}

// Configuration des dimensions disponibles
export const DIMENSIONS: DimensionConfig[] = [
  {
    id: 'technicien',
    label: 'Technicien',
    icon: 'User',
    color: 'bg-blue-500',
    description: 'Ventilation par technicien',
  },
  {
    id: 'apporteur',
    label: 'Apporteur',
    icon: 'Building2',
    color: 'bg-green-500',
    description: 'Ventilation par apporteur',
  },
  {
    id: 'univers',
    label: 'Univers',
    icon: 'Layers',
    color: 'bg-purple-500',
    description: 'Ventilation par univers métier',
  },
  {
    id: 'mois',
    label: 'Mois',
    icon: 'Calendar',
    color: 'bg-orange-500',
    description: 'Évolution mensuelle',
  },
];

// Configuration des filtres disponibles
export const FILTERS: FilterConfig[] = [
  {
    id: 'date_range',
    label: 'Période',
    icon: 'Calendar',
    description: 'Filtrer par date',
  },
  {
    id: 'univers',
    label: 'Univers',
    icon: 'Layers',
    description: 'Filtrer par univers',
  },
  {
    id: 'apporteur',
    label: 'Apporteur',
    icon: 'Building2',
    description: 'Filtrer par apporteur',
  },
  {
    id: 'technicien',
    label: 'Technicien',
    icon: 'User',
    description: 'Filtrer par technicien',
  },
];

// Map des icônes par catégorie
const CATEGORY_ICONS: Record<string, string> = {
  ca: 'Euro',
  devis: 'FileCheck',
  univers: 'Layers',
  apporteur: 'Building2',
  technicien: 'User',
  sav: 'AlertTriangle',
  recouvrement: 'Wallet',
  dossiers: 'FolderOpen',
  qualite: 'Shield',
  productivite: 'TrendingUp',
  custom: 'Sparkles',
};

// Map des couleurs par catégorie
const CATEGORY_COLORS: Record<string, string> = {
  ca: 'bg-emerald-500',
  devis: 'bg-cyan-500',
  univers: 'bg-purple-500',
  apporteur: 'bg-green-500',
  technicien: 'bg-blue-500',
  sav: 'bg-amber-500',
  recouvrement: 'bg-red-500',
  dossiers: 'bg-violet-500',
  qualite: 'bg-yellow-500',
  productivite: 'bg-indigo-500',
  custom: 'bg-pink-500',
};

// Labels des catégories
const CATEGORY_LABELS: Record<string, string> = {
  ca: 'Chiffre d\'Affaires',
  devis: 'Devis',
  univers: 'Univers',
  apporteur: 'Apporteurs',
  technicien: 'Techniciens',
  sav: 'SAV',
  recouvrement: 'Recouvrement',
  dossiers: 'Dossiers',
  qualite: 'Qualité',
  productivite: 'Productivité',
  custom: 'Personnalisé',
};

/**
 * Convertit une StatDefinition en MeasureConfig pour le Builder
 */
function statDefinitionToMeasureConfig(def: StatDefinition): MeasureConfig {
  const category = def.category || 'custom';
  
  return {
    id: def.id,
    label: def.label,
    icon: CATEGORY_ICONS[category] || 'Calculator',
    color: CATEGORY_COLORS[category] || 'bg-gray-500',
    unit: def.unit || (def.aggregation === 'ratio' ? '%' : '€'),
    description: def.description || def.label,
    category: CATEGORY_LABELS[category] || category,
    dimensions: def.dimensions || [],
    source: def.source,
    aggregation: def.aggregation,
  };
}

/**
 * Récupère TOUTES les mesures depuis STAT_DEFINITIONS
 * C'est la source de vérité unique pour le Builder
 */
export function getMeasuresFromRegistry(): MeasureConfig[] {
  const definitions = listStatDefinitions();
  return definitions.map(statDefinitionToMeasureConfig);
}

/**
 * Récupère les mesures groupées par catégorie depuis le registre
 */
export function getMeasuresByCategory(): Record<string, MeasureConfig[]> {
  const measures = getMeasuresFromRegistry();
  const grouped: Record<string, MeasureConfig[]> = {};
  
  for (const measure of measures) {
    if (!grouped[measure.category]) {
      grouped[measure.category] = [];
    }
    grouped[measure.category].push(measure);
  }
  
  return grouped;
}

/**
 * Récupère une mesure par son ID
 */
export function getMeasureById(id: string): MeasureConfig | undefined {
  const def = STAT_DEFINITIONS[id];
  if (!def) return undefined;
  return statDefinitionToMeasureConfig(def);
}

/**
 * Liste toutes les catégories disponibles
 */
export function getAvailableCategories(): string[] {
  return listCategories().map(cat => CATEGORY_LABELS[cat] || cat);
}

/**
 * Vérifie si une métrique supporte une dimension donnée
 */
export function measureSupportsDimension(measureId: string, dimension: DimensionType): boolean {
  const def = STAT_DEFINITIONS[measureId];
  if (!def) return false;
  return def.dimensions?.includes(dimension) || false;
}

// Export legacy pour compatibilité
export const MEASURES = getMeasuresFromRegistry();
