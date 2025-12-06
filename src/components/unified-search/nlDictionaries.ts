/**
 * Dictionnaires NL pour l'interprétation des requêtes statistiques
 * Source de vérité pour la normalisation des entités
 */

// ============= UNIVERS =============
export const UNIVERS_ALIASES: Record<string, string> = {
  // Électricité
  'électricité': 'ELECTRICITE',
  'electricite': 'ELECTRICITE',
  'elec': 'ELECTRICITE',
  'électrique': 'ELECTRICITE',
  'electrique': 'ELECTRICITE',
  'électricien': 'ELECTRICITE',
  'electricien': 'ELECTRICITE',
  
  // Plomberie
  'plomberie': 'PLOMBERIE',
  'plomber': 'PLOMBERIE',
  'plombier': 'PLOMBERIE',
  'fuite': 'PLOMBERIE',
  'recherche de fuite': 'PLOMBERIE',
  
  // Serrurerie
  'serrurerie': 'SERRURERIE',
  'serrurier': 'SERRURERIE',
  'serrure': 'SERRURERIE',
  
  // Vitrerie
  'vitrerie': 'VITRERIE',
  'vitrier': 'VITRERIE',
  'vitre': 'VITRERIE',
  'vitres': 'VITRERIE',
  
  // Volet
  'volet': 'VOLET',
  'volets': 'VOLET',
  'volet roulant': 'VOLET',
  'volets roulants': 'VOLET',
  'store': 'VOLET',
  'stores': 'VOLET',
  
  // Menuiserie
  'menuiserie': 'MENUISERIE',
  'menuisier': 'MENUISERIE',
  
  // Peinture
  'peinture': 'PEINTURE',
  'peintre': 'PEINTURE',
  
  // Carrelage
  'carrelage': 'CARRELAGE',
  'carreleur': 'CARRELAGE',
  
  // Maçonnerie
  'maçonnerie': 'MACONNERIE',
  'maconnerie': 'MACONNERIE',
  'maçon': 'MACONNERIE',
  'macon': 'MACONNERIE',
  
  // Dépannage (générique)
  'dépannage': 'DEPANNAGE',
  'depannage': 'DEPANNAGE',
};

// Labels d'affichage pour les univers
export const UNIVERS_LABELS: Record<string, string> = {
  'ELECTRICITE': 'Électricité',
  'PLOMBERIE': 'Plomberie',
  'SERRURERIE': 'Serrurerie',
  'VITRERIE': 'Vitrerie',
  'VOLET': 'Volet',
  'MENUISERIE': 'Menuiserie',
  'PEINTURE': 'Peinture',
  'CARRELAGE': 'Carrelage',
  'MACONNERIE': 'Maçonnerie',
  'DEPANNAGE': 'Dépannage',
};

// ============= MOIS =============
export const MOIS_MAPPING: Record<string, number> = {
  'janvier': 0, 'jan': 0, 'janv': 0,
  'février': 1, 'fevrier': 1, 'fev': 1, 'fév': 1,
  'mars': 2, 'mar': 2,
  'avril': 3, 'avr': 3,
  'mai': 4,
  'juin': 5, 'jun': 5,
  'juillet': 6, 'juil': 6, 'jul': 6,
  'août': 7, 'aout': 7, 'aou': 7,
  'septembre': 8, 'sept': 8, 'sep': 8,
  'octobre': 9, 'oct': 9,
  'novembre': 10, 'nov': 10,
  'décembre': 11, 'decembre': 11, 'dec': 11, 'déc': 11,
};

// ============= STATS KEYWORDS =============
export const STATS_KEYWORDS = [
  'combien', 'ca', 'chiffre', "chiffre d'affaires", 
  'dossiers', 'en moyenne', 'moyenne', 'top', 'le plus', 
  'panier moyen', 'taux', 'nombre', 'nb', 
  'meilleur', 'meilleurs', 'premier', 'premiers',
  'technicien', 'apporteur', 'univers',
  'sav', 'transformation', 'devis',
  'stat', 'statistique', 'kpi', 'indicateur',
];

// ============= DIMENSIONS =============
export type DimensionType = 'technicien' | 'apporteur' | 'univers' | 'global';

export const DIMENSION_KEYWORDS: Record<DimensionType, string[]> = {
  technicien: ['technicien', 'tech', 'ouvrier', 'intervenant', 'intervenants'],
  apporteur: ['apporteur', 'apporteurs', 'commanditaire', 'prescripteur', 'prescripteurs'],
  univers: ['univers', 'métier', 'metier', 'domaine'],
  global: [],
};

// ============= INTENT TYPES =============
export type IntentType = 'top' | 'moyenne' | 'volume' | 'taux' | 'valeur';

export const INTENT_KEYWORDS: Record<IntentType, string[]> = {
  top: ['top', 'meilleur', 'meilleurs', 'premier', 'premiers', 'le plus', 'les plus', 'qui a fait'],
  moyenne: ['en moyenne', 'moyenne', 'moyen', 'rapporte'],
  volume: ['combien', 'nombre de', 'nb de', 'volume'],
  taux: ['taux', 'pourcentage', '%'],
  valeur: ['total', 'global', 'fait'],
};

// ============= MÉTRIQUES DISPONIBLES =============
export interface MetricRouting {
  metricId: string;
  label: string;
  isRanking: boolean;
  /** Rôle minimum requis (N0=0, N1=1, N2=2, etc.) */
  minRole: number;
  defaultTopN?: number;
}

/**
 * Matrice de routing: (dimension, intent) → métrique
 */
export const METRIC_ROUTING_MATRIX: Record<string, Record<string, MetricRouting>> = {
  technicien: {
    top: { metricId: 'ca_par_technicien', label: 'Top techniciens par CA', isRanking: true, minRole: 2, defaultTopN: 5 },
    moyenne: { metricId: 'ca_moyen_par_tech', label: 'CA moyen par technicien', isRanking: false, minRole: 2 },
    valeur: { metricId: 'ca_par_technicien', label: 'CA par technicien', isRanking: true, minRole: 2 },
    volume: { metricId: 'interventions_par_technicien', label: 'Interventions par technicien', isRanking: true, minRole: 2 },
  },
  apporteur: {
    top: { metricId: 'ca_par_apporteur', label: 'Top apporteurs par CA', isRanking: true, minRole: 2, defaultTopN: 5 },
    valeur: { metricId: 'ca_par_apporteur', label: 'CA par apporteur', isRanking: true, minRole: 2 },
    volume: { metricId: 'dossiers_par_apporteur', label: 'Dossiers par apporteur', isRanking: true, minRole: 2 },
  },
  univers: {
    top: { metricId: 'ca_par_univers', label: 'Top univers par CA', isRanking: true, minRole: 0 },
    valeur: { metricId: 'ca_par_univers', label: 'CA par univers', isRanking: true, minRole: 0 },
    volume: { metricId: 'nb_dossiers_par_univers', label: 'Dossiers par univers', isRanking: true, minRole: 0 },
  },
  global: {
    top: { metricId: 'ca_global_ht', label: 'CA global HT', isRanking: false, minRole: 0 },
    valeur: { metricId: 'ca_global_ht', label: 'CA global HT', isRanking: false, minRole: 0 },
    volume: { metricId: 'nb_dossiers_crees', label: 'Nombre de dossiers', isRanking: false, minRole: 0 },
    taux: { metricId: 'taux_sav_global', label: 'Taux de SAV', isRanking: false, minRole: 0 },
    moyenne: { metricId: 'ca_moyen_par_tech', label: 'CA moyen par technicien', isRanking: false, minRole: 2 },
  },
};

// Métriques spécialisées (détection directe par mot-clé)
export const SPECIALIZED_METRICS: Array<{
  keywords: string[];
  metric: MetricRouting;
}> = [
  {
    keywords: ['sav', 'service après vente', 'garantie'],
    metric: { metricId: 'taux_sav_global', label: 'Taux de SAV', isRanking: false, minRole: 0 },
  },
  {
    keywords: ['transformation', 'taux devis', 'devis transformé'],
    metric: { metricId: 'taux_transformation_devis', label: 'Taux de transformation devis', isRanking: false, minRole: 0 },
  },
  {
    keywords: ['panier moyen', 'panier'],
    metric: { metricId: 'panier_moyen', label: 'Panier moyen', isRanking: false, minRole: 0 },
  },
];

// ============= CHIPS RAPIDES =============
export const QUICK_PERIOD_CHIPS = [
  { id: 'this_month', label: 'Ce mois-ci' },
  { id: 'this_year', label: 'Cette année' },
  { id: 'last_12_months', label: '12 derniers mois' },
] as const;

export const QUICK_UNIVERS_CHIPS = [
  { id: 'ELECTRICITE', label: 'Électricité' },
  { id: 'PLOMBERIE', label: 'Plomberie' },
  { id: 'SERRURERIE', label: 'Serrurerie' },
  { id: 'VITRERIE', label: 'Vitrerie' },
] as const;

// ============= EXEMPLES DE QUESTIONS =============
export const EXAMPLE_QUERIES = [
  { query: 'Top 3 apporteurs cette année', dimension: 'apporteur', intent: 'top' },
  { query: 'CA moyen d\'un électricien sur 12 mois', dimension: 'technicien', intent: 'moyenne' },
  { query: 'Combien de dossiers en vitrerie ce mois', dimension: 'univers', intent: 'volume' },
  { query: 'Quel est mon taux de SAV', dimension: 'global', intent: 'taux' },
];
