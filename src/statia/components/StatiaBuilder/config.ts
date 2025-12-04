/**
 * StatIA Builder - Types et configurations
 */

export type DimensionType = 'technicien' | 'apporteur' | 'univers' | 'mois' | 'agence';
export type MeasureType = 'ca' | 'ca_par_heure' | 'taux_sav' | 'nb_dossiers' | 'duree' | 'nb_interventions';
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
  filters: Record<string, any>;
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

// Configuration des mesures disponibles (groupées par catégorie)
export const MEASURES: MeasureConfig[] = [
  // CA
  {
    id: 'ca_global_ht',
    label: 'CA Global HT',
    icon: 'Euro',
    color: 'bg-emerald-500',
    unit: '€',
    description: 'Chiffre d\'affaires total',
    category: 'CA',
  },
  {
    id: 'panier_moyen',
    label: 'Panier Moyen',
    icon: 'ShoppingCart',
    color: 'bg-emerald-400',
    unit: '€',
    description: 'Montant moyen par facture',
    category: 'CA',
  },
  {
    id: 'du_client',
    label: 'Dû Client',
    icon: 'Clock',
    color: 'bg-red-500',
    unit: '€',
    description: 'Reste à encaisser',
    category: 'CA',
  },
  // Productivité
  {
    id: 'ca_par_heure_global',
    label: 'CA/heure',
    icon: 'TrendingUp',
    color: 'bg-blue-500',
    unit: '€/h',
    description: 'Productivité horaire',
    category: 'Productivité',
  },
  {
    id: 'nb_heures_productives',
    label: 'Heures productives',
    icon: 'Timer',
    color: 'bg-blue-400',
    unit: 'h',
    description: 'Heures facturables',
    category: 'Productivité',
  },
  {
    id: 'taux_utilisation_techniciens',
    label: 'Taux utilisation',
    icon: 'Activity',
    color: 'bg-blue-300',
    unit: '%',
    description: 'Productif vs théorique',
    category: 'Productivité',
  },
  // Qualité
  {
    id: 'taux_sav_global',
    label: 'Taux SAV',
    icon: 'AlertTriangle',
    color: 'bg-amber-500',
    unit: '%',
    description: 'Dossiers avec SAV',
    category: 'Qualité',
  },
  {
    id: 'nb_interventions_sav',
    label: 'Nb SAV',
    icon: 'Wrench',
    color: 'bg-amber-400',
    unit: '',
    description: 'Interventions SAV',
    category: 'Qualité',
  },
  // Dossiers
  {
    id: 'nb_dossiers_crees',
    label: 'Dossiers créés',
    icon: 'FolderPlus',
    color: 'bg-violet-500',
    unit: '',
    description: 'Nouveaux dossiers',
    category: 'Dossiers',
  },
  {
    id: 'duree_moyenne_dossier',
    label: 'Durée moyenne',
    icon: 'Hourglass',
    color: 'bg-violet-400',
    unit: 'jours',
    description: 'Création → facturation',
    category: 'Dossiers',
  },
  {
    id: 'taux_multi_visites',
    label: 'Multi-visites',
    icon: 'Users',
    color: 'bg-violet-300',
    unit: '%',
    description: 'Dossiers >1 visite',
    category: 'Dossiers',
  },
  // Devis
  {
    id: 'taux_transformation_devis',
    label: 'Taux transfo',
    icon: 'FileCheck',
    color: 'bg-cyan-500',
    unit: '%',
    description: 'Devis → Facture',
    category: 'Devis',
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

// Grouper les mesures par catégorie
export function getMeasuresByCategory(): Record<string, MeasureConfig[]> {
  const grouped: Record<string, MeasureConfig[]> = {};
  
  for (const measure of MEASURES) {
    if (!grouped[measure.category]) {
      grouped[measure.category] = [];
    }
    grouped[measure.category].push(measure);
  }
  
  return grouped;
}
