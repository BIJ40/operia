/**
 * StatIA NL Routing - Dictionnaires
 * Source de vérité pour tous les mappings NL
 */

import { RoutingRule, DimensionType, IntentType } from './types';

// ============= STATS KEYWORDS =============
export const STATS_KEYWORDS = [
  'combien', 'ca', 'chiffre', "chiffre d'affaires", 
  'dossiers', 'en moyenne', 'moyenne', 'top', 'le plus', 
  'panier moyen', 'taux', 'nombre', 'nb', 
  'meilleur', 'meilleurs', 'premier', 'premiers',
  'technicien', 'apporteur', 'univers',
  'sav', 'transformation', 'devis',
  'stat', 'statistique', 'kpi', 'indicateur',
  'délai', 'delai', 'temps moyen', 'rapporte',
  // Recouvrement - mots clés spécifiques
  'recouvrement', 'recouv', 'encours', 'encaissé', 'encaisse',
  'impayé', 'impayés', 'impaye', 'impayes', 'reste à encaisser',
  'dû client', 'du client', 'créance', 'creance', 'créances', 'creances',
];

// ============= UNIVERS ALIASES =============
export const UNIVERS_ALIASES: Record<string, string> = {
  // Électricité
  'électricité': 'ELECTRICITE', 'electricite': 'ELECTRICITE', 'elec': 'ELECTRICITE',
  'électrique': 'ELECTRICITE', 'electrique': 'ELECTRICITE', 'électricien': 'ELECTRICITE',
  
  // Plomberie
  'plomberie': 'PLOMBERIE', 'plombier': 'PLOMBERIE', 'fuite': 'PLOMBERIE',
  'recherche de fuite': 'PLOMBERIE',
  
  // Serrurerie
  'serrurerie': 'SERRURERIE', 'serrurier': 'SERRURERIE', 'serrure': 'SERRURERIE',
  
  // Vitrerie
  'vitrerie': 'VITRERIE', 'vitrier': 'VITRERIE', 'vitre': 'VITRERIE', 'vitres': 'VITRERIE',
  
  // Volet
  'volet': 'VOLET', 'volets': 'VOLET', 'volet roulant': 'VOLET', 'store': 'VOLET',
  
  // Menuiserie
  'menuiserie': 'MENUISERIE', 'menuisier': 'MENUISERIE',
  
  // Peinture
  'peinture': 'PEINTURE', 'peintre': 'PEINTURE',
  
  // Carrelage
  'carrelage': 'CARRELAGE', 'carreleur': 'CARRELAGE',
  
  // Maçonnerie
  'maçonnerie': 'MACONNERIE', 'maconnerie': 'MACONNERIE', 'maçon': 'MACONNERIE',
  
  // Dépannage
  'dépannage': 'DEPANNAGE', 'depannage': 'DEPANNAGE',
};

// ============= MOIS MAPPING =============
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

// ============= DIMENSION KEYWORDS =============
export const DIMENSION_KEYWORDS: Record<DimensionType, string[]> = {
  technicien: ['technicien', 'tech', 'ouvrier', 'intervenant', 'intervenants'],
  apporteur: ['apporteur', 'apporteurs', 'commanditaire', 'prescripteur', 'prescripteurs', 
              'partenaire', 'partenaires', 'assureur', 'assureurs', 'mutuelle', 'mutuelles'],
  univers: ['univers', 'métier', 'metier', 'domaine'],
  agence: ['agence', 'agences'],
  site: ['site', 'sites', 'pau', 'saint-omer', 'bordeaux', 'lyon'],
  client_type: ['client pro', 'professionnel', 'particulier', 'particuliers', 'assurance'],
  global: [],
};

// ============= INTENT KEYWORDS =============
export const INTENT_KEYWORDS: Record<IntentType, string[]> = {
  top: ['top', 'meilleur', 'meilleurs', 'premier', 'premiers', 'le plus', 'les plus', 'qui a fait'],
  moyenne: ['en moyenne', 'moyenne', 'moyen', 'rapporte', 'panier moyen'],
  volume: ['combien', 'nombre de', 'nb de', 'volume', 'quantité'],
  taux: ['taux', 'pourcentage', '%', 'ratio'],
  delay: ['délai', 'delai', 'temps moyen', 'en combien de temps', 'durée'],
  compare: ['par rapport à', 'par rapport a', 'vs', 'comparé à', 'compare a', 
            'en hausse', 'en baisse', 'évolution', 'progression'],
  valeur: ['total', 'global', 'fait', 'montant'],
};

// ============= ROUTING RULES =============
export const NL_ROUTING_RULES: RoutingRule[] = [
  // === CLASSEMENTS (TOP) ===
  { dimension: 'apporteur', intentType: 'top', metricId: 'ca_par_apporteur', 
    label: 'Top apporteurs par CA', isRanking: true, minRole: 2, defaultTopN: 5 },
  { dimension: 'technicien', intentType: 'top', metricId: 'ca_par_technicien', 
    label: 'Top techniciens par CA', isRanking: true, minRole: 2, defaultTopN: 5 },
  { dimension: 'univers', intentType: 'top', metricId: 'ca_par_univers', 
    label: 'Top univers par CA', isRanking: true, minRole: 0, defaultTopN: 5 },
  { dimension: 'agence', intentType: 'top', metricId: 'ca_par_agence', 
    label: 'Top agences par CA', isRanking: true, minRole: 3, defaultTopN: 5 },
    
  // === VOLUMES ===
  { dimension: 'univers', intentType: 'volume', metricId: 'nb_dossiers_par_univers', 
    label: 'Dossiers par univers', isRanking: true, minRole: 0 },
  { dimension: 'apporteur', intentType: 'volume', metricId: 'dossiers_par_apporteur', 
    label: 'Dossiers par apporteur', isRanking: true, minRole: 2 },
  { dimension: 'global', intentType: 'volume', metricId: 'nb_dossiers_crees', 
    label: 'Nombre de dossiers', isRanking: false, minRole: 0 },
    
  // === MOYENNES / PANIERS ===
  { dimension: 'technicien', intentType: 'moyenne', metricId: 'ca_moyen_par_tech', 
    label: 'CA moyen par technicien', isRanking: false, minRole: 2 },
  { dimension: 'univers', intentType: 'moyenne', metricId: 'panier_moyen_par_univers', 
    label: 'Panier moyen par univers', isRanking: false, minRole: 0 },
  { dimension: 'apporteur', intentType: 'moyenne', metricId: 'panier_moyen_par_apporteur', 
    label: 'Panier moyen par apporteur', isRanking: false, minRole: 2 },
  { dimension: 'global', intentType: 'moyenne', metricId: 'panier_moyen', 
    label: 'Panier moyen global', isRanking: false, minRole: 0 },
    
  // === TAUX ===
  { dimension: 'global', intentType: 'taux', metricId: 'taux_sav_global', 
    label: 'Taux de SAV', isRanking: false, minRole: 0 },
  { dimension: 'agence', intentType: 'taux', metricId: 'taux_transformation_devis', 
    label: 'Taux de transformation devis', isRanking: false, minRole: 0 },
  { dimension: 'univers', intentType: 'taux', metricId: 'taux_multi_visites', 
    label: 'Taux de multi-visites', isRanking: false, minRole: 0 },
    
  // === DÉLAIS ===
  { dimension: 'global', intentType: 'delay', metricId: 'delai_moyen_devis_facture', 
    label: 'Délai moyen devis → facture', isRanking: false, minRole: 0 },
  { dimension: 'agence', intentType: 'delay', metricId: 'delai_moyen_dossier_premier_rdv', 
    label: 'Délai moyen dossier → 1er RDV', isRanking: false, minRole: 0 },
  { dimension: 'global', intentType: 'delay', metricId: 'delai_premier_devis', 
    label: 'Délai 1er devis', isRanking: false, minRole: 0 },
    
  // === VALEURS (CA) ===
  { dimension: 'apporteur', intentType: 'valeur', metricId: 'ca_par_apporteur', 
    label: 'CA par apporteur', isRanking: true, minRole: 2 },
  { dimension: 'technicien', intentType: 'valeur', metricId: 'ca_par_technicien', 
    label: 'CA par technicien', isRanking: true, minRole: 2 },
  { dimension: 'univers', intentType: 'valeur', metricId: 'ca_par_univers', 
    label: 'CA par univers', isRanking: true, minRole: 0 },
  { dimension: 'global', intentType: 'valeur', metricId: 'ca_global_ht', 
    label: 'CA global HT', isRanking: false, minRole: 0 },
  { dimension: 'global', intentType: 'top', metricId: 'ca_global_ht', 
    label: 'CA global HT', isRanking: false, minRole: 0 },
];

// ============= SPECIALIZED METRICS (direct keyword detection) =============
export const SPECIALIZED_METRICS: Array<{ keywords: string[]; rule: RoutingRule }> = [
  // SAV
  {
    keywords: ['sav', 'service après vente', 'garantie', 'retour chantier'],
    rule: { dimension: 'global', intentType: 'taux', metricId: 'taux_sav_global', 
            label: 'Taux de SAV', isRanking: false, minRole: 0 },
  },
  {
    keywords: ['sav par univers', 'sav univers'],
    rule: { dimension: 'univers', intentType: 'taux', metricId: 'sav_par_univers', 
            label: 'SAV par univers', isRanking: true, minRole: 0 },
  },
  {
    keywords: ['sav par apporteur', 'sav apporteur'],
    rule: { dimension: 'apporteur', intentType: 'taux', metricId: 'sav_par_apporteur', 
            label: 'SAV par apporteur', isRanking: true, minRole: 2 },
  },
  // Devis
  {
    keywords: ['transformation', 'taux devis', 'devis transformé', 'conversion'],
    rule: { dimension: 'global', intentType: 'taux', metricId: 'taux_transformation_devis', 
            label: 'Taux de transformation devis', isRanking: false, minRole: 0 },
  },
  // Paniers / Moyennes
  {
    keywords: ['panier moyen', 'panier'],
    rule: { dimension: 'global', intentType: 'moyenne', metricId: 'panier_moyen', 
            label: 'Panier moyen', isRanking: false, minRole: 0 },
  },
  {
    keywords: ['ca par jour', 'ca moyen jour', 'chiffre par jour', 'par jour'],
    rule: { dimension: 'global', intentType: 'moyenne', metricId: 'ca_moyen_par_jour', 
            label: 'CA moyen par jour', isRanking: false, minRole: 0 },
  },
  // Délais
  {
    keywords: ['délai premier devis', 'delai premier devis', 'temps premier devis', '1er devis'],
    rule: { dimension: 'global', intentType: 'delay', metricId: 'delai_premier_devis', 
            label: 'Délai 1er devis', isRanking: false, minRole: 0 },
  },
  {
    keywords: ['délai facture', 'delai facture', 'temps facture', 'délai moyen facture'],
    rule: { dimension: 'global', intentType: 'delay', metricId: 'delai_moyen_facture', 
            label: 'Délai moyen facture', isRanking: false, minRole: 0 },
  },
  // Recouvrement
  {
    keywords: ['recouvrement', 'encaissement', 'encaissé', 'taux encaissement'],
    rule: { dimension: 'global', intentType: 'taux', metricId: 'taux_recouvrement', 
            label: 'Taux de recouvrement', isRanking: false, minRole: 2 },
  },
  {
    keywords: ['reste à encaisser', 'reste encaisser', 'impayé', 'impayés', 'en cours encaissement'],
    rule: { dimension: 'global', intentType: 'valeur', metricId: 'reste_a_encaisser', 
            label: 'Reste à encaisser', isRanking: false, minRole: 2 },
  },
  // Volumes
  {
    keywords: ['nb dossiers', 'nombre dossiers', 'combien dossiers', 'dossiers créés'],
    rule: { dimension: 'global', intentType: 'volume', metricId: 'nb_dossiers_crees', 
            label: 'Nombre de dossiers', isRanking: false, minRole: 0 },
  },
  // CA mensuel
  {
    keywords: ['ca mensuel', 'ca par mois', 'evolution ca', 'évolution ca'],
    rule: { dimension: 'global', intentType: 'valeur', metricId: 'ca_mensuel', 
            label: 'CA mensuel', isRanking: true, minRole: 0 },
  },
  // Top techniciens
  {
    keywords: ['top technicien', 'meilleur technicien', 'meilleurs techniciens'],
    rule: { dimension: 'technicien', intentType: 'top', metricId: 'top_techniciens_ca', 
            label: 'Top techniciens CA', isRanking: true, minRole: 2, defaultTopN: 5 },
  },
];

// ============= TYPO CORRECTIONS =============
export const TYPO_CORRECTIONS: Record<string, string> = {
  'cett': 'cette',
  'mieuilleur': 'meilleur',
  'meilluer': 'meilleur',
  'mejlleur': 'meilleur',
  'anné': 'année',
  'techncien': 'technicien',
  'aporrteur': 'apporteur',
  'appoteur': 'apporteur',
  'univers ': 'univers',
  'plombberie': 'plomberie',
  'electrcite': 'électricité',
};

// ============= ROLE LEVELS =============
export const ROLE_LEVELS: Record<string, number> = {
  'superadmin': 6,
  'platform_admin': 5,
  'franchisor_admin': 4,
  'franchisor_user': 3,
  'franchisee_admin': 2,
  'franchisee_user': 1,
  'base_user': 0,
};
